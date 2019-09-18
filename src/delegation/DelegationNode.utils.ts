/**
 * @module Delegation/DelegationNode
 */

/**
 * Dummy comment needed for correct doc display, do not remove.
 */
import { IDelegationNode } from '../types/Delegation'

/**
 * Creates a bitset from the permissions in the array where each enum value
 * is used to set the bit flag in the set.
 *
 * ATTEST has `0000000000000001`  (decimal 1)
 * DELEGATE has `0000000000000010` (decimal 2)
 *
 * Adding the enum values results in a decimal representation of the bitset.
 *
 * @returns the bitset as single value uint8 array
 */
// eslint-disable-next-line import/prefer-default-export
export function permissionsAsBitset(delegation: IDelegationNode): Uint8Array {
  const permisssionsAsBitset: number = delegation.permissions.reduce(
    (accumulator, currentValue) => accumulator + currentValue
  )
  const uint8: Uint8Array = new Uint8Array(4)
  uint8[0] = permisssionsAsBitset
  return uint8
}
