/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  DidDocument,
  DidResolutionResult,
  DidResourceUri,
  DidUri,
  ResolvedDidKey,
  ResolvedDidServiceEndpoint,
} from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'
import { ConfigService } from '@kiltprotocol/config'

import * as Did from '../index.js'
import {
  serviceEndpointFromChain,
  didToChain,
  resourceIdToChain,
  didFromChain,
} from '../Did.chain.js'
import { getFullDidUri, parseDidUri } from '../Did.utils.js'

/**
 * Resolve a DID URI to the DID document and its metadata.
 *
 * The URI can also identify a key or a service, but it will be ignored during resolution.
 *
 * @param did The subject's DID.
 * @returns The details associated with the DID subject.
 */
export async function resolve(
  did: DidUri
): Promise<DidResolutionResult | null> {
  const { type } = parseDidUri(did)
  const fullDidUri = getFullDidUri(did)
  const api = ConfigService.get('api')

  switch (type) {
    case 'full': {
      const document = await Did.query(fullDidUri)
      // If the document is found, return it.
      if (document) {
        return {
          document,
          metadata: {
            deactivated: false,
          },
        }
      }
      // If not, check whether the DID has been deleted or simply does not exist.
      const isDeactivated = !(
        await api.query.did.didBlacklist.hash(didToChain(did))
      ).isEmpty

      if (isDeactivated) {
        return {
          metadata: {
            deactivated: true,
          },
        }
      }
      return null
    }
    case 'light': {
      let document: DidDocument
      try {
        document = Did.parseDocumentFromLightDid(did, false)
      } catch (cause) {
        throw new SDKErrors.InvalidDidFormatError(did, {
          cause: cause as Error,
        })
      }

      const fullDid = await api.query.did.did(didToChain(did))
      // If a full DID with same subject is present, return the resolution metadata accordingly.
      if (fullDid.isSome) {
        return {
          document,
          metadata: {
            canonicalId: fullDidUri,
            deactivated: false,
          },
        }
      }
      // If no full DID document is found but the full DID has been deleted, return the info in the resolution metadata.
      const isFullDidDeleted = !(
        await api.query.did.didBlacklist.hash(didToChain(did))
      ).isEmpty
      if (isFullDidDeleted) {
        return {
          // No canonicalId and no document are returned as we consider this DID deactivated/deleted.
          metadata: {
            deactivated: true,
          },
        }
      }
      // If no full DID document nor deletion info is found, the light DID is un-migrated.
      // Metadata will simply contain `deactivated: false`.
      return {
        document,
        metadata: {
          deactivated: false,
        },
      }
    }
    default:
      throw new SDKErrors.UnsupportedDidError(did)
  }
}

/**
 * Resolve a DID key URI to the key details.
 *
 * @param didUri The DID key URI.
 * @returns The details associated with the key.
 */
export async function resolveKey(
  didUri: DidResourceUri
): Promise<ResolvedDidKey | null> {
  const { did, fragment: keyId, type } = parseDidUri(didUri)

  // A fragment (keyId) IS expected to resolve a key.
  if (!keyId) {
    throw new SDKErrors.InvalidDidFormatError(didUri)
  }
  const api = ConfigService.get('api')

  switch (type) {
    case 'full': {
      const encoded = await api.query.did.did(didToChain(didUri))
      const key = encoded.isSome && Did.getKey(didFromChain(encoded), keyId)
      if (key === undefined || key === false) {
        return null
      }
      const { includedAt } = key
      return {
        controller: did,
        id: didUri,
        publicKey: key.publicKey,
        type: key.type,
        ...(includedAt !== undefined && { includedAt }),
      }
    }
    case 'light': {
      const resolvedDetails = await resolve(didUri)
      if (resolvedDetails === null) {
        throw new SDKErrors.InvalidDidFormatError(didUri)
      }
      if (resolvedDetails.document === undefined) {
        return null
      }
      const key = Did.getKey(resolvedDetails.document, keyId)
      if (!key) {
        return null
      }
      return {
        controller: did,
        id: didUri,
        publicKey: key.publicKey,
        type: key.type,
      }
    }
    default:
      throw new SDKErrors.UnsupportedDidError(didUri)
  }
}

/**
 * Resolve a DID service URI to the service details.
 *
 * @param serviceUri The DID service URI.
 * @returns The details associated with the service endpoint.
 */
export async function resolveServiceEndpoint(
  serviceUri: DidResourceUri
): Promise<ResolvedDidServiceEndpoint | null> {
  const { fragment: serviceId, type, did } = parseDidUri(serviceUri)

  // A fragment (serviceId) IS expected to resolve a service endpoint.
  if (!serviceId) {
    throw new SDKErrors.InvalidDidFormatError(serviceUri)
  }
  const api = ConfigService.get('api')

  switch (type) {
    case 'full': {
      const encoded = await api.query.did.serviceEndpoints(
        didToChain(serviceUri),
        resourceIdToChain(serviceId)
      )
      if (encoded.isNone) {
        return null
      }
      const serviceEndpoint = serviceEndpointFromChain(encoded.unwrap())
      return {
        id: serviceUri,
        type: serviceEndpoint.type,
        serviceEndpoint: serviceEndpoint.serviceEndpoint,
      }
    }
    case 'light': {
      const resolvedDetails = await resolve(did)
      if (resolvedDetails === null) {
        throw new SDKErrors.InvalidDidFormatError(serviceUri)
      }
      if (resolvedDetails.document === undefined) {
        return null
      }
      const serviceEndpoint = Did.getEndpoint(
        resolvedDetails.document,
        serviceId
      )
      if (!serviceEndpoint) {
        return null
      }
      return {
        id: serviceUri,
        type: serviceEndpoint.type,
        serviceEndpoint: serviceEndpoint.serviceEndpoint,
      }
    }
    default:
      throw new SDKErrors.UnsupportedDidError(did)
  }
}
