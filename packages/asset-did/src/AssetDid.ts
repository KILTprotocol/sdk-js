/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  AssetDidUri,
  Caip19AssetId,
  Caip19AssetInstance,
  Caip19AssetNamespace,
  Caip19AssetReference,
  Caip2ChainId,
  Caip2ChainNamespace,
  Caip2ChainReference,
} from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'

// Matches AssetDIDs as per the [AssetDID specification](https://github.com/KILTprotocol/spec-asset-did).
const ASSET_DID_REGEX =
  /^did:asset:(?<chainId>(?<chainNamespace>[-a-z0-9]{3,8}):(?<chainReference>[-a-zA-Z0-9]{1,32}))\.(?<assetId>(?<assetNamespace>[-a-z0-9]{3,8}):(?<assetReference>[-a-zA-Z0-9]{1,64})(:(?<assetInstance>[-a-zA-Z0-9]{1,78}))?)$/

type IAssetDidParsingResult = {
  uri: AssetDidUri
  chainId: Caip2ChainId
  chainNamespace: Caip2ChainNamespace
  chainReference: Caip2ChainReference
  assetId: Caip19AssetId
  assetNamespace: Caip19AssetNamespace
  assetReference: Caip19AssetReference
  assetInstance?: Caip19AssetInstance
}

/**
 * Parses an AssetDID uri and returns the information contained within in a structured form.

 * @param assetDidUri An AssetDID uri as a string.
* @returns Object containing information extracted from the AssetDID uri.
 */
export function parse(assetDidUri: AssetDidUri): IAssetDidParsingResult {
  const matches = ASSET_DID_REGEX.exec(assetDidUri)?.groups
  if (!matches) {
    throw new SDKErrors.InvalidDidFormatError(assetDidUri)
  }

  const { chainId, assetId } = matches as Omit<IAssetDidParsingResult, 'uri'>

  return {
    ...(matches as Omit<IAssetDidParsingResult, 'uri'>),
    uri: `did:asset:${chainId}.${assetId}`,
  }
}

/**
 * Checks that a string (or other input) is a valid AssetDID uri.
 * Throws otherwise.
 *
 * @param input Arbitrary input.
 */
export function validateUri(input: unknown): void {
  if (typeof input !== 'string') {
    throw new TypeError(`Asset DID string expected, got ${typeof input}`)
  }

  parse(input as AssetDidUri)
}
