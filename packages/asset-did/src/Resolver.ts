/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  AssetDidDocument,
  AssetDidResolutionDocumentMetadata,
  AssetDidResolutionMetadata,
  AssetDidUri,
  Caip19AssetId,
  Caip19AssetInstance,
  Caip19AssetNamespace,
  Caip19AssetReference,
  Caip2ChainId,
  Caip2ChainNamespace,
  Caip2ChainReference,
  ConformingAssetDidResolutionResult,
} from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'

export type ResolvedAssetDid = {
  uri: AssetDidUri
  chainId: Caip2ChainId
  chainNamespace: Caip2ChainNamespace
  chainReference: Caip2ChainReference
  assetId: Caip19AssetId
  assetNamespace: Caip19AssetNamespace
  assetReference: Caip19AssetReference
  assetInstance?: Caip19AssetInstance
}

// Matches AssetDIDs as per the [AssetDID specification](https://github.com/KILTprotocol/spec-asset-did).
const ASSET_DID_REGEX =
  /^did:asset:(?<chainId>(?<chainNamespace>[-a-z0-9]{3,8}):(?<chainReference>[-a-zA-Z0-9]{1,32}))\.(?<assetId>(?<assetNamespace>[-a-z0-9]{3,8}):(?<assetReference>[-a-zA-Z0-9]{1,64})(:(?<assetInstance>[-a-zA-Z0-9]{1,78}))?)$/

/**
 * Parses an AssetDID URI and returns the information contained within in a structured form.

 * @param assetDidUri An AssetDID uri as a string.
 * @returns Object containing information extracted from the AssetDID uri.
 */
export function resolve(assetDidUri: AssetDidUri): ResolvedAssetDid {
  const matches = ASSET_DID_REGEX.exec(assetDidUri)?.groups
  if (!matches) {
    throw new SDKErrors.InvalidDidFormatError(assetDidUri)
  }

  const { chainId, assetId } = matches as Omit<ResolvedAssetDid, 'uri'>

  return {
    ...(matches as Omit<ResolvedAssetDid, 'uri'>),
    uri: `did:asset:${chainId}.${assetId}`,
  }
}

/**
 * Implementation of `resolve` compliant with AssetDID specification (https://github.com/KILTprotocol/spec-asset-did).
 * As opposed to `resolve`, which takes a more pragmatic approach, the returned object is fully compliant with the AssetDID specification.
 *
 * @param assetDidUri The DID to resolve.
 * @returns An object with the properties `didDocument` (a spec-conforming DID document or `undefined`), `didDocumentMetadata` (equivalent to `metadata` returned by [[resolve]]), as well as `didResolutionMetadata` (indicating an `error` if any).
 */
export function resolveCompliant(
  assetDidUri: AssetDidUri
): ConformingAssetDidResolutionResult {
  // No canonicalId support as of now
  const didDocumentMetadata: AssetDidResolutionDocumentMetadata = {}
  const didResolutionMetadata: AssetDidResolutionMetadata = {}
  let didDocument: AssetDidDocument | undefined

  try {
    const {
      uri,
      chainNamespace,
      chainReference,
      assetNamespace,
      assetReference,
      assetInstance,
    } = resolve(assetDidUri)

    didDocument = {
      id: uri,
      chain: {
        namespace: chainNamespace,
        reference: chainReference,
      },
      asset: {
        namespace: assetNamespace,
        reference: assetReference,
        identifier: assetInstance,
      },
    }
  } catch (e) {
    didResolutionMetadata.error = 'invalidDid'
    if (e instanceof Error) {
      didResolutionMetadata.errorMessage = e.message
    }
  }

  return {
    didDocumentMetadata,
    didResolutionMetadata,
    didDocument,
  }
}
