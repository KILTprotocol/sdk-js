/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { SDKErrors } from '@kiltprotocol/utils'

import type { Proof } from '../V1/types.js'

/**
 * Converts the input value to an instance of Error.
 *
 * @param input Some value.
 * @param constructor The Error (sub-)class to be instantiated, if input is not yet an error.
 * @returns An instance of Error.
 */
export function toError(
  input: unknown,
  constructor = SDKErrors.SDKError
): Error {
  if (input instanceof Error) {
    return input
  }
  return new constructor(String(input))
}

/**
 * Appends errors to an array on the `error` property of `input`.
 * Creates the property if it does not yet exist.
 * All operations happen in-place and modify the input object.
 *
 * @param input The object to be modified.
 * @param input.error If present, this should be an array of `Error` instances.
 * @param newErrors One or more instances of `Error` to be appended to `input.error`.
 */
export function appendErrors(
  input: { error?: Error[] | undefined },
  ...newErrors: Error[]
): void {
  if (Array.isArray(input.error)) {
    input.error.push(...newErrors)
    return
  }
  // eslint-disable-next-line no-param-reassign
  input.error = newErrors
}

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
