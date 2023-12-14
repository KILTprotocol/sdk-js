/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  AssetDid,
  Caip19AssetId,
  Caip19AssetInstance,
  Caip19AssetNamespace,
  Caip19AssetReference,
  Caip2ChainId,
  Caip2ChainNamespace,
  Caip2ChainReference,
} from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'

// Matches AssetDIDs as per the {@link https://github.com/KILTprotocol/spec-asset-did | AssetDID specification}.
const ASSET_DID_REGEX =
  /^did:asset:(?<chainId>(?<chainNamespace>[-a-z0-9]{3,8}):(?<chainReference>[-a-zA-Z0-9]{1,32}))\.(?<assetId>(?<assetNamespace>[-a-z0-9]{3,8}):(?<assetReference>[-a-zA-Z0-9]{1,64})(:(?<assetInstance>[-a-zA-Z0-9]{1,78}))?)$/

type IAssetDidParsingResult = {
  did: AssetDid
  chainId: Caip2ChainId
  chainNamespace: Caip2ChainNamespace
  chainReference: Caip2ChainReference
  assetId: Caip19AssetId
  assetNamespace: Caip19AssetNamespace
  assetReference: Caip19AssetReference
  assetInstance?: Caip19AssetInstance
}

/**
 * Parses an AssetDID and returns the information contained within in a structured form.

 * @param assetDid An AssetDID as a string.
* @returns Object containing information extracted from the AssetDID.
 */
export function parse(assetDid: AssetDid): IAssetDidParsingResult {
  const matches = ASSET_DID_REGEX.exec(assetDid)?.groups
  if (!matches) {
    throw new SDKErrors.InvalidDidFormatError(assetDid)
  }

  const { chainId, assetId } = matches as Omit<IAssetDidParsingResult, 'did'>

  return {
    ...(matches as Omit<IAssetDidParsingResult, 'did'>),
    did: `did:asset:${chainId}.${assetId}`,
  }
}

/**
 * Checks that a string (or other input) is a valid AssetDID.
 * Throws otherwise.
 *
 * @param input Arbitrary input.
 */
export function validateDid(input: unknown): void {
  if (typeof input !== 'string') {
    throw new TypeError(`Asset DID string expected, got ${typeof input}`)
  }

  parse(input as AssetDid)
}
