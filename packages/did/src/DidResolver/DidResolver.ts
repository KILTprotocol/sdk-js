/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ApiPromise } from '@polkadot/api'
import { stringToU8a } from '@polkadot/util'

import type {
  DereferenceContentMetadata,
  DereferenceContentStream,
  DereferenceOptions,
  DereferenceResult,
  Did,
  DidDocument,
  DidResolver,
  DidUrl,
  FailedDereferenceMetadata,
  JsonLd,
  RepresentationResolutionResult,
  ResolutionDocumentMetadata,
  ResolutionOptions,
  ResolutionResult,
} from '@kiltprotocol/types'
import { cbor } from '@kiltprotocol/utils'

import { toChain } from '../Did.chain.js'
import { linkedInfoFromChain } from '../Did.rpc.js'
import { getFullDid, parse, validateDid } from '../Did.utils.js'
import { isValidVerificationRelationship } from '../DidDetails/DidDetails.js'
import { parseDocumentFromLightDid } from '../DidDetails/LightDidDetails.js'
import { KILT_DID_CONTEXT_URL, W3C_DID_CONTEXT_URL } from './DidContexts.js'

export const DID_JSON_CONTENT_TYPE = 'application/did+json'
export const DID_JSON_LD_CONTENT_TYPE = 'application/did+ld+json'
export const DID_CBOR_CONTENT_TYPE = 'application/did+cbor'

/**
 * Supported content types for DID resolution and dereferencing.
 */
export type SupportedContentType =
  | typeof DID_JSON_CONTENT_TYPE
  | typeof DID_JSON_LD_CONTENT_TYPE
  | typeof DID_CBOR_CONTENT_TYPE

function isValidContentType(input: unknown): input is SupportedContentType {
  return (
    input === DID_JSON_CONTENT_TYPE ||
    input === DID_JSON_LD_CONTENT_TYPE ||
    input === DID_CBOR_CONTENT_TYPE
  )
}

type InternalResolutionResult = {
  document?: DidDocument
  documentMetadata: ResolutionDocumentMetadata
}

async function resolveInternal(
  did: Did,
  api: ApiPromise
): Promise<InternalResolutionResult | null> {
  const { type } = parse(did)

  const { document } = await api.call.did
    .query(toChain(did))
    .then(linkedInfoFromChain)
    .catch(() => ({ document: undefined }))

  if (type === 'full' && document !== undefined) {
    return {
      document,
      documentMetadata: {},
    }
  }

  const isFullDidDeleted = (await api.query.did.didBlacklist(toChain(did)))
    .isSome
  if (isFullDidDeleted) {
    return {
      // No canonicalId is returned as we consider this DID deactivated/deleted.
      documentMetadata: {
        deactivated: true,
      },
      document: {
        id: did,
      },
    }
  }

  if (type === 'full') {
    return null
  }

  const lightDocument = parseDocumentFromLightDid(did, false)
  // If a full DID with same subject is present, return the resolution metadata accordingly.
  if (document !== undefined) {
    return {
      documentMetadata: {
        canonicalId: getFullDid(did),
      },
      document: {
        id: lightDocument.id,
      },
    }
  }

  // If no full DID details nor deletion info is found, the light DID is un-migrated.
  return {
    document: lightDocument,
    documentMetadata: {},
  }
}

/**
 * Type guard checking whether the provided input is a {@link FailedDereferenceMetadata}.
 *
 * @param input The input to check.
 * @returns Whether the input is a {@link FailedDereferenceMetadata}.
 */
export function isFailedDereferenceMetadata(
  input: unknown
): input is FailedDereferenceMetadata {
  return (input as FailedDereferenceMetadata)?.error !== undefined
}

/**
 * Implementation of `resolve` compliant with {@link https://www.w3.org/TR/did-core/#did-resolution | W3C DID specifications }.
 * Additionally, this function returns an id-only DID document in the case where a DID has been deleted or upgraded.
 * If a DID is invalid or has not been registered, this is indicated by the `error` property on the `didResolutionMetadata`.
 *
 * @param did The DID to resolve.
 * @param resolutionOptions The resolution options accepted by the `resolve` function as specified in the {@link https://www.w3.org/TR/did-core/#did-resolution | W3C DID specifications }.
 * @returns The resolution result for the `resolve` function as specified in the {@link https://www.w3.org/TR/did-core/#did-resolution | W3C DID specifications }.
 */
