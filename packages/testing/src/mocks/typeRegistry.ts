/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { ApiPromise, WsProvider } from '@polkadot/api'
import { Metadata, TypeRegistry, unwrapStorageType } from '@polkadot/types'
import type { QueryableStorageEntry } from '@polkadot/api/types'
import type { Codec } from '@polkadot/types/types'

import metaStatic from './metadata/spiritnet.json'

// adapted from https://github.com/polkadot-js/apps/blob/master/packages/test-support/src/api/createAugmentedApi.ts
export type StaticMetadata =
  | Uint8Array
  | string
  | Map<string, unknown>
  | Record<string, unknown>

export function createRegistryFromMetadata(
  meta: StaticMetadata = metaStatic
): TypeRegistry {
  const registry = new TypeRegistry()
  const metadata = new Metadata(registry, meta)

  registry.setMetadata(metadata)
  return registry
}

export function createAugmentedApi(
  meta: StaticMetadata = metaStatic
): ApiPromise {
  const registry = new TypeRegistry()
  const metadata = new Metadata(registry, meta)

  registry.setMetadata(metadata)

  const api = new ApiPromise({
    provider: new WsProvider('ws://', false),
    registry,
  })

  api.injectMetadata(metadata, true)

  return api
}

export function getQueryTypeFactory<T extends Codec = Codec>(
  query: QueryableStorageEntry<any>,
  inOption = true
): (value: unknown) => T {
  const { registry, type } = query.creator.meta
  const storageType = unwrapStorageType(registry, type, inOption)
  return (v) => {
    return registry.createType(storageType, v) as T
  }
}

export function buildQueryMock(
  api: ApiPromise,
  jest: any,
  queryPaths: Array<[string, unknown] | string>
): any {
  const query = {}
  queryPaths.forEach((args) => {
    let queryPath: string
    let returnValue: unknown
    if (Array.isArray(args)) {
      ;[queryPath, returnValue] = args
    } else {
      queryPath = args
    }
    const [module, method] = queryPath.split('.')
    if (!module || !method) {
      throw new Error('query paths must be strings like module.method')
    }
    const returnTypeFactory = getQueryTypeFactory(
      api.query[module][method],
      true
    )
    const mockFunction = jest.fn()
    mockFunction.mockResolvedValue(returnTypeFactory(returnValue))
    // eslint-disable-next-line no-underscore-dangle
    mockFunction._typeFactory = returnTypeFactory
    if (!query[module]) {
      query[module] = {}
    }
    query[module][method] = mockFunction
  })
  return { query }
}
