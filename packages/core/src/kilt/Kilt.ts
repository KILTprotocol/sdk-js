/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * KILT's core functionalities are exposed via connecting to its blockchain.
 *
 * To connect to the blockchain:
 * ```Kilt.connect('ws://localhost:9944');```.
 */

import { cryptoWaitReady } from '@polkadot/util-crypto'
import { ApiPromise, WsProvider } from '@polkadot/api'

import { ConfigService } from '@kiltprotocol/config'

/**
 * Connects to the KILT Blockchain using the api instance set with `init()`.
 *
 * @returns An instance of ApiPromise.
 */
export async function connect(wsEndpoint: string): Promise<ApiPromise> {
  const provider = new WsProvider(wsEndpoint)
  const api = await ApiPromise.create({
    provider,
  })
  await init({ api })
  return api.isReadyOrError
}

/**
 * Allows setting global configuration such as the log level and the polkadot ApiPromise instance used throughout the sdk.
 *
 * @param configs Config options object.
 */
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

/**
 * Disconnects the cached connection and clears the cache.
 *
 * @returns If there was a cached and connected connection, or not.
 */
export async function disconnect(): Promise<boolean> {
  if (!ConfigService.isSet('api')) return false
  const api = ConfigService.get('api')
  ConfigService.unset('api')
  await api.disconnect()
  return true
}
