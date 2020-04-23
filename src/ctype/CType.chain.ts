/**
 * @packageDocumentation
 * @ignore
 */

import { SubmittableExtrinsic } from '@polkadot/api/promise/types'
import { SubmittableResult } from '@polkadot/api'
import { AccountId } from '@polkadot/types/interfaces'
import { Option } from '@polkadot/types'
import { getCached } from '../blockchainApiConnection'
import Identity from '../identity/Identity'
import IPublicIdentity from '../types/PublicIdentity'
import { factory } from '../config/ConfigLog'
import ICType from '../types/CType'

const log = factory.getLogger('CType')

export async function store(
  ctype: ICType,
  identity: Identity
): Promise<SubmittableResult> {
  const blockchain = await getCached()
  log.debug(() => `Create tx for 'ctype.add'`)
  const tx: SubmittableExtrinsic = blockchain.api.tx.ctype.add(ctype.hash)
  return blockchain.submitTx(identity, tx)
}

export function decode(
  encoded: Option<AccountId>
): IPublicIdentity['address'] | null {
  return !encoded.isEmpty ? encoded.toString() : null
}

export async function getOwner(
  ctypeHash: ICType['hash']
): Promise<IPublicIdentity['address'] | null> {
  const blockchain = await getCached()
  const encoded = await blockchain.api.query.ctype.cTYPEs<Option<AccountId>>(
    ctypeHash
  )
  const queriedCTypeAccount = decode(encoded)
  return queriedCTypeAccount
}
