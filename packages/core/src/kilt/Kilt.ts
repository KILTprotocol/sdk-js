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

import { ConfigService } from '@kiltprotocol/config'
import { blockchainApiConnection, Chain } from '@kiltprotocol/chain-helpers'

export function connect(
  host: string = ConfigService.get('address')
): Promise<Chain.Blockchain> {
  return blockchainApiConnection.getCached(host)
}

export async function disconnect(
  host: string = ConfigService.get('address')
): Promise<void> {
  const cached = await blockchainApiConnection.getCached(host)
  cached.api.disconnect()
  blockchainApiConnection.clearCache()
}

export function config<K extends Partial<ConfigService.configOpts>>(
  configs: K
): void {
  ConfigService.set(configs)
}

export default {
  connect,
  disconnect,
  config,
}
