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
import { cryptoWaitReady } from '@polkadot/util-crypto'
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

/**
 * Prepares crypto modules (required e.g. For identity creation) and calls Kilt.config().
 *
 * @param configs Arguments to pass on to Kilt.config().
 * @returns Promise that must be awaited to assure crypto is ready.
 */
export async function init<K extends Partial<ConfigService.configOpts>>(
  configs?: K
): Promise<void> {
  config(configs || {})
  await cryptoWaitReady()
}

export default {
  connect,
  disconnect,
  config,
  init,
}
