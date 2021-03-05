/**
 * @packageDocumentation
 * @module CType
 */

import { Option } from '@polkadot/types'
import { AccountId } from '@polkadot/types/interfaces'
import type {
  ICType,
  IPublicIdentity,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { DecoderUtils } from '@kiltprotocol/utils'
import { ConfigService } from '@kiltprotocol/config'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import Identity from '../identity/Identity'

const log = ConfigService.LoggingFactory.getLogger('CType')

/**
 * @param ctype
 * @param identity
 * @internal
 */
export async function store(
  ctype: ICType,
  identity: Identity
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  log.debug(() => `Create tx for 'ctype.add'`)
  const tx: SubmittableExtrinsic = blockchain.api.tx.ctype.add(ctype.hash)
  return blockchain.signTx(identity, tx)
}

/**
 * @param encoded
 * @internal
 */
// decoding is not backwards compatible with mashnet-node 0.22 anymore
export function decode(
  encoded: Option<AccountId>
): IPublicIdentity['address'] | null {
  DecoderUtils.assertCodecIsType(encoded, ['Option<AccountId>'])
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
  const encoded = await blockchain.api.query.ctype.cTYPEs<Option<AccountId>>(
    ctypeHash
  )
  const queriedCTypeAccount = decode(encoded)
  return queriedCTypeAccount
}
