import type {
  DocumentLoader,
  ExpansionMap,
  purposes,
  VerificationResult,
  Signer,
} from 'jsonld-signatures'
import type { JsonLdObj } from 'jsonld/jsonld-spec'
import {
  IPublicKeyRecord,
  KILT_SELF_SIGNED_PROOF_TYPE,
  SelfSignedProof,
} from '../types'
import { verifySelfSignedProof } from '../verificationUtils'
import KiltAbstractSuite from './KiltAbstractSuite'

export default class KiltSignatureSuite extends KiltAbstractSuite {
  constructor({
    verificationMethod,
  }: { signer?: Signer; verificationMethod?: string | IPublicKeyRecord } = {}) {
    super({ type: KILT_SELF_SIGNED_PROOF_TYPE, verificationMethod })
  }

  public async createProof(options: {
    document: JsonLdObj
    purpose?: purposes.ProofPurpose
    documentLoader?: DocumentLoader
    expansionMap?: ExpansionMap
  }): Promise<SelfSignedProof> {
    throw new Error('not implemented')
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
      const compactedProof = await this.compactProof<SelfSignedProof>(
        proof,
        options
      )
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
