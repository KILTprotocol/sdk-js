/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Option } from '@polkadot/types'
import type { AccountId } from '@polkadot/types/interfaces'
import { Crypto, DecoderUtils } from '@kiltprotocol/utils'
import type {
  ICType,
  IDidDetails,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { ConfigService } from '@kiltprotocol/config'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import { Utils as DidUtils } from '@kiltprotocol/did'
import { getSchemaPropertiesForHash } from './CType.js'

const log = ConfigService.LoggingFactory.getLogger('CType')

/**
 * Generate the extrinsic to store the provided [[ICtype]].
 *
 * If present, the CType schema id is stripped out before submission, as the same is computed on chain.
 *
 * @param ctype The CType to write on the blockchain.
 * @returns The SubmittableExtrinsic for the `add` call.
 */
export async function getStoreTx(ctype: ICType): Promise<SubmittableExtrinsic> {
  const api = await BlockchainApiConnection.getConnectionOrConnect()
  log.debug(() => `Create tx for 'ctype.add'`)
  const preparedSchema = Crypto.encodeObjectAsStr(
    getSchemaPropertiesForHash(ctype.schema)
  )
  return api.tx.ctype.add(preparedSchema)
}

function decode(encoded: Option<AccountId>): IDidDetails['uri'] | null {
  DecoderUtils.assertCodecIsType(encoded, ['Option<AccountId32>'])
  return encoded.isSome
    ? DidUtils.getKiltDidFromIdentifier(encoded.unwrap().toString(), 'full')
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
): Promise<IDidDetails['uri'] | null> {
  const api = await BlockchainApiConnection.getConnectionOrConnect()
  const encoded = await api.query.ctype.ctypes<Option<AccountId>>(ctypeHash)
  return decode(encoded)
}

/**
 * Queries the blockchain and returns whether a CType with the provide hash exists.
 *
 * @param ctypeHash The has of the CType to check.
 * @returns True if a CType with the provided hash exists, false otherwise.
 */
export async function isStored(ctypeHash: ICType['hash']): Promise<boolean> {
  const api = await BlockchainApiConnection.getConnectionOrConnect()
  const encoded = await api.query.ctype.ctypes<Option<AccountId>>(ctypeHash)
  return encoded.isSome
}
