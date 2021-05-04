import type {
  DocumentLoader,
  ExpansionMap,
  purposes,
  VerificationResult,
  Signer,
} from 'jsonld-signatures'
import type { JsonLdObj } from 'jsonld/jsonld-spec'
import { Crypto } from '@kiltprotocol/utils'
import {
  DEFAULT_VERIFIABLECREDENTIAL_CONTEXT,
  IPublicKeyRecord,
  KILT_SELF_SIGNED_PROOF_TYPE,
  SelfSignedProof,
} from '../types'
import { verifySelfSignedProof } from '../verificationUtils'
import { fromCredentialURI } from '../exportToVerifiableCredential'
import KiltAbstractSuite from './KiltAbstractSuite'
import { KILT_CREDENTIAL_CONTEXT_URL } from './kiltContexts'

export default class KiltSignatureSuite extends KiltAbstractSuite {
  private signer?: Signer
  constructor({
    signer,
    verificationMethod,
  }: { signer?: Signer; verificationMethod?: string | IPublicKeyRecord } = {}) {
    super({ type: KILT_SELF_SIGNED_PROOF_TYPE, verificationMethod })
    this.signer = signer
  }

  public async createProof(options: {
    document: JsonLdObj
    purpose?: purposes.ProofPurpose
    documentLoader?: DocumentLoader
    expansionMap?: ExpansionMap
  }): Promise<SelfSignedProof> {
    if (!(this.signer && typeof this.signer.sign === 'function')) {
      throw new Error('A signer API has not been specified.')
    }
    if (!this.verificationMethod) {
      throw new Error('verificationMethod is required to sign')
    }
    const { document, purpose } = options
    if (!document || typeof document !== 'object')
      throw new TypeError('document must be a JsonLd object')
    const compactedDoc = await this.compactDoc(document, options)
    const rootHash = fromCredentialURI(compactedDoc.id)

    const signature = Crypto.u8aToHex(
      await this.signer.sign({ data: Crypto.coToUInt8(rootHash) })
    )
    return {
      '@context': [
        DEFAULT_VERIFIABLECREDENTIAL_CONTEXT,
        KILT_CREDENTIAL_CONTEXT_URL,
      ],
      type: this.type,
      proofPurpose: purpose?.term,
      signature,
      verificationMethod: this.verificationMethod,
    } as SelfSignedProof
  }

  public async verifyProof(options: {
    proof: JsonLdObj
    document?: JsonLdObj
    purpose?: purposes.ProofPurpose
    documentLoader?: DocumentLoader
    expansionMap?: ExpansionMap
  }): Promise<VerificationResult> {
    try {
      const { document, proof, documentLoader } = options
      if (!document || typeof document !== 'object')
        throw new TypeError('document must be a JsonLd object')
      if (!proof || typeof proof !== 'object')
        throw new TypeError('proof must be a JsonLd object')
      const compactedDoc = await this.compactDoc(document, options)
      const compactedProof = await this.compactProof<SelfSignedProof>(
        proof,
        options
      )
      if (typeof compactedProof.verificationMethod === 'string') {
        const dereferenced = documentLoader
          ? await documentLoader(compactedProof.verificationMethod)
          : undefined
        if (!dereferenced?.document) {
          throw new Error(
            'verificationMethod could not be dereferenced; did you select an appropriate document loader?'
          )
        }
        compactedProof.verificationMethod = dereferenced.document as IPublicKeyRecord
      }
      // note that we currently don't check whether the public key in the proof is linked to the credential subject
      const { verified, errors } = verifySelfSignedProof(
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
