/**
 * Blockchain Api Connection enables the building and accessing of the KILT [[Blockchain]] connection. In which it keeps one connection open and allows to reuse the connection for all [[Blockchain]] related tasks.
 * ***
 * Other modules can access the [[Blockchain]] as such: `const blockchain = await getCached()`.
 * @module BlockchainApiConnection
 * @preferred
 */

/**
 * Dummy comment needed for correct doc display, do not remove
 */
import { ApiPromise, WsProvider } from '@polkadot/api'
import { RegistryTypes } from '@polkadot/types/types'

import Blockchain, { IBlockchainApi } from '../blockchain/Blockchain'

export const DEFAULT_WS_ADDRESS = 'ws://127.0.0.1:9944'

let instance: Promise<IBlockchainApi>

const CUSTOM_TYPES: RegistryTypes = {
  DelegationNodeId: 'Hash',
  PublicSigningKey: 'Hash',
  PublicBoxKey: 'Hash',
  Permissions: 'u32',
  ErrorCode: 'u16',
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

export async function getCached(
  host: string = DEFAULT_WS_ADDRESS
): Promise<IBlockchainApi> {
  if (!instance) {
    instance = buildConnection(host)
  }
  return instance
}

export default getCached
