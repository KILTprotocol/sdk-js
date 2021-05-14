import type {
  DocumentLoader,
  ExpansionMap,
  purposes,
  VerificationResult,
} from 'jsonld-signatures'
import type { JsonLdObj } from 'jsonld/jsonld-spec'
import type { CredentialDigestProof } from '../../types'

import { verifyCredentialDigestProof } from '../../verificationUtils'
import KiltAbstractSuite from './KiltAbstractSuite'
import { KILT_CREDENTIAL_DIGEST_PROOF_TYPE } from '../../constants'

export default class KiltDisclosureSuite extends KiltAbstractSuite {
  constructor() {
    // vc-js complains when there is no verificationMethod
    super({
      type: KILT_CREDENTIAL_DIGEST_PROOF_TYPE,
      verificationMethod: '<none>',
    })
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
