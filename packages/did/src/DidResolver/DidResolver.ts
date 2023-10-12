/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  DereferenceContentMetadata,
  DereferenceContentStream,
  DereferenceOptions,
  DereferenceResult,
  DidDocument,
  DidResolver,
  DidUri,
  DidUrl,
  FailedDereferenceMetadata,
  JsonLd,
  RepresentationResolutionResult,
  ResolutionDocumentMetadata,
  ResolutionOptions,
  ResolutionResult,
} from '@kiltprotocol/types'

import { ConfigService } from '@kiltprotocol/config'
import { cbor } from '@kiltprotocol/utils'

import { KILT_DID_CONTEXT_URL, W3C_DID_CONTEXT_URL } from './DidContexts.js'
import { linkedInfoFromChain } from '../Did.rpc.js'
import { toChain } from '../Did.chain.js'
import { getFullDidUri, parse, validateUri } from '../Did.utils.js'
import { parseDocumentFromLightDid } from '../DidDetails/LightDidDetails.js'
import { isValidVerificationRelationship } from '../DidDetails/DidDetails.js'

const DID_JSON = 'application/did+json'
const DID_JSON_LD = 'application/did+ld+json'
const DID_CBOR = 'application/did+cbor'

/**
 * Supported types for DID resolution and dereferencing.
 */
export type SupportedContentType =
  | typeof DID_JSON
  | typeof DID_JSON_LD
  | typeof DID_CBOR

function isValidContentType(input: unknown): input is SupportedContentType {
  return input === DID_JSON || input === DID_JSON_LD || input === DID_CBOR
}

type InternalResolutionResult = {
  document?: DidDocument
  documentMetadata: ResolutionDocumentMetadata
}