export async function resolve(
  did: Did,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  resolutionOptions: ResolutionOptions = {},
  api: ApiPromise
): Promise<ResolutionResult> {
  try {
    validateDid(did, 'Did')
  } catch (error) {
    return {
      didResolutionMetadata: {
        error: 'invalidDid',
      },
      didDocumentMetadata: {},
    }
  }

  const resolutionResult = await resolveInternal(did, api)
  if (resolutionResult === null) {
    return {
      didResolutionMetadata: {
        error: 'notFound',
      },
      didDocumentMetadata: {},
    }
  }

  const { documentMetadata: didDocumentMetadata, document: didDocument } =
    resolutionResult

  return {
    didResolutionMetadata: {},
    didDocumentMetadata,
    didDocument,
  }
}

/**
 * Implementation of `resolveRepresentation` compliant with {@link https://www.w3.org/TR/did-core/#did-resolution | W3C DID specifications }.
 * Additionally, this function returns an id-only DID document in the case where a DID has been deleted or upgraded.
 * If a DID is invalid or has not been registered, this is indicated by the `error` property on the `didResolutionMetadata`.
 *
 * @param did The DID to resolve.
 * @param resolutionOptions The resolution options accepted by the `resolveRepresentation` function as specified in the {@link https://www.w3.org/TR/did-core/#did-resolution | W3C DID specifications }.
 * @param resolutionOptions.accept The content type accepted by the requesting client.
 * @returns The resolution result for the `resolveRepresentation` function as specified in the {@link https://www.w3.org/TR/did-core/#did-resolution | W3C DID specifications }.
 */
async function resolveRepresentation(
  did: Did,
  {
    accept = DID_JSON_CONTENT_TYPE,
  }: DereferenceOptions<SupportedContentType> = {},
  api: ApiPromise
): Promise<RepresentationResolutionResult<SupportedContentType>> {
  const inputTransform = (() => {
    switch (accept) {
      case 'application/did+json': {
        return (didDoc: DidDocument) => stringToU8a(JSON.stringify(didDoc))
      }
      case 'application/did+ld+json': {
        return (didDoc: DidDocument) => {
          const jsonLdDoc: JsonLd<DidDocument> = {
            ...didDoc,
            '@context': [W3C_DID_CONTEXT_URL, KILT_DID_CONTEXT_URL],
          }
          return stringToU8a(JSON.stringify(jsonLdDoc))
        }
      }
      case 'application/did+cbor': {
        return (didDoc: DidDocument) => Uint8Array.from(cbor.encode(didDoc))
      }
      default: {
        return null
      }
    }
  })()
  if (inputTransform === null) {
    return {
      didResolutionMetadata: {
        error: 'representationNotSupported',
      },
      didDocumentMetadata: {},
    }
  }

  const { didDocumentMetadata, didResolutionMetadata, didDocument } =
    await resolve(did, {}, api)

  if (didDocument === undefined) {
    return {
      // Metadata is the same, since the `representationNotSupported` is already accounted for above.
      didResolutionMetadata,
      didDocumentMetadata,
    } as RepresentationResolutionResult<SupportedContentType>
  }

  return {
    didDocumentMetadata,
    didResolutionMetadata: {
      ...didResolutionMetadata,
      contentType: accept,
    },
    didDocumentStream: inputTransform(didDocument),
  } as RepresentationResolutionResult<SupportedContentType>
}

type InternalDereferenceResult =
  | FailedDereferenceMetadata
  | {
      contentMetadata: DereferenceContentMetadata
      contentStream: DereferenceContentStream
    }

