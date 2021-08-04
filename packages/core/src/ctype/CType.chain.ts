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
import type {
  ICType,
  IDidDetails,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { DecoderUtils } from '@kiltprotocol/utils'
import { ConfigService } from '@kiltprotocol/config'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import { getKiltDidFromIdentifier } from '@kiltprotocol/did'

const log = ConfigService.LoggingFactory.getLogger('CType')

/**
 * @param ctype
 * @internal
 */
export async function store(ctype: ICType): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  log.debug(() => `Create tx for 'ctype.add'`)
  const tx: SubmittableExtrinsic = blockchain.api.tx.ctype.add(ctype.hash)
  return tx
}

/**
 * @param encoded
 * @internal
 */
export function decode(encoded: Option<AccountId>): IDidDetails['did'] | null {
  DecoderUtils.assertCodecIsType(encoded, ['Option<CtypeCreatorOf>'])
  return encoded.isSome
    ? getKiltDidFromIdentifier(encoded.unwrap().toString())
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
