/**
 * @module CType
 */
import { CodecResult } from '@polkadot/api/promise/types'
import { SubmittableExtrinsic } from '@polkadot/api/SubmittableExtrinsic'

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
  const tx: SubmittableExtrinsic<
    CodecResult,
    any
  > = await blockchain.api.tx.ctype.add(ctype.hash)
  const txStatus: TxStatus = await blockchain.submitTx(identity, tx)
  if (txStatus.type === 'Finalised') {
    ctype.owner = identity.address
  }
  return txStatus
}

function decode(encoded: QueryResult): IPublicIdentity['address'] | undefined {
  return encoded && encoded.encodedLength ? encoded.toString() : undefined
}

export async function getOwner(
  ctypeHash: ICType['hash']
): Promise<IPublicIdentity['address'] | undefined> {
  const blockchain = await getCached()
  const encoded: QueryResult = await blockchain.api.query.ctype.cTYPEs(
    ctypeHash
  )
  const queriedCTypeAccount: IPublicIdentity['address'] | undefined = decode(
    encoded
  )
  return queriedCTypeAccount
}
