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
  ICTypeSchema,
  IDidDetails,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { ConfigService } from '@kiltprotocol/config'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import { DidUtils } from '@kiltprotocol/did'

const log = ConfigService.LoggingFactory.getLogger('CType')

/**
 * @param ctype
 * @internal
 */
export async function store(ctype: ICType): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  log.debug(() => `Create tx for 'ctype.add'`)
  // We need to remove the CType ID from the CType before storing it on the blockchain
  // otherwise the resulting hash will be different.
  const schemaWithoutId: Omit<ICTypeSchema, '$id'> = {
    $schema: ctype.schema.$schema,
    properties: ctype.schema.properties,
    title: ctype.schema.title,
    type: ctype.schema.type,
  }
  const tx: SubmittableExtrinsic = blockchain.api.tx.ctype.add(
    Crypto.encodeObjectAsStr(schemaWithoutId)
  )
  return tx
}

/**
 * @param encoded
 * @internal
 */
export function decode(encoded: Option<AccountId>): IDidDetails['did'] | null {
  DecoderUtils.assertCodecIsType(encoded, ['Option<CtypeCreatorOf>'])
  return encoded.isSome
    ? DidUtils.getKiltDidFromIdentifier(encoded.unwrap().toString(), 'full')
    : null
}

/**
 * @param ctypeHash
 * @internal
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
 * @param ctypeHash
 * @internal
 */
export async function isStored(ctypeHash: ICType['hash']): Promise<boolean> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const encoded = await blockchain.api.query.ctype.ctypes<Option<AccountId>>(
    ctypeHash
  )
  return encoded.isSome
}
