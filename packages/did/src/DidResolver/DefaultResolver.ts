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
} from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'
import { Crypto, SDKErrors } from '@kiltprotocol/utils'
import { LightDidDetails } from '../DidDetails/LightDidDetails'
import { FullDidDetails } from '../DidDetails/FullDidDetails'
import { decodeAndDeserializeAdditionalLightDidDetails } from '../DidDetails/LightDidDetails.utils'
import {
  queryById,
  queryKeyById,
  queryServiceEndpoint,
  queryServiceEndpoints,
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

  const endpoints = await queryServiceEndpoints(
    getKiltDidFromIdentifier(identifier, 'full')
  )

  return new FullDidDetails({
    did: getKiltDidFromIdentifier(identifier, 'full', version),
    keys: publicKeys,
    keyRelationships,
    lastTxIndex: lastTxCounter.toBn(),
    serviceEndpoints: endpoints,
  })
}

function buildLightDetailsFromMatch({
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
 * Resolve a DID URI (including a key ID).
 *
 * @param didUri The DID URI to resolve.
 * @returns The DID, key details or service details depending on the input URI. If not resource can be resolved, null is returned.
 */
export async function resolve(
  didUri: string
): Promise<IDidResolvedDetails | IDidKeyDetails | IDidServiceEndpoint | null> {
  const { identifier, type, version, fragment, encodedDetails } = parseDidUrl(
    didUri
  )

  const baseDid = getKiltDidFromIdentifier(identifier, type)

  switch (type) {
    case 'full': {
      // If a fragment is present, try to resolve to either a key or a service endpoint.
      if (fragment) {
        return (
          queryKeyById(baseDid, fragment) ||
          queryServiceEndpoint(baseDid, fragment) ||
          null
        )
      }
      // Otherwise, return the full information, including keys and service endpoints.
      const details = await queryFullDetailsFromIdentifier(identifier, version)
      return { details } as IDidResolvedDetails
    }
    case 'light': {
      let details: LightDidDetails
      try {
        details = buildLightDetailsFromMatch({
          identifier,
          version,
          encodedDetails,
        })
      } catch {
        throw SDKErrors.ERROR_INVALID_DID_FORMAT(didUri)
      }
      // If a fragment is present, try to resolve to either a key or a service endpoint.
      if (fragment) {
        return (
          details?.getKey(fragment) ||
          details?.getEndpointById(fragment) ||
          null
        )
      }
      // Otherwise, try to fetch any migration info and return the full light DID details.
      const didResolvedDetails: IDidResolvedDetails = {
        details,
      }

      const fullDidDetails = await queryFullDetailsFromIdentifier(
        identifier.substring(2)
      )
      // If a full DID with same identifier is present, add resolution metadata linking to that.
      if (fullDidDetails) {
        didResolvedDetails.metadata = {
          canonicalId: getKiltDidFromIdentifier(
            identifier.substring(2),
            'full'
          ),
        }
      }

      return didResolvedDetails
    }
    default:
      throw SDKErrors.ERROR_UNSUPPORTED_DID(didUri)
  }
}

/**
 * Resolve a DID URI (including a key) to the details of the DID subject.
 *
 * @param did The subject's or the key identifier.
 * @returns The details associated with the DID subject.
 */
export async function resolveDoc(
  did: string
): Promise<IDidResolvedDetails | null> {
  const { fragment } = parseDidUrl(did)

  let didToResolve = did
  if (fragment) {
    // eslint-disable-next-line prefer-destructuring
    didToResolve = didToResolve.split('#')[0]
  }

  return resolve(didToResolve) as Promise<IDidResolvedDetails | null>
}

/**
 * Resolve a DID key URI to the key details.
 *
 * @param didUri The DID key URI.
 * @returns The details associated with the key.
 */
export async function resolveKey(
  didUri: string
): Promise<IDidKeyDetails | null> {
  const { did, fragment, type } = parseDidUrl(didUri)

  // A fragment IS expected to resolve a key
  if (!fragment) {
    throw SDKErrors.ERROR_INVALID_DID_FORMAT
  }

  switch (type) {
    case 'full':
      return queryKeyById(did, fragment)
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
  didUri: string
): Promise<IDidServiceEndpoint | null> {
  const { did, fragment, type } = parseDidUrl(didUri)

  // A fragment IS expected to resolve a key
  if (!fragment) {
    throw SDKErrors.ERROR_INVALID_DID_FORMAT
  }

  switch (type) {
    case 'full': {
      return queryServiceEndpoint(did, fragment)
    }
    case 'light': {
      const resolvedDetails = await resolveDoc(didUri)
      if (!resolvedDetails) {
        throw SDKErrors.ERROR_INVALID_DID_FORMAT(didUri)
      }
      return resolvedDetails.details.getEndpointById(fragment) || null
    }
    default:
      throw SDKErrors.ERROR_UNSUPPORTED_DID(didUri)
  }
}

export const DefaultResolver: IDidResolver = {
  resolveDoc,
  resolveKey,
  resolve,
  resolveServiceEndpoint,
}
