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

function arrayify<T>(input: T | T[]): T[] {
  if (Array.isArray(input)) {
    return input
  }
  return [input]
}

function formatError(error: unknown): string[] | undefined {
  const e: string | undefined = error?.toString?.()
  return e ? arrayify(e) : undefined
}

type VerifyFunction<T extends string> = (
  document: Record<string, unknown>,
  proof: Proof & { type: T }
) => Promise<VerificationResult>

/**
 * Verifies a set of proofs attached to a given document against a set of verifier functions.
 * This function:
 * - Asserts the existence of proofs in the document.
 * - Maps each proof to its respective verifier function.
 * - Executes verifications in parallel.
 * - Resolves based on the provided policy: either 'any' (successful if any one proof is verified) or 'all' (successful only if all proofs are verified).
 *
 * @param document - The document containing the proofs to be verified.
 * @param document.proof - A proof or array of proofs attached to the document.
 * @param verifiers - An object mapping proof types to their corresponding verifier functions.
 * @param policy - The verification policy. 'any' means at least one proof should be valid, and 'all' means all proofs must be valid. Defaults to 'any'.
 *
 * @returns An object representing the result of the verification for each proof in the set.
 */
export async function verifyProofSet<T extends string>(
  document: SecuredDocument,
  verifiers: Record<T, VerifyFunction<T>>,
  policy: 'any' | 'all' = 'any'
): Promise<ProofSetResult> {
  try {
    const proofs = arrayify(document.proof).filter(
      (p) => typeof p === 'object' && p !== null
    )
    if (proofs.length === 0) {
      throw new Error('Document contains no proof')
    }
    const outcomes = await Promise.allSettled(
      proofs.map<Promise<VerificationResult>>((proof) => {
        const verify = verifiers[proof.type as T]
        if (typeof verify !== 'function') {
          return Promise.reject(
            new Error(
              `No verifier function available for unknown proof type ${proof.type}`
            )
          )
        }
        return verify(document, proof as { type: T })
      })
    )
    const results = outcomes.map((result, i) => {
      const proof = proofs[i]
      if (result.status === 'fulfilled') {
        return { ...result.value, proof }
      }
      return {
        verified: false,
        error: formatError(result.reason),
        proof,
      }
    })
    const error = results.flatMap((r) => (r.error ? arrayify(r.error) : []))
    if (policy === 'all') {
      return {
        verified: results.every(({ verified }) => verified === true),
        results,
        error,
      }
    }
    return {
      verified: results.some(({ verified }) => verified === true),
      results,
      error,
    }
  } catch (e) {
    return {
      verified: false,
      results: [],
      error: formatError(e),
    }
  }
}
