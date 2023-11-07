/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Proof, VerifiableCredential } from '../credentialsV1/types.js'

export interface VerificationResult {
  verified: boolean
  error?: string[]
}

/**
 * Aligning with jsonld-signatures:
 * return {Promise<{verified: boolean, results: Array, error: *}>} resolves
 *   with an object with a `verified`boolean property that is `true` if at
 *   least one proof matching the given purpose and suite verifies and `false`
 *   otherwise; a `results` property with an array of detailed results;
 *   if `false` an `error` property will be present.
 */
export interface ProofSetResult extends VerificationResult {
  results: Array<VerificationResult & { proof: Proof }>
}

/**
 * Aligning with @digitalbazaar/vc:
 * typedef {object} VerifyCredentialResult
 * property {boolean} verified - True if verified, false if not.
 * property {object} statusResult
 * property {Array} results
 * property {object} error.
 */
export interface VerifyCredentialResult extends ProofSetResult {
  credential: VerifiableCredential
  statusResult?: VerificationResult
}

/**
 * Aligning with @digitalbazaar/vc:
 * typedef {object} VerifyPresentationResult
 * property {boolean} verified - True if verified, false if not.
 * property {object} presentationResult
 * property {Array} credentialResults
 * property {object} error.
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
