/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * Blockchain Api Connection enables the building and accessing of the KILT ApiPromise connection. In which it keeps one connection open and allows to reuse the connection for all ApiPromise related tasks.
 *
 * Other modules can access the ApiPromise as such: `const api = await getConnectionOrConnect()`.
 *
 * @packageDocumentation
 */

import { ApiPromise, WsProvider } from '@polkadot/api'
import { ConfigService } from '@kiltprotocol/config'

let instance: Promise<ApiPromise> | null

/**
 * Builds a new blockchain connection instance.
 *
 * @param host Optional host address. Otherwise taken from the ConfigService.
 * @returns A new blockchain connection instance.
 */
export async function buildConnection(
  host: string = ConfigService.get('address')
): Promise<ApiPromise> {
  const provider = new WsProvider(host)
  return ApiPromise.create({
    provider,
  })
}

/**
 * Allows caching of a self-built connection instance.
 * This will be automatically used by all chain functions.
 *
 * For advanced use-cases only.
 *
 * @param connectionInstance The Blockchain instance, which should be cached.
 */
export function setConnection(connectionInstance: Promise<ApiPromise>): void {
  instance = connectionInstance
}

/**
 * Gets the cached blockchain connection instance.
 *
 * @returns Cached blockchain connection.
 */
export function getConnection(): Promise<ApiPromise> | null {
  return instance
}

/**
 * Gets the cached blockchain connection, or builds a new one, if non-existent.
 *
 * @returns The cached or newly built blockchain connection instance.
 */
export async function getConnectionOrConnect(): Promise<ApiPromise> {
  if (!instance) {
    instance = buildConnection()
  }
  return instance
}

/**
 * Clears the cached blockchain connection instance.
 * This does NOT disconnect automatically beforehand!
 */
export function clearCache(): void {
  instance = null
}

/**
 * Check, if the cached blockchain connection is connected.
 *
 * @returns If there is a cached connection and it is currently connected.
 */
export async function connected(): Promise<boolean> {
  if (!instance) return false
  const resolved = await instance
  return resolved.isConnected
}

/**
 * Disconnects the cached connection and clears the cache.
 *
 * @returns If there was a cached and connected connection, or not.
 */
export async function disconnect(): Promise<boolean> {
  const oldInstance = instance
  clearCache()

  if (!oldInstance) return false

  const resolved = await oldInstance
  const { isConnected } = resolved
  await resolved.disconnect()

  return isConnected
}
