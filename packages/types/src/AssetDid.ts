/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * A string containing a chain namespace as per the {@link https://github.com/KILTprotocol/spec-asset-did | AssetDID specification}.
 */
export type Caip2ChainNamespace = string
/**
 * A string containing a chain reference as per the {@link https://github.com/KILTprotocol/spec-asset-did | AssetDID specification}.
 */
export type Caip2ChainReference = string
/**
 * A string containing a chain ID as per the {@link https://github.com/KILTprotocol/spec-asset-did | AssetDID specification}.
 */
export type Caip2ChainId = `${Caip2ChainNamespace}:${Caip2ChainReference}`

/**
 * A string containing an asset namespace as per the {@link https://github.com/KILTprotocol/spec-asset-did | AssetDID specification}.
 */
export type Caip19AssetNamespace = string
/**
 * A string containing an asset namespace as per the {@link https://github.com/KILTprotocol/spec-asset-did | AssetDID specification}.
 */
export type Caip19AssetReference = string
/**
 * A string containing an asset instance as per the {@link https://github.com/KILTprotocol/spec-asset-did | AssetDID specification}.
 */
export type Caip19AssetInstance = string
/**
 * A string containing an asset ID as per the {@link https://github.com/KILTprotocol/spec-asset-did | AssetDID specification}.
 */
export type Caip19AssetId =
  | `${Caip19AssetNamespace}:${Caip19AssetReference}`
  | `${Caip19AssetNamespace}:${Caip19AssetReference}:${Caip19AssetInstance}`

/**
 * A string containing an AssetDID as per the {@link https://github.com/KILTprotocol/spec-asset-did | AssetDID specification}.
 */
export type AssetDid = `did:asset:${Caip2ChainId}.${Caip19AssetId}`
