import { Crypto } from '@kiltprotocol/utils'
import {
  DocumentLoader,
  ExpansionMap,
  purposes,
  VerificationResult,
} from 'jsonld-signatures'
import { JsonLdObj } from 'jsonld/jsonld-spec'
import {
  KILT_CREDENTIAL_DIGEST_PROOF_TYPE,
  CredentialDigestProof,
  DEFAULT_VERIFIABLECREDENTIAL_CONTEXT,
} from '../types'

import { verifyCredentialDigestProof } from '../verificationUtils'
import KiltAbstractSuite from './KiltAbstractSuite'
import { KILT_CREDENTIAL_CONTEXT_URL } from './kiltContexts'

export default class KiltDisclosureSuite extends KiltAbstractSuite {
  private existingProof?: CredentialDigestProof

  constructor(options: { existingProof?: CredentialDigestProof } = {}) {
    // vc-js complains when there is no verificationMethod
    super({
      type: KILT_CREDENTIAL_DIGEST_PROOF_TYPE,
      verificationMethod: '<none>',
    })
    const { existingProof } = options
    if (
      existingProof &&
      !(
        existingProof.claimHashes instanceof Array &&
        typeof existingProof.nonces === 'object'
      )
    ) {
      throw new Error(
        "'claimHashes' and 'nonces' are required properties on 'existingProof'"
      )
    }
    this.existingProof = existingProof
  }

  public async createProof(options: {
    document: JsonLdObj
    purpose?: purposes.ProofPurpose
    documentLoader?: DocumentLoader
    expansionMap?: ExpansionMap
  }): Promise<CredentialDigestProof> {
    const { document, purpose } = options
    if (!document || typeof document !== 'object')
      throw new TypeError('document must be a JsonLd object')

    const compactedDoc = await this.compactDoc(document, options)
    // TODO problem: in the sdk, we currently hash the subject Id as '@id' while the vc and security contexts alias it as 'id'
    const { id, ...credentialSubject } = compactedDoc.credentialSubject
    credentialSubject['@id'] = id
    const statements = Object.entries(credentialSubject).map(([key, value]) =>
      JSON.stringify({ [key]: value })
    )
    const { nonces, claimHashes } = Crypto.hashStatements(statements, {
      nonces: this.existingProof?.nonces,
    }).reduce<Pick<CredentialDigestProof, 'nonces' | 'claimHashes'>>(
      (prev, next) => {
        if (!next.nonce) {
          throw new Error(
            `existing proof contained no nonce for statement "${next.statement}" (expected key "${next.digest}")`
          )
        }
        return {
          claimHashes: [...prev.claimHashes, next.saltedHash],
          nonces: { ...prev.nonces, [next.digest]: next.nonce },
        }
      },
      { nonces: {}, claimHashes: [] }
    )
    return {
      '@context': [
        DEFAULT_VERIFIABLECREDENTIAL_CONTEXT,
        KILT_CREDENTIAL_CONTEXT_URL,
      ],
      type: this.type as CredentialDigestProof['type'],
      proofPurpose: purpose?.term,
      nonces,
      claimHashes: this.existingProof
        ? this.existingProof.claimHashes
        : claimHashes,
    }
  }

  public async verifyProof(options: {
    proof: JsonLdObj
    document?: JsonLdObj
    purpose?: purposes.ProofPurpose
    documentLoader?: DocumentLoader
    expansionMap?: ExpansionMap
  }): Promise<VerificationResult> {
    try {
      const { document, proof } = options
      if (!document || typeof document !== 'object')
        throw new TypeError('document must be a JsonLd object')
      if (!proof || typeof proof !== 'object')
        throw new TypeError('proof must be a JsonLd object')
      const compactedDoc = await this.compactDoc(document, options)
      const compactedProof = await this.compactProof<CredentialDigestProof>(
        proof,
        options
      )
      const { verified, errors } = await verifyCredentialDigestProof(
        compactedDoc,
        compactedProof
      )
      if (errors.length > 0)
        return {
          verified,
          error: errors[0],
        }
      return { verified }
    } catch (e) {
      return { verified: false, error: e }
    }
  }
}
