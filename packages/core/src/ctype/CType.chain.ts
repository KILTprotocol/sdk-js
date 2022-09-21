/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Option } from '@polkadot/types'
import type { AccountId } from '@polkadot/types/interfaces'

import { Crypto } from '@kiltprotocol/utils'
import type { DidUri, ICType } from '@kiltprotocol/types'
import * as Did from '@kiltprotocol/did'

import { getSchemaPropertiesForHash } from './CType.js'

/**
 * Encodes the provided CType for use in `api.tx.ctype.add()`.
 *
 * @param ctype The CType to write on the blockchain.
 * @returns Encoded CType.
 */
export function toChain(ctype: ICType): string {
  return Crypto.encodeObjectAsStr(getSchemaPropertiesForHash(ctype.schema))
}

/**
 * Decodes the owner DID from the return value of `api.query.ctype.ctypes(ctypeHash)`.
 *
 * @param encoded The data from the blockchain.
 * @returns The owner DID.
 */
export function fromChain(encoded: Option<AccountId>): DidUri {
  return Did.uriFromChain(encoded.unwrap())
}
