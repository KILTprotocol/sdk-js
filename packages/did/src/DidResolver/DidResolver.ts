/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  DidDetails,
  DidResolvedDetails,
  DidResourceUri,
  DidUri,
  ResolvedDidKey,
  ResolvedDidServiceEndpoint,
} from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'

import * as Did from '../index.js'
import {
  queryDidDeletionStatus,
  decodeServiceEndpoint,
  encodeDid,
  encodeResourceId,
  decodeDid,
} from '../Did.chain.js'
import { getFullDidUri, parseDidUri } from '../Did.utils.js'

/**
 * Resolve a DID URI to the details of the DID subject.
 *
 * The URI can also identify a key or a service, but it will be ignored during resolution.
 *
 * @param did The subject's DID.
 * @returns The details associated with the DID subject.
 */
export async function resolve(did: DidUri): Promise<DidResolvedDetails | null> {
  const { type } = parseDidUri(did)
  const fullDidUri = getFullDidUri(did)
  const api = await BlockchainApiConnection.getConnectionOrConnect()

  switch (type) {
    case 'full': {
      const details = await Did.query(fullDidUri)
      // If the details are found, return those details.
      if (details) {
        return {
          details,
          metadata: {
            deactivated: false,
          },
        }
      }
      // If not, check whether the DID has been deleted or simply does not exist.
      const isDeactivated = await queryDidDeletionStatus(did)
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
      let details: DidDetails
      try {
        details = Did.parseDetailsFromLightDid(did, false)
      } catch (cause) {
        throw new SDKErrors.InvalidDidFormatError(did, {
          cause: cause as Error,
        })
      }

      const fullDidDetails = await api.query.did.did(did)
      // If a full DID with same subject is present, return the resolution metadata accordingly.
      if (fullDidDetails.isSome) {
        return {
          details,
          metadata: {
            canonicalId: fullDidUri,
            deactivated: false,
          },
        }
      }
      // If no full DID details are found but the full DID has been deleted, return the info in the resolution metadata.
      const isFullDidDeleted = await queryDidDeletionStatus(did)
      if (isFullDidDeleted) {
        return {
          // No canonicalId and no details are returned as we consider this DID deactivated/deleted.
          metadata: {
            deactivated: true,
          },
        }
      }
      // If no full DID details nor deletion info is found, the light DID is un-migrated.
      // Metadata will simply contain `deactivated: false`.
      return {
        details,
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
  const api = await BlockchainApiConnection.getConnectionOrConnect()

  switch (type) {
    case 'full': {
      const encoded = await api.query.did.did(didUri)
      const key = encoded.isSome && Did.getKey(decodeDid(encoded), keyId)
      if (!key) {
        return null
      }
      const { includedAt } = key
      return {
        controller: did,
        id: didUri,
        publicKey: key.publicKey,
        type: key.type,
        ...(includedAt && { includedAt }),
      }
    }
    case 'light': {
      const resolvedDetails = await resolve(didUri)
      if (!resolvedDetails) {
        throw new SDKErrors.InvalidDidFormatError(didUri)
      }
      if (!resolvedDetails.details) {
        return null
      }
      const key = Did.getKey(resolvedDetails.details, keyId)
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
  const api = await BlockchainApiConnection.getConnectionOrConnect()

  switch (type) {
    case 'full': {
      const encoded = await api.query.did.serviceEndpoints(
        encodeDid(serviceUri),
        encodeResourceId(serviceId)
      )
      if (encoded.isNone) {
        return null
      }
      const serviceEndpoint = decodeServiceEndpoint(encoded.unwrap())
      return {
        id: serviceUri,
        type: serviceEndpoint.type,
        serviceEndpoint: serviceEndpoint.serviceEndpoint,
      }
    }
    case 'light': {
      const resolvedDetails = await resolve(did)
      if (!resolvedDetails) {
        throw new SDKErrors.InvalidDidFormatError(serviceUri)
      }
      if (!resolvedDetails.details) {
        return null
      }
      const serviceEndpoint = Did.getEndpoint(
        resolvedDetails.details,
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
