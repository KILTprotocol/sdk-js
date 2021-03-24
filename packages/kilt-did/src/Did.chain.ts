/**
 * @packageDocumentation
 * @module DID
 */

import type { Option } from '@polkadot/types'
import type { SubmittableExtrinsic } from '@kiltprotocol/types'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import {
  getIdentifierFromDid,
  IDidCreate,
  IDidKeyRemoval,
  IDidKeyUpdate,
} from './identity'

// placeholder for DID record
type IDidRecord = any

export async function queryById(didId: string): Promise<IDidRecord | null> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const result = await blockchain.api.query.did.dIDs<Option<IDidRecord>>(didId)
  // case a: no such did
  if (result.isNone) return null
  // case b: did exists
  const didRecord = result.unwrap()
  return {
    id: didId,
    keys: didRecord.keys.toJson(),
    serviceEndpoint: didRecord.serviceEndpoint.toString(),
    txIndex: didRecord.txIndex.toNumber(),
  }
}

export async function queryByDID(did: string): Promise<IDidRecord | null> {
  // we will have to extract the id part from the did string
  const didId = getIdentifierFromDid(did)
  return queryById(didId)
}

export async function create(
  createDid: IDidCreate
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  return blockchain.api.tx.did.add(createDid)
}

export async function updateKeys(
  keyUpdate: IDidKeyUpdate
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  return blockchain.api.tx.did.updateKeys(keyUpdate)
}

export async function removeKeys(
  keyRemoval: IDidKeyRemoval
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  return blockchain.api.tx.did.removeKeys(keyRemoval)
}
