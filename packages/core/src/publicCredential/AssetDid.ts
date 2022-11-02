/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  AssetDidUri,
  AssetId,
  AssetInstance,
  AssetNamespace,
  AssetReference,
  ChainId,
  ChainNamespace,
  ChainReference,
} from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'

const ASSET_DID_REGEX =
  /^did:asset:(?<chainId>(?<chainNamespace>[-a-z0-9]{3,8}):(?<chainReference>[-a-zA-Z0-9]{1,32}))\.(?<assetId>(?<assetNamespace>[-a-z0-9]{3,8}):(?<assetReference>[-a-zA-Z0-9]{1,64})(:(?<assetInstance>[-a-zA-Z0-9]{1,78}))?)$/

type IAssetDidParsingResult = {
  uri: AssetDidUri
  chainId: ChainId
  chainNamespace: ChainNamespace
  chainReference: ChainReference
  assetId: AssetId
  assetNamespace: AssetNamespace
  assetReference: AssetReference
  assetInstance?: AssetInstance
}

/**
 * @param assetDidUri
 */
export function parse(assetDidUri: AssetDidUri): IAssetDidParsingResult {
  const matches = ASSET_DID_REGEX.exec(assetDidUri)?.groups
  if (!matches) {
    throw new SDKErrors.InvalidDidFormatError(assetDidUri)
  }

  const {
    chainId,
    chainNamespace,
    chainReference,
    assetId,
    assetNamespace,
    assetReference,
    assetInstance,
  } = matches
  // A valid AssetDID must have both a chain ID and an asset ID.
  if (!chainId || !assetId) {
    throw new SDKErrors.InvalidDidFormatError(assetDidUri)
  }
  const castedChainId = chainId as ChainId
  const castedAssetId = assetId as ChainId

  return {
    chainId: castedChainId,
    chainNamespace,
    chainReference,
    assetId: castedAssetId,
    assetNamespace,
    assetReference,
    assetInstance,
    uri: `did:asset:${castedChainId}.${castedAssetId}`,
  }
}

/**
 * @param input
 */
export function validateUri(input: unknown): void {
  if (typeof input !== 'string') {
    throw new TypeError(`Asset DID string expected, got ${typeof input}`)
  }

  parse(input as AssetDidUri)
}
