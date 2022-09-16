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
  didToChain,
  resourceIdToChain,
  serviceEndpointFromChain,
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
  const api = ConfigService.get('api')

  const document = await Did.query(getFullDidUri(did))
  if (type === 'full' && document) {
    return {
      document,
      metadata: {
        deactivated: false,
      },
    }
  }

  // If the full DID has been deleted (or the light DID was upgraded and deleted),
  // return the info in the resolution metadata.
  const isFullDidDeleted = (await api.query.did.didBlacklist(didToChain(did)))
    .isSome
  if (isFullDidDeleted) {
    return {
      // No canonicalId and no details are returned as we consider this DID deactivated/deleted.
      metadata: {
        deactivated: true,
      },
    }
  }

  if (type === 'full') {
    return null
  }

  const lightDocument = Did.parseDocumentFromLightDid(did, false)
  // If a full DID with same subject is present, return the resolution metadata accordingly.
  if (document) {
    return {
      metadata: {
        canonicalId: getFullDidUri(did),
        deactivated: false,
      },
    }
  }

  // If no full DID details nor deletion info is found, the light DID is un-migrated.
  // Metadata will simply contain `deactivated: false`.
  return {
    document: lightDocument,
    metadata: {
      deactivated: false,
    },
  }
}

type CompliantDidResolutionResult = Omit<DidResolutionResult, 'document'> & {
  document?: DidDocument | { uri: DidUri }
}

/**
 * Resolve a DID URI to the DID document and its metadata.
 * This alternative to `resolve()` behaves closer to the DID specification
 * when it resolves a light DID that has been upgraded to a full DID.
 * In this case `strictResolve()` will return a `document` that only contains `uri`,
 * while `resolve()` takes a more practical approach and does not return `document`.
 *
 * The URI can also identify a key or a service, but it will be ignored during resolution.
 *
 * @param did The subject's DID.
 * @returns The details associated with the DID subject.
 */
export async function strictResolve(
  did: DidUri
): Promise<CompliantDidResolutionResult | null> {
  const resolved = await resolve(did)

  if (!resolved?.metadata.canonicalId) {
    return resolved
  }

  return {
    document: {
      uri: did,
    },
    metadata: resolved.metadata,
  }
}

/**
 * Resolve a DID key URI to the key details.
 *
 * @param keyUri The DID key URI.
 * @returns The details associated with the key.
 */
export async function resolveKey(
  keyUri: DidResourceUri
): Promise<ResolvedDidKey | null> {
  const { did, fragment: keyId } = parseDidUri(keyUri)

  // A fragment (keyId) IS expected to resolve a key.
  if (!keyId) {
    throw new SDKErrors.InvalidDidFormatError(keyUri)
  }

  const resolved = await resolve(did)
  if (!resolved) {
    return null
  }

  const {
    document,
    metadata: { canonicalId },
  } = resolved

  // If the light DID has been upgraded we consider the old key URI invalid, the full DID URI should be used instead.
  if (canonicalId) {
    return null
  }
  if (!document) {
    return null
  }

  const key = Did.getKey(document, keyId)
  if (!key) {
    return null
  }

  const { includedAt } = key
  return {
    controller: did,
    id: `${did}${keyId}`,
    publicKey: key.publicKey,
    type: key.type,
    ...(includedAt && { includedAt }),
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
  const { fragment: serviceId, did, type } = parseDidUri(serviceUri)

  // A fragment (serviceId) IS expected to resolve a service endpoint.
  if (!serviceId) {
    throw new SDKErrors.InvalidDidFormatError(serviceUri)
  }
  const api = ConfigService.get('api')

  if (type === 'full') {
    const encoded = await api.query.did.serviceEndpoints(
      didToChain(serviceUri),
      resourceIdToChain(serviceId)
    )
    if (encoded.isNone) {
      return null
    }
    const serviceEndpoint = serviceEndpointFromChain(encoded)
    return {
      ...serviceEndpoint,
      id: serviceUri,
    }
  }

  const resolved = await resolve(did)
  if (!resolved) {
    return null
  }

  const {
    document,
    metadata: { canonicalId },
  } = resolved

  // If the light DID has been upgraded we consider the old key URI invalid, the full DID URI should be used instead.
  if (canonicalId) {
    return null
  }
  if (!document) {
    return null
  }

  const endpoint = Did.getEndpoint(document, serviceId)
  if (!endpoint) {
    return null
  }

  return {
    ...endpoint,
    id: `${did}${serviceId}`,
  }
}
