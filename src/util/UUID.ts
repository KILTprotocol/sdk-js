/**
 * @module Utils
 * --- Overview ---
 * Miscellaneous utility functions
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
