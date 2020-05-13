/**
 * @module Decode
 */

import { Codec } from '@polkadot/types/types'

/**
 * Dummy comment needed for correct doc display, do not remove.
 */

/**
 * Checks for a non-null byte in the Uint8Array representation
 * of the codec. This is a pretty sound indicator that the
 * codec does not hold an empty default value. The reverse inference
 * does not apply! Valid values could be encoded only with 0 bytes.
 *
 * @param codec Codec type to check for non-empty bytes.
 * @returns True if codec is non-empty; false if it may be empty.
 */
export function hasNonNullByte(codec: Codec): boolean {
  return !codec.toU8a().some(e => e !== 0)
}

/**
 * Checks nested codec types against a type description string. Uses `codec.toRawType()` internally.
 *
 * @param codec Codec to type check.
 * @param types String or array of strings to check against.
 * @returns `boolean` true if codec type is contained in types, false otherwise.
 */
export function codecIsType(codec: Codec, types: string[] | string): boolean {
  return types instanceof Array
    ? types.includes(codec.toRawType())
    : types === codec.toRawType()
}

/**
 * Checks nested codec types against a type description string. Uses `codec.toRawType()` internally.
 *
 * @param codec Codec to type check.
 * @param types String or array of strings to check against.
 * @throws `TypeError` If codec type is not contained in types.
 */
export function assertCodecIsType(
  codec: Codec,
  types: string[] | string
): void {
  if (!codecIsType(codec, types))
    throw new TypeError(
      `expected Codec type(s) ${types}, got ${codec.toRawType()}`
    )
}

export default hasNonNullByte
