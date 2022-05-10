/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  DocumentLoader,
  ExpansionMap,
  purposes,
  VerificationResult,
} from 'jsonld-signatures'
import type { JsonLdObj } from 'jsonld/jsonld-spec'
import type { CredentialDigestProof } from '../../types.js'

import { verifyCredentialDigestProof } from '../../verificationUtils.js'
import { KiltAbstractSuite } from './KiltAbstractSuite.js'
import { KILT_CREDENTIAL_DIGEST_PROOF_TYPE } from '../../constants.js'

export class KiltDisclosureSuite extends KiltAbstractSuite {
  constructor() {
    // vc-js complains when there is no verificationMethod
    super({
      type: KILT_CREDENTIAL_DIGEST_PROOF_TYPE,
      verificationMethod: '<none>',
    })
  }

  /**
   * @inheritdoc
   */
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
    } catch (e: any) {
      return { verified: false, error: e }
    }
  }
}
