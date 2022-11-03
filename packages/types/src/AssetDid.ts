/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * A string containing a chain namespace as per the [AssetDID specification](https://github.com/KILTprotocol/spec-asset-did).
 */
export type ChainNamespace = string
/**
 * A string containing a chain reference as per the [AssetDID specification](https://github.com/KILTprotocol/spec-asset-did).
 */
export type ChainReference = string
/**
 * A string containing a chain ID as per the [AssetDID specification](https://github.com/KILTprotocol/spec-asset-did).
 */
export type ChainId = `${ChainNamespace}:${ChainReference}`

/**
 * A string containing an asset namespace as per the [AssetDID specification](https://github.com/KILTprotocol/spec-asset-did).
 */
export type AssetNamespace = string
/**
 * A string containing an asset namespace as per the [AssetDID specification](https://github.com/KILTprotocol/spec-asset-did).
 */
export type AssetReference = string
/**
 * A string containing an asset instance as per the [AssetDID specification](https://github.com/KILTprotocol/spec-asset-did).
 */
export type AssetInstance = string
/**
 * A string containing an asset ID as per the [AssetDID specification](https://github.com/KILTprotocol/spec-asset-did).
 */
export type AssetId =
  | `${AssetNamespace}:${AssetReference}`
  | `${AssetNamespace}:${AssetReference}:${AssetInstance}`

/**
 * A string containing an AssetDID as per the [AssetDID specification](https://github.com/KILTprotocol/spec-asset-did).
 */
export type AssetDidUri = `did:asset:${ChainId}.${AssetId}`
