/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @packageDocumentation
 * @module CType
 */

import type { Option } from '@polkadot/types'
import type { AccountId } from '@polkadot/types/interfaces'
import { DecoderUtils, Crypto } from '@kiltprotocol/utils'
import type {
  ICType,
  IDidDetails,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { ConfigService } from '@kiltprotocol/config'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import { DidUtils } from '@kiltprotocol/did'
import { getSchemaPropertiesForHash } from './utils.js'

const log = ConfigService.LoggingFactory.getLogger('CType')

/**
 * Generate the extrinsic to store the provided [[ICtype]].
 *
 * If present, the CType schema id is stripped out before submission, as the same is computed on chain.
 *
 * @param ctype The CType to write on the blockchain.
 * @returns The [[SubmittableExtrinsic]] for the `add` call.
 */
export async function store(ctype: ICType): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  log.debug(() => `Create tx for 'ctype.add'`)
  const preparedSchema = Crypto.encodeObjectAsStr(
    getSchemaPropertiesForHash(ctype.schema)
  )
  const tx: SubmittableExtrinsic = blockchain.api.tx.ctype.add(preparedSchema)
  return tx
}

function decode(encoded: Option<AccountId>): IDidDetails['did'] | null {
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
): Promise<IDidDetails['did'] | null> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const encoded = await blockchain.api.query.ctype.ctypes<Option<AccountId>>(
    ctypeHash
  )
  return decode(encoded)
}

/**
 * Queries the blockchain and returns whether a CType with the provide hash exists.
 *
 * @param ctypeHash The has of the CType to check.
 * @returns True if a CType with the provided hash exists, false otherwise.
 */
export async function isStored(ctypeHash: ICType['hash']): Promise<boolean> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const encoded = await blockchain.api.query.ctype.ctypes<Option<AccountId>>(
    ctypeHash
  )
  return encoded.isSome
}
