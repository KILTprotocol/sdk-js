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

import { LogLevel } from 'typescript-logging'
import { setConfiguration } from '../config/ConfigService'
import Blockchain from '../blockchain/Blockchain'
import { clearCache, getCached } from '../blockchainApiConnection'

export function connect(host: string): Promise<Blockchain> {
  return getCached(host)
}

export async function disconnect(host: string): Promise<void> {
  const cached = await getCached(host)
  cached.api.disconnect()
  clearCache()
}

export function config(configuration: {
  host?: string
  logLevel?: LogLevel
}): void {
  const { host, logLevel } = configuration
  setConfiguration(host, logLevel)
}

export default {
  connect,
  disconnect,
  config,
}
