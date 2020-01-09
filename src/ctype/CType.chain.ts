/**
 * @module CType
 */

/**
 * Dummy comment needed for correct doc display, do not remove.
 */
import { SubmittableExtrinsic } from '@polkadot/api/promise/types'

import { QueryResult } from '../blockchain/Blockchain'
import { getCached } from '../blockchainApiConnection'
import TxStatus from '../blockchain/TxStatus'
import Identity from '../identity/Identity'
import IPublicIdentity from '../types/PublicIdentity'
import { factory } from '../config/ConfigLog'
import ICType from '../types/CType'

const log = factory.getLogger('CType')

export async function store(
  ctype: ICType,
  identity: Identity
): Promise<TxStatus> {
  const blockchain = await getCached()
  log.debug(() => `Create tx for 'ctype.add'`)
  const tx: SubmittableExtrinsic = await blockchain.api.tx.ctype.add(ctype.hash)
  const txStatus: TxStatus = await blockchain.submitTx(identity, tx)
  if (txStatus.type === 'Finalized') {
    txStatus.payload = {
      ...ctype,
      owner: identity.address,
    }
  }
  return txStatus
}

function decode(encoded: QueryResult): IPublicIdentity['address'] | null {
  return encoded && encoded.encodedLength && !encoded.isEmpty
    ? encoded.toString()
    : null
}

export async function getOwner(
  ctypeHash: ICType['hash']
): Promise<IPublicIdentity['address'] | null> {
  const blockchain = await getCached()
  const encoded: QueryResult = await blockchain.api.query.ctype.cTYPEs(
    ctypeHash
  )
  const queriedCTypeAccount = decode(encoded)
  return queriedCTypeAccount
}
