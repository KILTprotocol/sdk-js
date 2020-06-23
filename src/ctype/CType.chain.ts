/**
 * @packageDocumentation
 * @ignore
 */

import { SubmittableResult } from '@polkadot/api'
import { SubmittableExtrinsic } from '@polkadot/api/promise/types'
import { Option } from '@polkadot/types'
import { AccountId } from '@polkadot/types/interfaces'
import { getCached } from '../blockchainApiConnection'
import { factory } from '../config/ConfigLog'
import Identity from '../identity/Identity'
import ICType from '../types/CType'
import IPublicIdentity from '../types/PublicIdentity'
import { assertCodecIsType } from '../util/Decode'

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

// decoding is backwards compatible with mashnet-node 0.22
export function decode(
  encoded: Option<AccountId> | AccountId
): IPublicIdentity['address'] | null {
  assertCodecIsType(encoded, ['AccountId', 'Option<AccountId>'])
  return !encoded.isEmpty ? encoded.toString() : null
}

export async function getOwner(
  ctypeHash: ICType['hash']
): Promise<IPublicIdentity['address'] | null> {
  const blockchain = await getCached()
  const encoded = await blockchain.api.query.ctype.cTYPEs<
    Option<AccountId> | AccountId
  >(ctypeHash)
  const queriedCTypeAccount = decode(encoded)
  return queriedCTypeAccount
}
