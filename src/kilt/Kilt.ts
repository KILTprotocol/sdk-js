/**
 * KILT's core functionalities are exposed via connecting to its blockchain.
 * ***
 * To connect to the blockchain:
 * ```Kilt.connect('ws://localhost:9944');```
 * @module Kilt
 */

/**
 * Dummy comment needed for correct doc display, do not remove
 */
import { getCached, clearCache } from '../blockchainApiConnection'
import { IBlockchainApi } from '../blockchain/Blockchain'

export function connect(host: string): Promise<IBlockchainApi> {
  return getCached(host)
}

export async function disconnect(host: string): Promise<void> {
  const cached = await getCached(host)
  await cached.api.disconnect()
  clearCache()
}

export default {
  connect,
  disconnect,
}
