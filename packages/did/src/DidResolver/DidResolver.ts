/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import {
  DidDetails,
  DidResolvedDetails,
  DidResourceUri,
  DidUri,
  ResolvedDidKey,
  ResolvedDidServiceEndpoint,
} from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'

import * as Did from '../index.js'
import {
  queryDetails,
  queryDidDeletionStatus,
  queryServiceEndpoint,
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
  const { address, type } = parseDidUri(did)
  const fullDidUri = getFullDidUri(did)

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
      const isDeactivated = await queryDidDeletionStatus(address)
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

      const fullDidDetails = await queryDetails(address)
      // If a full DID with same identifier is present, return the resolution metadata accordingly.
      if (fullDidDetails) {
        return {
          details,
          metadata: {
            canonicalId: fullDidUri,
            deactivated: false,
          },
        }
      }
      // If no full DID details are found but the full DID has been deleted, return the info in the resolution metadata.
      const isFullDidDeleted = await queryDidDeletionStatus(address)
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
  const { did, identifier, fragment: keyId, type } = parseDidUri(didUri)

  // A fragment (keyId) IS expected to resolve a key.
  if (!keyId) {
    throw new SDKErrors.InvalidDidFormatError(didUri)
  }

  switch (type) {
    case 'full': {
      const details = await queryDetails(identifier)
      const key = details && Did.getKey(details, keyId)
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
  const { identifier, fragment: serviceId, type, did } = parseDidUri(serviceUri)

  // A fragment (serviceId) IS expected to resolve a service endpoint.
  if (!serviceId) {
    throw new SDKErrors.InvalidDidFormatError(serviceUri)
  }

  switch (type) {
    case 'full': {
      const serviceEndpoint = await queryServiceEndpoint(identifier, serviceId)
      if (!serviceEndpoint) {
        return null
      }
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
