/**
 * @packageDocumentation
 * @ignore
 */

import { SubmittableExtrinsic } from '@polkadot/api/promise/types'

import { SubmittableResult } from '@polkadot/api'
import { getCached } from '../blockchainApiConnection'
import { IDid } from './Did'
import {
  getAddressFromIdentifier,
  getIdentifierFromAddress,
  decodeDid,
} from './Did.utils'
import Identity from '../identity/Identity'
import IPublicIdentity from '../types/PublicIdentity'

export async function queryByIdentifier(
  identifier: IDid['identifier']
): Promise<IDid | null> {
  const blockchain = await getCached()
  const address = getAddressFromIdentifier(identifier)
  const decoded = decodeDid(
    identifier,
    await blockchain.api.query.did.dIDs(address)
  )
  return decoded
}

export async function queryByAddress(
  address: IPublicIdentity['address']
): Promise<IDid | null> {
  const blockchain = await getCached()
  const identifier = getIdentifierFromAddress(address)
  const decoded = decodeDid(
    identifier,
    await blockchain.api.query.did.dIDs(address)
  )
  return decoded
}

export async function remove(identity: Identity): Promise<SubmittableResult> {
  const blockchain = await getCached()
  const tx: SubmittableExtrinsic = blockchain.api.tx.did.remove()
  return blockchain.submitTx(identity, tx)
}

export async function store(
  did: IDid,
  identity: Identity
): Promise<SubmittableResult> {
  const blockchain = await getCached()
  const tx: SubmittableExtrinsic = blockchain.api.tx.did.add(
    did.publicBoxKey,
    did.publicSigningKey,
    did.documentStore
  )
  return blockchain.submitTx(identity, tx)
}
