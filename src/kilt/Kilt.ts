/**
 * KILT's core functionalities are exposed via connecting to its blockchain.
 *
 * To connect to the blockchain:
 * ```Kilt.connect('ws://localhost:9944');```.
 *
 * @packageDocumentation
 * @module Kilt
 * @preferred
 */

import { IBlockchainApi } from '../blockchain/Blockchain'
import { clearCache, getCached } from '../blockchainApiConnection'

export function connect(host: string): Promise<IBlockchainApi> {
  return getCached(host)
}

export async function disconnect(host: string): Promise<void> {
  const cached = await getCached(host)
  cached.api.disconnect()
  clearCache()
}

export default {
  connect,
  disconnect,
}
