/**
 * @module BlockchainApiConnection
 *
 *  --- Overview ---
 *  Enables building and accessing the blockchain connection.
 *
 *  --- Usage ---
 * Other modules can access the blockchain as such: `const blockchain = await getCached()`.
 */

import { ApiPromise, WsProvider } from '@polkadot/api'
import { RegistryTypes } from '@polkadot/types/types'

import Blockchain, { IBlockchainApi } from '../blockchain/Blockchain'

export const DEFAULT_WS_ADDRESS = 'ws://127.0.0.1:9944'

export let instance: Promise<IBlockchainApi>

const CUSTOM_TYPES: RegistryTypes = {
  DelegationNodeId: 'Hash',
  PublicSigningKey: 'Hash',
  PublicBoxKey: 'Hash',
  Permissions: 'u32',
  ErrorCode: 'u16',
}

export async function getCached(
  host: string = DEFAULT_WS_ADDRESS
): Promise<IBlockchainApi> {
  if (!instance) {
    instance = buildConnection(host)
  }
  return instance
}

export async function buildConnection(
  host: string = DEFAULT_WS_ADDRESS
): Promise<IBlockchainApi> {
  const provider = new WsProvider(host)
  const api: ApiPromise = await ApiPromise.create({
    provider,
    types: CUSTOM_TYPES,
  })
  return new Blockchain(api)
}

export default getCached