async function dereferenceInternal(
  didUrl: Did | DidUrl,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  dereferenceOptions: DereferenceOptions<SupportedContentType>,
  api: ApiPromise
): Promise<InternalDereferenceResult> {
  const { did, queryParameters, fragment } = parse(didUrl)

  const { didDocument, didDocumentMetadata } = await resolve(did, {}, api)

  if (didDocument === undefined) {
    return {
      error: 'notFound',
    }
  }

  if (fragment === undefined) {
    return {
      contentMetadata: didDocumentMetadata,
      contentStream: didDocument,
    }
  }

  const [dereferencedResource, dereferencingError] = (() => {
    const verificationMethod = didDocument?.verificationMethod?.find(
      ({ controller, id }) =>
        controller === didDocument.id && id.endsWith(fragment)
    )

    if (verificationMethod !== undefined) {
      const requiredVerificationRelationship =
        queryParameters?.requiredVerificationRelationship

      // If a verification method is found and no filter is applied, return the retrieved verification method.
      if (requiredVerificationRelationship === undefined) {
        return [verificationMethod, null]
      }
      // If a verification method is found and the applied filter is invalid, return the dereferencing error.
      if (!isValidVerificationRelationship(requiredVerificationRelationship)) {
        return [
          null,
          {
            error: 'invalidVerificationRelationship',
          } as FailedDereferenceMetadata,
        ]
      }
      // If a verification method is found and it matches the applied filter, return the retrieved verification method.
      if (
        didDocument[requiredVerificationRelationship]?.includes(
          verificationMethod.id
        )
      ) {
        return [verificationMethod, null]
      }
      // Finally, if the above condition fails and the verification method does not pass the applied filter, the `notFound` error is returned.
      return [
        null,
        {
          error: 'notFound',
        } as FailedDereferenceMetadata,
      ]
    }

    // If no verification method is found, try to retrieve a service with the provided ID, ignoring any query parameters.
    const service = didDocument?.service?.find((s) => s.id.endsWith(fragment))
    if (service === undefined) {
      return [
        null,
        {
          error: 'notFound',
        } as FailedDereferenceMetadata,
      ]
    }
    return [service, null]
  })()

  if (dereferencingError !== null) {
    return dereferencingError
  }

  return {
    contentStream: dereferencedResource,
    contentMetadata: {},
  }
}

/**
 * Implementation of `dereference` compliant with {@link https://www.w3.org/TR/did-core/#did-url-dereferencing  | W3C DID specifications }.
 * If a DID URL is invalid or has not been registered, this is indicated by the `error` property on the `dereferencingMetadata`.
 *
 * @param didUrl The DID URL to dereference.
 * @param resolutionOptions The resolution options accepted by the `dereference` function as specified in the {@link https://www.w3.org/TR/did-core/#did-url-dereferencing  | W3C DID specifications }.
 * @param resolutionOptions.accept The content type accepted by the requesting client.
 * @returns The resolution result for the `dereference` function as specified in the {@link https://www.w3.org/TR/did-core/#did-url-dereferencing  | W3C DID specifications }.
 */
async function dereference(
  didUrl: Did | DidUrl,
  {
    accept = DID_JSON_CONTENT_TYPE,
  }: DereferenceOptions<SupportedContentType> = {},
  api: ApiPromise
): Promise<DereferenceResult<SupportedContentType>> {
  // The spec does not include an error for unsupported content types for dereferences
  const contentType = isValidContentType(accept)
    ? accept
    : DID_JSON_CONTENT_TYPE

  try {
    validateDid(didUrl)
  } catch (error) {
    return {
      dereferencingMetadata: {
        error: 'invalidDidUrl',
      },
      contentMetadata: {},
    }
  }

  const dereferenceResult = await dereferenceInternal(
    didUrl,
    {
      accept: contentType,
    },
    api
  )

  if (isFailedDereferenceMetadata(dereferenceResult)) {
    return {
      contentMetadata: {},
      dereferencingMetadata: dereferenceResult,
    }
  }

  const [stream, contentTypeValue] = (() => {
    const s = dereferenceResult.contentStream as any
    // Stream is a not DID Document, ignore the `contentType`.
    if (s.type !== undefined) {
      return [dereferenceResult.contentStream, DID_JSON_CONTENT_TYPE]
    }
    if (contentType === 'application/did+json') {
      return [dereferenceResult.contentStream, contentType]
    }
    if (contentType === 'application/did+ld+json') {
      return [
        {
          ...dereferenceResult.contentStream,
          '@context': [W3C_DID_CONTEXT_URL, KILT_DID_CONTEXT_URL],
        },
        contentType,
      ]
    }
    // contentType === 'application/did+cbor'
    return [
      Uint8Array.from(cbor.encode(dereferenceResult.contentStream)),
      contentType,
    ]
  })()

  return {
    dereferencingMetadata: {
      contentType: contentTypeValue as SupportedContentType,
    },
    contentMetadata: dereferenceResult.contentMetadata,
    contentStream: stream,
  }
}

/**
 * Fully-fledged default resolver capable of resolving DIDs in their canonical form, encoded for a specific content type, and of dereferencing parts of a DID Document according to the dereferencing specification.
 */
export function DidResolver({
  api,
}: {
  api: ApiPromise
}): DidResolver<SupportedContentType> {
  return {
    resolve: (did, opts) => resolve(did, opts, api),
    resolveRepresentation: (did, opts) => resolveRepresentation(did, opts, api),
    dereference: (didUrl, opts) => dereference(didUrl, opts, api),
  }
}
