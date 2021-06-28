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
  IPublicIdentity,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { DecoderUtils } from '@kiltprotocol/utils'
import { ConfigService } from '@kiltprotocol/config'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'

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
// decoding is not backwards compatible with mashnet-node 0.22 anymore
export function decode(
  encoded: Option<AccountId>
): IPublicIdentity['address'] | null {
  DecoderUtils.assertCodecIsType(encoded, ['Option<CtypeCreatorOf>'])
  return !encoded.isEmpty ? encoded.toString() : null
}

/**
 * @param ctypeHash
 * @internal
 */
export async function getOwner(
  ctypeHash: ICType['hash']
): Promise<IPublicIdentity['address'] | null> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const encoded = await blockchain.api.query.ctype.ctypes<Option<AccountId>>(
    ctypeHash
  )
  const queriedCTypeAccount = decode(encoded)
  return queriedCTypeAccount
}
