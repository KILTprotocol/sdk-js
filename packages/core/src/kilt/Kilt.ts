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
import {
  BlockchainApiConnection,
  Blockchain,
} from '@kiltprotocol/chain-helpers'

export function connect(): Promise<Blockchain> {
  return BlockchainApiConnection.getConnectionOrConnect()
}

export function config<K extends Partial<ConfigService.configOpts>>(
  configs: K
): void {
  ConfigService.set(configs)
}

export const { disconnect } = BlockchainApiConnection

export default {
  connect,
  disconnect,
  config,
}
