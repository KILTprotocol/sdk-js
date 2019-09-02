/**
 * Universally unique identifiers (UUIDs) are needed in KILT to uniquely identify specific information.
 * ***
 * UUIDs are used for example in [[RequestForAttestation]] to generate hashes.
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
