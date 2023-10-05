/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { ConfigService } from '@kiltprotocol/config'
import { DidDocumentV2, DidResolverV2 } from '@kiltprotocol/types'
import { cbor } from '@kiltprotocol/utils'
import { linkedInfoFromChain } from '../Did.rpc'
import { toChain } from '../Did2.chain.js'
import {
  didKeyToVerificationMethod,
  getFullDidUri,
  parse,
  validateUri,
} from '../Did2.utils.js'
import { addVerificationMethod } from '../DidDetailsv2/DidDetailsV2.js'
import { parseDocumentFromLightDid } from '../DidDetailsv2/LightDidDetailsV2.js'
import { KILT_DID_CONTEXT_URL, W3C_DID_CONTEXT_URL } from './DidContextsV2.js'

const DID_JSON = 'application/did+json'
const DID_JSON_LD = 'application/did+ld+json'
const DID_CBOR = 'application/did+cbor'

export type SupportedContentType =
  | typeof DID_JSON
  | typeof DID_JSON_LD
  | typeof DID_CBOR

function isValidContentType(input: unknown): input is SupportedContentType {
  return input === DID_JSON || input === DID_JSON_LD || input === DID_CBOR
}

type InternalResolutionResult = {
  document?: DidDocumentV2.DidDocument
  documentMetadata: DidResolverV2.ResolutionDocumentMetadata
}

async function resolveInternal(
  did: DidDocumentV2.DidUri
): Promise<InternalResolutionResult | null> {
  const { type } = parse(did)
  const api = ConfigService.get('api')

  const { document, web3Name } = await api.call.did
    .query(toChain(did))
    .then(linkedInfoFromChain)
    .catch(() => ({ document: undefined, web3Name: undefined }))

  if (type === 'full' && document !== undefined) {
    const newDidDocument: DidDocumentV2.DidDocument = {
      id: did,
      authentication: [document.authentication[0].id],
      verificationMethod: [
        didKeyToVerificationMethod(did, document.authentication[0].id, {
          publicKey: document.authentication[0].publicKey,
          keyType: document.authentication[0].type,
        }),
      ],
      service: document.service,
    }
    if (
      document.keyAgreement !== undefined &&
      document.keyAgreement.length > 0
    ) {
      document.keyAgreement.forEach(({ id, type: keyType, publicKey }) => {
        addVerificationMethod(
          newDidDocument,
          didKeyToVerificationMethod(newDidDocument.id, id, {
            keyType,
            publicKey,
          }),
          'keyAgreement'
        )
      })
    }
    if (document.assertionMethod !== undefined) {
      const { id, publicKey, type: keyType } = document.assertionMethod[0]
      addVerificationMethod(
        newDidDocument,
        didKeyToVerificationMethod(newDidDocument.id, id, {
          keyType,
          publicKey,
        }),
        'assertionMethod'
      )
    }
    if (document.capabilityDelegation !== undefined) {
      const { id, publicKey, type: keyType } = document.capabilityDelegation[0]
      addVerificationMethod(
        newDidDocument,
        didKeyToVerificationMethod(newDidDocument.id, id, {
          keyType,
          publicKey,
        }),
        'capabilityDelegation'
      )
    }
    if (web3Name !== undefined) {
      newDidDocument.alsoKnownAs = [web3Name]
    }

    return {
      document: newDidDocument,
      documentMetadata: {},
    }
  }

  const isFullDidDeleted = (await api.query.did.didBlacklist(toChain(did)))
    .isSome
  if (isFullDidDeleted) {
    return {
      // No canonicalId and no details are returned as we consider this DID deactivated/deleted.
      documentMetadata: {
        deactivated: true,
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
    }
  }

  // If no full DID details nor deletion info is found, the light DID is un-migrated.
  // Metadata will simply contain `deactivated: false`.
  return {
    document: lightDocument,
    documentMetadata: {},
  }
}

export async function resolve(
  did: DidDocumentV2.DidUri,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  resolutionOptions: DidResolverV2.ResolutionOptions = {}
): Promise<DidResolverV2.ResolutionResult> {
  try {
    validateUri(did, 'Did')
  } catch (error) {
    return {
      didResolutionMetadata: {
        error: 'invalidDid',
      },
      didDocumentMetadata: {},
    }
  }

  const resolutionResult = await resolveInternal(did)
  if (!resolutionResult) {
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

export async function resolveRepresentation(
  did: DidDocumentV2.DidUri,
  { accept }: DidResolverV2.DereferenceOptions<SupportedContentType> = {
    accept: DID_JSON,
  }
): Promise<DidResolverV2.RepresentationResolutionResult<SupportedContentType>> {
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
    } as DidResolverV2.RepresentationResolutionResult<SupportedContentType>
  }

  const bufferInput = (() => {
    if (accept === 'application/did+json') {
      return JSON.stringify(didDocument)
    }
    if (accept === 'application/did+ld+json') {
      const jsonLdDoc: DidDocumentV2.JsonLd<DidDocumentV2.DidDocument> = {
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
  } as DidResolverV2.RepresentationResolutionResult<SupportedContentType>
}

type InternalDereferenceResult = {
  contentStream?: DidResolverV2.DereferenceContentStream
  contentMetadata: DidResolverV2.DereferenceContentMetadata
}

async function dereferenceInternal(
  didUrl: DidDocumentV2.DidUri | DidDocumentV2.DidResourceUri,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  dereferenceOptions: DidResolverV2.DereferenceOptions<SupportedContentType>
): Promise<InternalDereferenceResult> {
  const { did, fragment } = parse(didUrl)

  const { didDocument, didDocumentMetadata } = await resolve(did)

  if (fragment === undefined) {
    return {
      contentStream: didDocument,
      contentMetadata: didDocumentMetadata,
    }
  }
  const dereferencedResource = (() => {
    const verificationMethod = didDocument?.verificationMethod.find(
      (m) => m.id === fragment
    )
    if (verificationMethod !== undefined) {
      return verificationMethod
    }

    const service = didDocument?.service?.find((s) => s.id === fragment)
    return service
  })()

  return {
    contentStream: dereferencedResource,
    contentMetadata: {},
  }
}

export async function dereference(
  didUrl: DidDocumentV2.DidUri | DidDocumentV2.DidResourceUri,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  { accept }: DidResolverV2.DereferenceOptions<SupportedContentType> = {
    accept: DID_JSON,
  }
): Promise<DidResolverV2.DereferenceResult<SupportedContentType>> {
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

  const resolutionResult = await dereferenceInternal(didUrl, {
    accept: contentType,
  })

  const { contentMetadata, contentStream } = resolutionResult

  if (contentStream === undefined) {
    return {
      dereferencingMetadata: {
        error: 'notFound',
      },
      contentMetadata,
    }
  }

  const stream = (() => {
    if (contentType === 'application/did+json') {
      return contentStream
    }
    if (contentType === 'application/did+ld+json') {
      return {
        ...contentStream,
        '@context': [W3C_DID_CONTEXT_URL, KILT_DID_CONTEXT_URL],
      }
    }
    // contentType === 'application/did+cbor'
    return Buffer.from(cbor.encode(contentStream))
  })()

  return {
    dereferencingMetadata: {
      contentType,
    },
    contentMetadata,
    contentStream: stream,
  }
}

export const resolver: DidResolverV2.DidResolver<SupportedContentType> = {
  resolve,
  resolveRepresentation,
  dereference,
}
