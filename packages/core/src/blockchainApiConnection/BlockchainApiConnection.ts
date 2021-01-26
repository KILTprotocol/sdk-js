/**
 * Blockchain Api Connection enables the building and accessing of the KILT [[Blockchain]] connection. In which it keeps one connection open and allows to reuse the connection for all [[Blockchain]] related tasks.
 *
 * Other modules can access the [[Blockchain]] as such: `const blockchain = await getCached()`.
 *
 * @packageDocumentation
 * @module BlockchainApiConnection
 * @preferred
 */

import { ApiPromise, WsProvider } from '@polkadot/api'
import { RegistryTypes } from '@polkadot/types/types'
import Blockchain from '../blockchain/Blockchain'

export const DEFAULT_WS_ADDRESS =
  process.env.DEFAULT_WS_ADDRESS || 'ws://127.0.0.1:9944'

let instance: Promise<Blockchain> | null

export const CUSTOM_TYPES: RegistryTypes = {
  DelegationNodeId: 'Hash',
  PublicSigningKey: 'Hash',
  PublicBoxKey: 'Hash',
  Permissions: 'u32',
  ErrorCode: 'u16',
  Signature: 'MultiSignature',
  Address: 'AccountId',
  LookupSource: 'Address',
  BlockNumber: 'u64',
  Index: 'u64',
  RefCount: 'u32',
  AccountIndex: 'u32',
  Hash: 'H256',
}

export async function buildConnection(
  host: string = DEFAULT_WS_ADDRESS
): Promise<Blockchain> {
  const provider = new WsProvider(host)
  const api: ApiPromise = await ApiPromise.create({
    provider,
    types: CUSTOM_TYPES,
  })
  return new Blockchain(api)
}

export async function getCached(
  host: string = DEFAULT_WS_ADDRESS
): Promise<Blockchain> {
  if (!instance) {
    instance = buildConnection(host)
  }
  return instance
}

export function clearCache(): void {
  instance = null
}

export default getCached
