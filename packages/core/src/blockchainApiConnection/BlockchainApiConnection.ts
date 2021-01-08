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
import Blockchain from '../blockchain/Blockchain'
import MASHNET_TYPES from './types/mashnet'
import PARACHAIN_TYPES from './types/parachain'

export const DEFAULT_WS_ADDRESS =
  process.env.DEFAULT_WS_ADDRESS || 'ws://127.0.0.1:9977'

let instance: Promise<Blockchain> | null

export async function buildConnection(
  host: string = DEFAULT_WS_ADDRESS,
  parachain = false
): Promise<Blockchain> {
  const types = {
    ...MASHNET_TYPES,
    ...(parachain ? PARACHAIN_TYPES : {}),
  }

  const provider = new WsProvider(host)
  const api: ApiPromise = await ApiPromise.create({
    provider,
    types,
  })
  return new Blockchain(api)
}

export async function getCached(
  host: string = DEFAULT_WS_ADDRESS,
  parachain = false
): Promise<Blockchain> {
  if (!instance) {
    instance = buildConnection(host, parachain)
  }
  return instance
}

export function clearCache(): void {
  instance = null
}

export default getCached
