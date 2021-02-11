/**
 * @packageDocumentation
 * @ignore
 */

import { SubmittableExtrinsic } from '@polkadot/api/promise/types'
import { Option } from '@polkadot/types'
import { AccountId } from '@polkadot/types/interfaces'
import { ICType, IPublicIdentity } from '@kiltprotocol/types'
import { DecoderUtils } from '@kiltprotocol/utils'
import { ConfigService } from '@kiltprotocol/config'
import { blockchainApiConnection } from '@kiltprotocol/chain-helpers'
import Identity from '../identity/Identity'

const log = ConfigService.LoggingFactory.getLogger('CType')

export async function store(
  ctype: ICType,
  identity: Identity
): Promise<SubmittableExtrinsic> {
  const blockchain = await blockchainApiConnection.getCached()
  log.debug(() => `Create tx for 'ctype.add'`)
  const tx: SubmittableExtrinsic = blockchain.api.tx.ctype.add(ctype.hash)
  return blockchain.signTx(identity, tx)
}

// decoding is not backwards compatible with mashnet-node 0.22 anymore
export function decode(
  encoded: Option<AccountId>
): IPublicIdentity['address'] | null {
  DecoderUtils.assertCodecIsType(encoded, ['Option<AccountId>'])
  return !encoded.isEmpty ? encoded.toString() : null
}

export async function getOwner(
  ctypeHash: ICType['hash']
): Promise<IPublicIdentity['address'] | null> {
  const blockchain = await blockchainApiConnection.getCached()
  const encoded = await blockchain.api.query.ctype.cTYPEs<Option<AccountId>>(
    ctypeHash
  )
  const queriedCTypeAccount = decode(encoded)
  return queriedCTypeAccount
}
