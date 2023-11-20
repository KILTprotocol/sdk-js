/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Proof, VerifiableCredential } from '../V1/types.js'

export interface VerificationResult {
  verified: boolean
  error?: string[]
}

/**
 * Aligning with jsonld-signatures (https://github.com/digitalbazaar/jsonld-signatures/blob/0dbe528e2cd2881b276932b503b9598a850ab8d6/lib/ProofSet.js#L153).
 */
export interface ProofSetResult extends VerificationResult {
  results: Array<VerificationResult & { proof: Proof }>
}

/**
 * Aligning with @digitalbazaar/vc (https://github.com/digitalbazaar/vc/blob/304dac0be9c7f7b5a80a6d7e4b9079ac713c3b0b/lib/index.js#L87-L91).
 */
export interface VerifyCredentialResult extends ProofSetResult {
  credential: VerifiableCredential
  statusResult?: VerificationResult
}

/**
 * Aligning with @digitalbazaar/vc (https://github.com/digitalbazaar/vc/blob/304dac0be9c7f7b5a80a6d7e4b9079ac713c3b0b/lib/index.js#L79-L83).
 */
export interface VerifyPresentationResult extends VerificationResult {
  presentationResult: ProofSetResult
  credentialResults: VerifyCredentialResult[]
}

export type SecuredDocument = { proof: Proof[] | Proof }

/**
 * Retrieves the proof from the proof property of a document. Throws if no proof or multiple proofs (i.e., a proof set/chain) is found on the document.
 *
 * @param document The document containing a proof.
 * @param document.proof The proof property, which must either be a proof object, or be an array containing exactly one proof object.
 * @returns The proof.
 */
export function getProof<T extends Proof>({ proof }: { proof?: T | T[] }): T {
  if (!proof) {
    throw new Error('document does not contain any proofs')
  }
  if (Array.isArray(proof)) {
    if (proof.length !== 1) {
      throw new Error(
        'proof sets and proof chains are not supported; the document must contain exactly one proof'
      )
    }
    return proof[0]
  }
  return proof
}
