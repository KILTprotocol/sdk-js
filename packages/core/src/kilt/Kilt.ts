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
import { typesBundle } from '@kiltprotocol/type-definitions'

/**
 * Prepares crypto modules (required for identity creation and others) and calls ConfigService.set().
 *
 * @param configs Arguments to pass on to ConfigService.set().
 * @returns Promise that must be awaited to assure crypto is ready.
 */
export async function init<K extends Partial<ConfigService.configOpts>>(
  configs?: K
): Promise<void> {
  ConfigService.set(configs || {})
  await cryptoWaitReady()
}

/**
 * Connects to the KILT Blockchain and passes the initialized api instance to `init()`, making it available for functions in the sdk.
 *
 * @param blockchainRpcWsUrl WebSocket URL of the RPC endpoint exposed by a node that is part of the Kilt blockchain network you wish to connect to.
 * @returns An instance of ApiPromise.
 */
export async function connect(blockchainRpcWsUrl: string): Promise<ApiPromise> {
  const provider = new WsProvider(blockchainRpcWsUrl)
  const api = await ApiPromise.create({
    provider,
    typesBundle,
  })
  await init({ api })
  return api.isReadyOrError
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
