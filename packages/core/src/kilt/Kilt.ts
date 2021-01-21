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

import { configOpts, get, set } from '../config/ConfigService'
import Blockchain from '../blockchain/Blockchain'
import { clearCache, getCached } from '../blockchainApiConnection'

export function connect(host: string = get('address')): Promise<Blockchain> {
  return getCached(host)
}

export async function disconnect(host: string = get('address')): Promise<void> {
  const cached = await getCached(host)
  cached.api.disconnect()
  clearCache()
}

export function config<K extends Partial<configOpts>>(configs: K): void {
  set(configs)
}

export default {
  connect,
  disconnect,
  config,
}
