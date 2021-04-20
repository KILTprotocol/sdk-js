import {
  DocumentLoader,
  ExpansionMap,
  purposes,
  VerificationResult,
} from 'jsonld-signatures'
import { JsonLdObj } from 'jsonld/jsonld-spec'
import { KILT_CREDENTIAL_DIGEST_PROOF_TYPE, SelfSignedProof } from '../types'

import { verifySelfSignedProof } from '../verificationUtils'
import KiltAbstractSuite from './KiltAbstractSuite'

export default class KiltSignatureSuite extends KiltAbstractSuite {
  constructor(options: {} = {}) {
    super({ type: KILT_CREDENTIAL_DIGEST_PROOF_TYPE })
  }

  public async createProof(options: {
    document: JsonLdObj
    purpose?: purposes.ProofPurpose
    documentLoader?: DocumentLoader
    expansionMap?: ExpansionMap
  }): Promise<SelfSignedProof> {
    throw new Error('not implemented')
    // const { document, purpose } = options
    // if (!document || typeof document !== 'object')
    //   throw new TypeError('document must be a JsonLd object')

    //   return {
    //     '@context': [
    //       DEFAULT_VERIFIABLECREDENTIAL_CONTEXT,
    //       KILT_CREDENTIAL_CONTEXT_URL,
    //     ],
    //     type: this.type,
    //     proofPurpose: purpose?.term,
    //   } as SelfSignedProof
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
