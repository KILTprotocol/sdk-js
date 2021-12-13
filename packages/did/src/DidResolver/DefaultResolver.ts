/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import {
  DidPublicKey,
  DidPublicServiceEndpoint,
  DidResolvedDetails,
  IDidDetails,
  IDidResolver,
  ResolvedDidKey,
  ResolvedDidServiceEndpoint,
} from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'

import { LightDidDetails, FullDidDetails } from '../DidDetails'
import {
  queryDetails,
  queryDidDeletionStatus,
  queryKey,
  queryServiceEndpoint,
} from '../Did.chain'
import { getKiltDidFromIdentifier, parseDidUri } from '../Did.utils'

/**
 * Resolve a DID URI to the details of the DID subject.
 *
 * The URI can also identify a key or a service, but it will be ignored during resolution.
 *
 * @param did The subject's identifier.
 * @returns The details associated with the DID subject.
 */
export async function resolveDoc(
  did: IDidDetails['did']
): Promise<DidResolvedDetails | null> {
  const { identifier, type, version } = parseDidUri(did)

  switch (type) {
    case 'full': {
      const details = await FullDidDetails.fromChainInfo(identifier, version)
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
      const isDeactivated = await queryDidDeletionStatus(identifier)
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
      let details: LightDidDetails
      try {
        details = LightDidDetails.fromUri(did, false)
      } catch {
        throw SDKErrors.ERROR_INVALID_DID_FORMAT(did)
      }

      const fullDidDetails = await queryDetails(details.identifier)
      // If a full DID with same identifier is present, return the resolution metadata accordingly.
      if (fullDidDetails) {
        const fullDidUri = getKiltDidFromIdentifier(
          details.identifier,
          'full',
          version
        )
        return {
          details,
          metadata: {
            canonicalId: fullDidUri,
            deactivated: false,
          },
        }
      }
      // If no full DID details are found but the full DID has been deleted, return the info in the resolution metadata.
      const isFullDidDeleted = await queryDidDeletionStatus(details.identifier)
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
      throw SDKErrors.ERROR_UNSUPPORTED_DID(did)
  }
}

/**
 * Resolve a DID key URI to the key details.
 *
 * @param didUri The DID key URI.
 * @returns The details associated with the key.
 */
export async function resolveKey(
  didUri: DidPublicKey['id']
): Promise<ResolvedDidKey | null> {
  const { did, identifier, fragment: keyId, type } = parseDidUri(didUri)

  // A fragment (keyId) IS expected to resolve a key.
  if (!keyId) {
    throw SDKErrors.ERROR_INVALID_DID_FORMAT(didUri)
  }

  switch (type) {
    case 'full': {
      const key = await queryKey(identifier, keyId)
      if (!key) {
        return null
      }
      const result: ResolvedDidKey = {
        controller: did,
        id: `${did}#${keyId}`,
        publicKey: key.publicKey,
        type: key.type,
      }
      if (key.includedAt) {
        result.includedAt = key.includedAt
      }
      return result
    }
    case 'light': {
      const resolvedDetails = await resolveDoc(didUri)
      if (!resolvedDetails) {
        throw SDKErrors.ERROR_INVALID_DID_FORMAT(didUri)
      }
      const key = resolvedDetails.details?.getKey(keyId)
      if (!key) {
        return null
      }
      return {
        controller: did,
        id: `${did}#${keyId}`,
        publicKey: key.publicKey,
        type: key.type,
      }
    }
    default:
      throw SDKErrors.ERROR_UNSUPPORTED_DID(didUri)
  }
}

/**
 * Resolve a DID service URI to the service details.
 *
 * @param didUri The DID service URI.
 * @returns The details associated with the service endpoint.
 */
export async function resolveServiceEndpoint(
  didUri: DidPublicServiceEndpoint['id']
): Promise<ResolvedDidServiceEndpoint | null> {
  const { did, identifier, fragment: serviceId, type } = parseDidUri(didUri)

  // A fragment (serviceId) IS expected to resolve a service endpoint.
  if (!serviceId) {
    throw SDKErrors.ERROR_INVALID_DID_FORMAT
  }

  switch (type) {
    case 'full': {
      const serviceEndpoint = await queryServiceEndpoint(identifier, serviceId)
      if (!serviceEndpoint) {
        return null
      }
      return {
        id: `${did}#${serviceEndpoint.id}`,
        type: serviceEndpoint.types,
        serviceEndpoint: serviceEndpoint.urls,
      }
    }
    case 'light': {
      const resolvedDetails = await resolveDoc(didUri)
      if (!resolvedDetails) {
        throw SDKErrors.ERROR_INVALID_DID_FORMAT(didUri)
      }
      const serviceEndpoint = resolvedDetails.details?.getEndpoint(serviceId)
      if (!serviceEndpoint) {
        return null
      }
      return {
        id: `${did}#${serviceEndpoint.id}`,
        type: serviceEndpoint.types,
        serviceEndpoint: serviceEndpoint.urls,
      }
    }
    default:
      throw SDKErrors.ERROR_UNSUPPORTED_DID(didUri)
  }
}

/**
 * Resolve a DID URI (including a key ID or a service ID).
 *
 * @param didUri The DID URI to resolve.
 * @returns The DID, key details or service details depending on the input URI. If not resource can be resolved, null is returned.
 */
export async function resolve(
  didUri: string
): Promise<
  DidResolvedDetails | ResolvedDidKey | ResolvedDidServiceEndpoint | null
> {
  const { fragment } = parseDidUri(didUri)

  if (fragment) {
    return resolveKey(didUri) || resolveServiceEndpoint(didUri) || null
  }
  return resolveDoc(didUri)
}

export const DefaultResolver: IDidResolver = {
  resolveDoc,
  resolveKey,
  resolve,
  resolveServiceEndpoint,
}
