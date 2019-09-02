/**
 * #### Overview
 * Utility functions to generate universally unique identifiers (UUIDs).
 * @module UUID
 */

/**
 * Dummy comment, so that typedoc ignores this file
 */
import { v4 as uuid } from 'uuid'
import { Hash } from '@polkadot/types'

/**
 * Generates a H256 compliant UUID.
 */
export function generate(): string {
  return new Hash(uuid()).toString()
}

export default {
  generate,
}
