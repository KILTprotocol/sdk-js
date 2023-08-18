/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

// @ts-expect-error not a typescript module
import jsonld from 'jsonld' // cjs module

import {
  DID_CONTEXTS,
  KILT_DID_CONTEXT_URL,
  parse,
  resolveCompliant,
  W3C_DID_CONTEXT_URL,
} from '@kiltprotocol/did'
import type {
  ConformingDidDocument,
  ConformingDidKey,
  Did,
  ICType,
} from '@kiltprotocol/types'

import { validationContexts } from './context/index.js'
import { Sr25519VerificationKey2020 } from './suites/Sr25519VerificationKey.js'
import { newCachingCTypeLoader } from '../KiltCredentialV1.js'

export type JsonLdObj = Record<string, unknown>
export interface RemoteDocument {
  contextUrl?: string
  documentUrl: string
  document: JsonLdObj
}
export type DocumentLoader = (url: string) => Promise<RemoteDocument>

/**
 * Combines multiple document loaders into one.
 * The resulting loader resolves if any loader returns a result, and rejects otherwise.
 *
 * @param loaders An array of document loaders to be combined.
 * @returns A composite document loader wrapping the input loaders.
 */
export function combineDocumentLoaders(
  loaders: DocumentLoader[]
): DocumentLoader {
  const wrappedLoaders = loaders.map((i) => async (url: string) => {
    const response = await i(url)
    if (typeof response.document !== 'object') {
      throw new Error('no document in response')
    }
    return response
  })
  return async (url: string) => {
    // essentially re-implements Promise.any, which does not exist in node 14
    return new Promise((resolve, reject) => {
      Promise.allSettled(wrappedLoaders.map((i) => i(url).then(resolve))).then(
        (results) => {
          const errors = results
            .filter((i) => i.status === 'rejected')
            .map((i) => (i as PromiseRejectedResult).reason)
          reject(
            new Error(
              `${url} could not be resolved by any of the available document loaders`,
              { cause: errors }
            )
          )
        }
      )
    })
  }
}

export const kiltContextsLoader: DocumentLoader = async (url) => {
  const context = validationContexts[url] ?? DID_CONTEXTS[url]
  if (context !== undefined)
    return { contextUrl: undefined, documentUrl: url, document: context }
  throw new Error(`not a known Kilt context: ${url}`)
}

export const kiltDidLoader: DocumentLoader = async (url) => {
  const { did } = parse(url as Did)
  const { didDocument, didResolutionMetadata } = await resolveCompliant(did)
  if (didResolutionMetadata.error) {
    throw new Error(
      `${didResolutionMetadata.error}:${didResolutionMetadata.errorMessage}`
    )
  }
  // Framing can help us resolve to the requested resource (did or did uri). This way we return either a key or the full DID document, depending on what was requested.
  const document = (await jsonld.frame(
    didDocument ?? {},
    {
      // add did contexts to make sure we get a compacted representation
      '@context': [W3C_DID_CONTEXT_URL, KILT_DID_CONTEXT_URL],
      // the resource's id, which is what gives us the right resource
      '@id': url,
    },
    {
      // transform any relative URIs to absolute ones so that the processor is able to work with them
      base: did,
      documentLoader: kiltContextsLoader,
      expandContext: {
        '@context': [W3C_DID_CONTEXT_URL, KILT_DID_CONTEXT_URL],
      },
      // forced because 'base' is not defined in the types we're using; these are for v1.5 bc no more recent types exist
    } as jsonld.Options.Frame
  )) as ConformingDidDocument | ConformingDidKey
  // The signature suites expect key-related json-LD contexts; we add them here
  switch ((document as { type: string }).type) {
    // these 4 are currently used
    case Sr25519VerificationKey2020.suite:
      document['@context'].push(Sr25519VerificationKey2020.SUITE_CONTEXT)
      break
    case 'Ed25519VerificationKey2018':
      document['@context'].push(
        'https://w3id.org/security/suites/ed25519-2018/v1'
      )
      break
    case 'EcdsaSecp256k1VerificationKey2019':
      document['@context'].push('https://w3id.org/security/v1')
      break
    case 'X25519KeyAgreementKey2019':
      document['@context'].push(
        'https://w3id.org/security/suites/x25519-2019/v1'
      )
      break
    default:
      break
  }
  return { contextUrl: undefined, documentUrl: url, document }
}

const loader = newCachingCTypeLoader()
export const kiltCTypeLoader: DocumentLoader = async (id) => {
  const document = (await loader(id as ICType['$id'])) as JsonLdObj & ICType
  return { contextUrl: undefined, documentUrl: id, document }
}

/**
 * Document loader that provides access to the JSON-LD contexts required for verifying Kilt VCs.
 * Essentially wraps the vc-js defaultDocumentLoader, but additionally loads KILTs [[validationContexts]] & [[DID_CONTEXTS]].
 *
 * @param url Document/context URL to resolve.
 * @returns An object containing the resolution result.
 */
export const defaultDocumentLoader: DocumentLoader = combineDocumentLoaders([
  kiltContextsLoader,
  kiltDidLoader,
  kiltCTypeLoader,
])
