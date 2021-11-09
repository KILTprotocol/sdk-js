/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  IDidResolver,
  IDidKeyDetails,
  IDidResolvedDetails,
  IDidServiceEndpoint,
  IDidDetails,
} from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'
import { Crypto, SDKErrors } from '@kiltprotocol/utils'
import { LightDidDetails } from '../DidDetails/LightDidDetails'
import { FullDidDetails } from '../DidDetails/FullDidDetails'
import { decodeAndDeserializeAdditionalLightDidDetails } from '../DidDetails/LightDidDetails.utils'
import {
  queryServiceEndpoint,
  queryServiceEndpoints,
  queryById,
  queryDidKey,
  queryDidDeletionStatus,
} from '../Did.chain'
import {
  getKiltDidFromIdentifier,
  getSigningKeyTypeFromEncoding,
  parseDidUrl,
} from '../Did.utils'
import type { IDidParsingResult, LightDidDetailsCreationOpts } from '../types'

/**
 * Retrieves all the details associated with a DID from the KILT blockchain.
 *
 * @param identifier The full DID identifier.
 * @param version The DID version number.
 * @returns The full DID details queried from the KILT blockchain.
 */
async function queryFullDetailsFromIdentifier(
  identifier: string,
  version = FullDidDetails.FULL_DID_LATEST_VERSION
): Promise<FullDidDetails | null> {
  const didRec = await queryById(identifier)
  if (!didRec) return null
  const {
    publicKeys,
    assertionMethodKey,
    authenticationKey,
    capabilityDelegationKey,
    keyAgreementKeys,
    lastTxCounter,
  } = didRec

  const keyRelationships: FullDidDetails['keyRelationships'] = {
    [KeyRelationship.authentication]: [authenticationKey],
    [KeyRelationship.keyAgreement]: keyAgreementKeys,
  }
  if (assertionMethodKey) {
    keyRelationships[KeyRelationship.assertionMethod] = [assertionMethodKey]
  }
  if (capabilityDelegationKey) {
    keyRelationships[KeyRelationship.capabilityDelegation] = [
      capabilityDelegationKey,
    ]
  }

  const didUri = getKiltDidFromIdentifier(identifier, 'full', version)

  const endpoints = await queryServiceEndpoints(didUri)

  return new FullDidDetails({
    did: didUri,
    keys: publicKeys,
    keyRelationships,
    lastTxIndex: lastTxCounter.toBn(),
    serviceEndpoints: endpoints,
  })
}

function buildLightDetailsFromUriRegexMatch({
  identifier,
  version,
  encodedDetails,
}: Pick<
  IDidParsingResult,
  'identifier' | 'version' | 'encodedDetails'
>): LightDidDetails {
  // In light DIDs the key type encoding (first two chars) is part of the identifier.
  // We are sure the URI follows the expected structure as it has been checked in `parseDidUrl`.
  const keyTypeEncoding = identifier.substring(0, 2)
  const keyType = getSigningKeyTypeFromEncoding(keyTypeEncoding)
  if (!keyType) {
    throw Error()
  }
  const kiltIdentifier = identifier.substring(2)
  const lightDidCreationOptions: LightDidDetailsCreationOpts = {
    authenticationKey: {
      publicKey: Crypto.decodeAddress(kiltIdentifier, true, 38),
      type: keyType,
    },
  }

  if (encodedDetails) {
    const decodedDetails = decodeAndDeserializeAdditionalLightDidDetails(
      encodedDetails,
      version
    )
    lightDidCreationOptions.encryptionKey = decodedDetails.encryptionKey
    lightDidCreationOptions.serviceEndpoints = decodedDetails.serviceEndpoints
  }

  return new LightDidDetails(lightDidCreationOptions)
}

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
): Promise<IDidResolvedDetails | null> {
  const { identifier, type, version, encodedDetails } = parseDidUrl(did)

  switch (type) {
    case 'full': {
      const details = await queryFullDetailsFromIdentifier(identifier, version)
      if (details) {
        return { details } as IDidResolvedDetails
      }
      return null
    }
    case 'light': {
      let details: LightDidDetails
      try {
        details = buildLightDetailsFromUriRegexMatch({
          identifier,
          version,
          encodedDetails,
        })
      } catch {
        throw SDKErrors.ERROR_INVALID_DID_FORMAT(did)
      }
      const didResolvedDetails: IDidResolvedDetails = {
        details,
      }
      // LightDID identifier has two leading characters indicating the authentication key type.
      const fullDidIdentifier = identifier.substring(2)
      const fullDidUri = getKiltDidFromIdentifier(fullDidIdentifier, 'full')

      const fullDidDetails = await queryFullDetailsFromIdentifier(
        fullDidIdentifier
      )
      // If a full DID with same identifier is present, add resolution metadata linking to that.
      if (fullDidDetails) {
        didResolvedDetails.metadata = {
          canonicalId: fullDidUri,
          deleted: false,
        }
      } else {
        // If no full DID details are found but the full DID has been deleted, return the info in the resolution metadata.
        const isFullDidDeleted = await queryDidDeletionStatus(fullDidUri)
        if (isFullDidDeleted) {
          didResolvedDetails.metadata = {
            canonicalId: fullDidUri,
            deleted: true,
          }
        }
      }
      // If no full DID details nor deletion info is found, the light DID is un-migrated, so no resolution metadata is returned.
      return didResolvedDetails
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
  didUri: IDidKeyDetails['id']
): Promise<IDidKeyDetails | null> {
  const { fragment, type } = parseDidUrl(didUri)

  // A fragment IS expected to resolve a key.
  if (!fragment) {
    throw SDKErrors.ERROR_INVALID_DID_FORMAT
  }

  switch (type) {
    case 'full':
      return queryDidKey(didUri)
    case 'light': {
      const resolvedDetails = await resolveDoc(didUri)
      if (!resolvedDetails) {
        throw SDKErrors.ERROR_INVALID_DID_FORMAT(didUri)
      }
      return resolvedDetails.details.getKey(didUri) || null
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
  didUri: IDidServiceEndpoint['id']
): Promise<IDidServiceEndpoint | null> {
  const { fragment, type } = parseDidUrl(didUri)

  // A fragment IS expected to resolve a service endpoint.
  if (!fragment) {
    throw SDKErrors.ERROR_INVALID_DID_FORMAT
  }

  switch (type) {
    case 'full': {
      return queryServiceEndpoint(didUri)
    }
    case 'light': {
      const resolvedDetails = await resolveDoc(didUri)
      if (!resolvedDetails) {
        throw SDKErrors.ERROR_INVALID_DID_FORMAT(didUri)
      }
      return resolvedDetails.details.getEndpointById(didUri) || null
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
): Promise<IDidResolvedDetails | IDidKeyDetails | IDidServiceEndpoint | null> {
  const { fragment } = parseDidUrl(didUri)

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
