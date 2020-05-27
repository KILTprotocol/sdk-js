/**
 * Universally unique identifiers (UUIDs) are needed in KILT to uniquely identify specific information.
 *
 * UUIDs are used for example in [[RequestForAttestation]] to generate hashes.
 *
 * @module UUID
 * @packageDocumentation
 */

import { v4 as uuid } from 'uuid'
import { H256 } from '@polkadot/types'

/**
 * Generates a H256 compliant UUID.
 *
 * @returns The hashed uuid.
 */
export function generate(): string {
  return new H256(uuid()).toString()
}

export default {
  generate,
}
