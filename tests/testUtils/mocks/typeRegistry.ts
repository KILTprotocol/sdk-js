/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

// This module is not part of the public-facing api.
/* eslint-disable jsdoc/require-jsdoc */

import { ApiPromise, WsProvider } from '@polkadot/api'
import { Metadata, TypeRegistry } from '@polkadot/types'

import { types } from '@kiltprotocol/type-definitions'
import type { HexString } from '@kiltprotocol/types'

import metaStatic from '../metadata/spiritnet.js'

// adapted from https://github.com/polkadot-js/apps/blob/master/packages/test-support/src/api/createAugmentedApi.ts
export type StaticMetadata =
  | Uint8Array
  | HexString
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
    types,
    registry,
  })

  api.injectMetadata(metadata, true)

  return api
}
