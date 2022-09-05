/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Option } from '@polkadot/types'
import type { AccountId } from '@polkadot/types/interfaces'
import { Crypto, DecoderUtils } from '@kiltprotocol/utils'
import type { DidUri, ICType, KiltAddress } from '@kiltprotocol/types'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import { Utils as DidUtils } from '@kiltprotocol/did'
import { getSchemaPropertiesForHash } from './CType.js'

/**
 * Encodes the provided CType for use in `api.tx.ctype.add()`.
 *
 * @param ctype The CType to write on the blockchain.
 * @returns Encoded CType.
 */
export function encodeCType(ctype: ICType): string {
  return Crypto.encodeObjectAsStr(getSchemaPropertiesForHash(ctype.schema))
}

function decode(encoded: Option<AccountId>): DidUri | null {
  DecoderUtils.assertCodecIsType(encoded, ['Option<AccountId32>'])
  return encoded.isSome
    ? DidUtils.getFullDidUri(encoded.unwrap().toString() as KiltAddress)
    : null
}

/**
 * Queries the blockchain and returns the DID of the provided CType owner.
 *
 * @param ctypeHash The has of the CType to retrieve the owner for.
 * @returns The CType owner DID or null if the CType with the given hash does not exist.
 */
export async function getOwner(
  ctypeHash: ICType['hash']
): Promise<DidUri | null> {
  const api = await BlockchainApiConnection.getConnectionOrConnect()
  const encoded = await api.query.ctype.ctypes(ctypeHash)
  return decode(encoded)
}

/**
 * Queries the blockchain and returns whether a CType with the provided hash exists.
 *
 * @param ctypeHash The has of the CType to check.
 * @returns True if a CType with the provided hash exists, false otherwise.
 */
export async function isStored(ctypeHash: ICType['hash']): Promise<boolean> {
  const api = await BlockchainApiConnection.getConnectionOrConnect()
  const encoded = await api.query.ctype.ctypes(ctypeHash)
  return encoded.isSome
}