async function resolveInternal(
  did: DidUri
): Promise<InternalResolutionResult | null> {
  const { type } = parse(did)
  const api = ConfigService.get('api')

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
        canonicalId: getFullDidUri(did),
      },
      document: {
        ...lightDocument,
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
 * Implementation of `resolve` compliant with W3C DID specifications (https://www.w3.org/TR/did-core/#did-resolution).
 * Additionally, this function returns an id-only DID document in the case where a DID has been deleted or upgraded.
 * If a DID is invalid or has not been registered, this is indicated by the `error` property on the `didResolutionMetadata`.
 *
 * @param did The DID to resolve.
 * @param resolutionOptions The resolution options accepted by the `resolve` function as specified in the W3C DID specifications (https://www.w3.org/TR/did-core/#did-resolution).
 * @returns The resolution result for the `resolve` function as specified in the W3C DID specifications (https://www.w3.org/TR/did-core/#did-resolution).
 */
export async function resolve(
  did: DidUri,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  resolutionOptions: ResolutionOptions = {}
): Promise<ResolutionResult> {
  try {
    validateUri(did, 'Uri')
  } catch (error) {
    return {
      didResolutionMetadata: {
        error: 'invalidDid',
      },
      didDocumentMetadata: {},
    }
  }

  const resolutionResult = await resolveInternal(did)
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
 * Implementation of `resolveRepresentation` compliant with W3C DID specifications (https://www.w3.org/TR/did-core/#did-resolution).
 * Additionally, this function returns an id-only DID document in the case where a DID has been deleted or upgraded.
 * If a DID is invalid or has not been registered, this is indicated by the `error` property on the `didResolutionMetadata`.
 *
 * @param did The DID to resolve.
 * @param resolutionOptions The resolution options accepted by the `resolveRepresentation` function as specified in the W3C DID specifications (https://www.w3.org/TR/did-core/#did-resolution).
 * @param resolutionOptions.accept The content type accepted by the requesting client.
 * @returns The resolution result for the `resolveRepresentation` function as specified in the W3C DID specifications (https://www.w3.org/TR/did-core/#did-resolution).
 */
export async function resolveRepresentation(
  did: DidUri,
  { accept }: DereferenceOptions<SupportedContentType> = {
    accept: DID_JSON,
  }
): Promise<RepresentationResolutionResult<SupportedContentType>> {
  if (!isValidContentType(accept)) {
    return {
      didResolutionMetadata: {
        error: 'representationNotSupported',
      },
      didDocumentMetadata: {},
    }
  }

  const { didDocumentMetadata, didResolutionMetadata, didDocument } =
    await resolve(did)

  if (didDocument === undefined) {
    return {
      // Metadata is the same, since the `representationNotSupported` is already accounted for above.
      didResolutionMetadata,
      didDocumentMetadata,
    } as RepresentationResolutionResult<SupportedContentType>
  }

  const bufferInput = (() => {
    if (accept === 'application/did+json') {
      return JSON.stringify(didDocument)
    }
    if (accept === 'application/did+ld+json') {
      const jsonLdDoc: JsonLd<DidDocument> = {
        ...didDocument,
        '@context': [W3C_DID_CONTEXT_URL, KILT_DID_CONTEXT_URL],
      }
      return JSON.stringify(jsonLdDoc)
    }
    // contentType === 'application/did+cbor
    return cbor.encode(didDocument)
  })()

  return {
    didDocumentMetadata,
    didResolutionMetadata,
    didDocumentStream: Buffer.from(bufferInput),
  } as RepresentationResolutionResult<SupportedContentType>
}

type InternalDereferenceResult =
  | FailedDereferenceMetadata
  | {
      contentMetadata: DereferenceContentMetadata
      contentStream: DereferenceContentStream
    }

function isFailedDereferenceMetadata(
  input: InternalDereferenceResult
): input is FailedDereferenceMetadata {
  return (input as FailedDereferenceMetadata)?.error !== undefined
}

async function dereferenceInternal(
  didUrl: DidUri | DidUrl,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  dereferenceOptions: DereferenceOptions<SupportedContentType>
): Promise<InternalDereferenceResult> {
  const { did, queryParameters, fragment } = parse(didUrl)

  const { didDocument, didDocumentMetadata } = await resolve(did)

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
      ({ controller, id }) => controller === didDocument.id && id === fragment
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
    const service = didDocument?.service?.find((s) => s.id === fragment)
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
 * Implementation of `dereference` compliant with W3C DID specifications (https://www.w3.org/TR/did-core/#did-url-dereferencing).
 * If a DID URL is invalid or has not been registered, this is indicated by the `error` property on the `dereferencingMetadata`.
 *
 * @param didUrl The DID URL to dereference.
 * @param resolutionOptions The resolution options accepted by the `dereference` function as specified in the W3C DID specifications (https://www.w3.org/TR/did-core/#did-url-dereferencing).
 * @param resolutionOptions.accept The content type accepted by the requesting client.
 * @returns The resolution result for the `dereference` function as specified in the W3C DID specifications (https://www.w3.org/TR/did-core/#did-url-dereferencing).
 */
export async function dereference(
  didUrl: DidUri | DidUrl,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  { accept }: DereferenceOptions<SupportedContentType> = {
    accept: DID_JSON,
  }
): Promise<DereferenceResult<SupportedContentType>> {
  // The spec does not include an error for unsupported content types for dereferences
  const contentType = isValidContentType(accept) ? accept : DID_JSON

  try {
    validateUri(didUrl)
  } catch (error) {
    return {
      dereferencingMetadata: {
        error: 'invalidDidUrl',
      },
      contentMetadata: {},
    }
  }

  const dereferenceResult = await dereferenceInternal(didUrl, {
    accept: contentType,
  })

  if (isFailedDereferenceMetadata(dereferenceResult)) {
    return {
      contentMetadata: {},
      dereferencingMetadata: dereferenceResult,
    }
  }

  const stream = (() => {
    if (contentType === 'application/did+json') {
      return dereferenceResult.contentStream
    }
    if (contentType === 'application/did+ld+json') {
      return {
        ...dereferenceResult.contentStream,
        '@context': [W3C_DID_CONTEXT_URL, KILT_DID_CONTEXT_URL],
      }
    }
    // contentType === 'application/did+cbor'
    return Buffer.from(cbor.encode(dereferenceResult.contentStream))
  })()

  return {
    dereferencingMetadata: {
      contentType,
    },
    contentMetadata: dereferenceResult.contentMetadata,
    contentStream: stream,
  }
}

/**
 * Fully-fledged default resolver capable of resolving DIDs in their canonical form, encoded for a specific content type, and of dereferencing parts of a DID Document according to the dereferencing specification.
 */
export const resolver: DidResolver<SupportedContentType> = {
  resolve,
  resolveRepresentation,
  dereference,
}
