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

import { configuration, configOpts } from '../config/ConfigService'
import Blockchain from '../blockchain/Blockchain'
import { clearCache, getCached } from '../blockchainApiConnection'

export function connect(
  host: string = configuration.host
): Promise<Blockchain> {
  return getCached(host)
}

export async function disconnect(
  host: string = configuration.host
): Promise<void> {
  const cached = await getCached(host)
  cached.api.disconnect()
  clearCache()
}

export function config(configs: Partial<configOpts>): void {
  const { address, logLevel } = configs
  if (address) configuration.host = address
  if (logLevel) configuration.logging = logLevel
}

export default {
  connect,
  disconnect,
  config,
}
