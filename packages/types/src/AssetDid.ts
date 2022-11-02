/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

export type ChainNamespace = string
export type ChainReference = string
export type ChainId = `${ChainNamespace}:${ChainReference}`

export type AssetNamespace = string
export type AssetReference = string
export type AssetInstance = string
export type AssetId =
  | `${AssetNamespace}:${AssetReference}`
  | `${AssetNamespace}:${AssetReference}:${AssetInstance}`

export type AssetDidUri = `did:asset:${ChainId}.${AssetId}`
