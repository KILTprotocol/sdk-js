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
import Blockchain from '../blockchain/Blockchain'
import { clearCache, getCached } from '../blockchainApiConnection'

export function connect(
  host: string = ConfigService.get('address')
): Promise<Blockchain> {
  return getCached(host)
}

export async function disconnect(
  host: string = ConfigService.get('address')
): Promise<void> {
  const cached = await getCached(host)
  cached.api.disconnect()
  clearCache()
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
