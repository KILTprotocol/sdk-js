/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Proof } from '../credentialsV1/types.js'

export interface VerificationResult {
  verified: boolean
  error?: string[]
}

/**
 * Aligning with jsonld-signatures:
 * @return {Promise<{verified: boolean, results: Array, error: *}>} resolves
 *   with an object with a `verified`boolean property that is `true` if at
 *   least one proof matching the given purpose and suite verifies and `false`
 *   otherwise; a `results` property with an array of detailed results;
 *   if `false` an `error` property will be present.
 */
export interface ProofSetResult extends VerificationResult {
  results: VerificationResult[]
}

/**
 * Aligning with @digitalbazaar/vc:
 * @typedef {object} VerifyCredentialResult
 * @property {boolean} verified - True if verified, false if not.
 * @property {object} statusResult
 * @property {Array} results
 * @property {object} error
 */
export interface VerifyCredentialResult extends ProofSetResult {
  statusResult?: VerificationResult
}

/**
 * Aligning with @digitalbazaar/vc:
 * @typedef {object} VerifyPresentationResult
 * @property {boolean} verified - True if verified, false if not.
 * @property {object} presentationResult
 * @property {Array} credentialResults
 * @property {object} error
 */
export interface VerifyPresentationResult extends VerificationResult {
  presentationResult: ProofSetResult
  credentialResults: VerifyCredentialResult[]
}

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
 * @param document
 * @param document.proof
 * @param verifiers
 * @param policy
 */
export async function verifyProofSet<T extends string>(
  document: { proof: Proof[] | Proof },
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
    const results = outcomes.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value
      }
      return {
        verified: false,
        error: formatError(result.reason),
      }
    })
    const error = results.flatMap((r) => (r.error ? arrayify(r.error) : []))
    if (policy === 'all') {
      return {
        verified: results.every(({ verified }) => verified === true),
        error,
        results,
      }
    }
    return {
      verified: results.some(({ verified }) => verified === true),
      error,
      results,
    }
  } catch (e) {
    return {
      verified: false,
      results: [],
      error: formatError(e),
    }
  }
}
