/**
 * @packageDocumentation
 * @module Decode
 */

import type { Codec } from '@polkadot/types/types'

/**
 * Dummy comment needed for correct doc display, do not remove.
 */

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
