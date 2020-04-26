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
