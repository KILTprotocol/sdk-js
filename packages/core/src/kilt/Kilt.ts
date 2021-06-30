/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * KILT's core functionalities are exposed via connecting to its blockchain.
 *
 * To connect to the blockchain:
 * ```Kilt.connect('ws://localhost:9944');```.
 *
 * @packageDocumentation
 * @module Kilt
 */

import { ConfigService } from '@kiltprotocol/config'
import {
  BlockchainApiConnection,
  Blockchain,
} from '@kiltprotocol/chain-helpers'
import { Identity } from '../identity'

export function connect(): Promise<Blockchain> {
  return BlockchainApiConnection.getConnectionOrConnect()
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
  await Identity.cryptoWaitReady()
}
export const { disconnect } = BlockchainApiConnection

export default {
  connect,
  disconnect,
  config,
  init,
}
