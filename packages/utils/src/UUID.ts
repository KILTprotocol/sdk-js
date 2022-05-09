/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * Universally unique identifiers (UUIDs) are needed in KILT to uniquely identify specific information.
 *
 * UUIDs are used for example in [[RequestForAttestation]] to generate hashes.
 *
 * @packageDocumentation
 */

import { v4 as uuid } from 'uuid'
import { hashStr } from './Crypto.js'

/**
 * Generates a H256 compliant UUID.
 *
 * @returns The hashed uuid.
 */
export function generate(): string {
  return hashStr(uuid())
}
