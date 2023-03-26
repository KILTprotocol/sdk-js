/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { AssetDidDocument } from '@kiltprotocol/types'

import { ASSET_DID_CONTEXT_URL, W3C_DID_CONTEXT_URL } from '@kiltprotocol/did'

import { ResolvedAssetDid } from './Resolver.js'

/**
 * Export a [[ResolvedAssetDid]] to a W3C-spec conforming DID Document in the format provided.
 *
 * @param did The [[ResolvedAssetDid]].
 * @param mimeType The format for the output DID Document. Accepted values are `application/json` and `application/ld+json`.
 * @returns The DID Document formatted according to the mime type provided, or an error if the format specified is not supported.
 */
export function exportToDidDocument(
  did: ResolvedAssetDid,
  mimeType: 'application/json' | 'application/ld+json'
): AssetDidDocument {
  const {
    uri,
    chainNamespace,
    chainReference,
    assetNamespace,
    assetReference,
    assetInstance,
  } = did
  const didDocument: AssetDidDocument = {
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
  if (mimeType === 'application/ld+json') {
    didDocument['@context'] = [W3C_DID_CONTEXT_URL, ASSET_DID_CONTEXT_URL]
  }

  return didDocument
}
