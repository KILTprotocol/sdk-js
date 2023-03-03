/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import vcjs from '@digitalbazaar/vc'
import jsigs from 'jsonld-signatures'
import jsonld from 'jsonld'
import * as Did from '@kiltprotocol/did'
import { DidUri } from '@kiltprotocol/types'
import {
  DID_CONTEXTS,
  KILT_DID_CONTEXT_URL,
  W3C_DID_CONTEXT_URL,
} from '@kiltprotocol/did'
import { validationContexts } from './context/index.js'

interface DocumentLoader extends jsigs.DocumentLoader {
  (
    url: string,
    documentLoader: jsigs.DocumentLoader
  ): ReturnType<jsigs.DocumentLoader>
}
/**
 * @param loaders
 */
export function combineDocumentLoaders(
  loaders: DocumentLoader[]
): jsigs.DocumentLoader {
  let thisLoader: jsigs.DocumentLoader
  const wrappedLoaders = loaders.map((i) => async (url: string) => {
    const response = await i(url, thisLoader)
    if (typeof response.document !== 'object') {
      throw new Error('no document in response')
    }
    return response
  })
  thisLoader = async (url: string) => {
    return Promise.any(wrappedLoaders.map((i) => i(url))).catch((e) => {
      throw new Error(
        `${url} could not be resolved by any of the available document loaders`,
        { cause: e.errors }
      )
    })
  }
  return thisLoader
}

export const kiltContextsLoader: jsigs.DocumentLoader = async (url) => {
  const context = validationContexts[url] ?? DID_CONTEXTS[url]
  if (context !== undefined)
    return { contextUrl: undefined, documentUrl: url, document: context }
  throw new Error(`not a known Kilt context: ${url}`)
}

export const kiltDidLoader: DocumentLoader = async (
  url,
  documentLoader: jsigs.DocumentLoader = kiltContextsLoader
) => {
  const { did } = Did.parse(url as DidUri)
  const { didDocument, didResolutionMetadata } = await Did.resolveCompliant(did)
  if (didResolutionMetadata.error) {
    throw new Error(
      `${didResolutionMetadata.error}:${didResolutionMetadata.errorMessage}`
    )
  }
  // Framing can help us resolve to the requested resource (did or did uri). This way we return either a key or the full DID document, depending on what was requested.
  // Also converts relative URIs into absolute ones; many implementations can't work with the former.
  const document = await jsonld.frame(
    didDocument ?? {},
    {
      // add did contexts to make sure we get a compacted representation
      '@context': [W3C_DID_CONTEXT_URL, KILT_DID_CONTEXT_URL],
      // the resource's id, which is what gives us the right resource
      '@id': url,
    },
    {
      // this is required so that the processor is able to work with the relative URIs used in verification relationships
      base: did,
      documentLoader,
      expandContext: {
        '@context': [W3C_DID_CONTEXT_URL, KILT_DID_CONTEXT_URL],
      },
      // forced because 'base' is not defined in the types we're using; these are for v1.5 bc no more recent types exist
    } as jsonld.Options.Frame
  )
  return { contextUrl: undefined, documentUrl: url, document }
}

/**
 * Document loader that provides access to the JSON-LD contexts required for verifying Kilt VCs.
 * Essentially wraps the vc-js defaultDocumentLoader, but additionally loads KILTs [[validationContexts]] & [[DID_CONTEXTS]].
 *
 * @param url Document/context URL to resolve.
 * @returns An object containing the resolution result.
 */
export const documentLoader: jsigs.DocumentLoader = combineDocumentLoaders([
  vcjs.defaultDocumentLoader,
  kiltContextsLoader,
])
