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
 * @param codec The codec type to check for non-empty bytes.
 * @returns Whether the codec is evidently non-empty. In case of `false` it *may* be empty.
 */
export function hasNonNullByte(codec: Codec): boolean {
  return !codec.toU8a().some(e => e !== 0)
}

/**
 * Checks nested codec types against a type description string. Uses `codec.toRawType()` internally.
 *
 * @param codec The codec to type check.
 * @param types An array of strings denoting types to check against.
 * @returns Whether the codec type is any of the allowed `types`.
 */
export function codecIsType(codec: Codec, types: string[]): boolean {
  return types.includes(codec.toRawType())
}

/**
 * Checks nested codec types against a type description string. Uses `codec.toRawType()` internally.
 *
 * @param codec The codec to type check.
 * @param types An array of strings denoting types to check against.
 * @throws `TypeError` If codec type is not contained in the allowed `types`.
 */
export function assertCodecIsType(codec: Codec, types: string[]): void {
  if (!codecIsType(codec, types))
    throw new TypeError(
      `expected Codec type(s) ${types}, got ${codec.toRawType()}`
    )
}

export default hasNonNullByte
