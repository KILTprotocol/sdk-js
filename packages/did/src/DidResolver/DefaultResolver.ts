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
} from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'
import { Crypto, SDKErrors } from '@kiltprotocol/utils'
import { LightDidDetails } from '../DidDetails/LightDidDetails'
import { FullDidDetails } from '../DidDetails/FullDidDetails'
import type { LightDidDetailsCreationOpts } from '../DidDetails/LightDidDetails'
import { decodeAndDeserializeAdditionalLightDidDetails } from '../DidDetails/LightDidDetails.utils'
import { queryById, queryKey } from '../Did.chain'
import {
  getKiltDidFromIdentifier,
  getSigningKeyTypeFromEncoding,
  parseDidUrl,
} from '../Did.utils'
import type { IDidParsingResult } from '../types'

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

  return new FullDidDetails({
    did: getKiltDidFromIdentifier(identifier, 'full', version),
    keys: publicKeys,
    keyRelationships,
    lastTxIndex: lastTxCounter.toBn(),
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
  }

  return new LightDidDetails(lightDidCreationOptions)
}

/**
 * Resolve a DID URI (including a key ID).
 *
 * @param didUri The DID URI to resolve.
 * @returns The DID or key details depending on the input URI. If not resource can be resolved, null is returned.
 */
export async function resolve(
  didUri: string
): Promise<IDidResolvedDetails | IDidKeyDetails | null> {
  const { identifier, type, version, fragment, encodedDetails } = parseDidUrl(
    didUri
  )

  switch (type) {
    case 'full': {
      const details = await queryFullDetailsFromIdentifier(identifier, version)
      // If the URI is a subject DID, return the retrieved details.
      if (!fragment) {
        return { details } as IDidResolvedDetails
      }

      // Otherwise, return either the key referenced by the URI.
      return details?.getKey(didUri) || null
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
      // If the URI is a subject DID, return the retrieved details.
      if (!fragment) {
        const didResolvedDetails: IDidResolvedDetails = {
          details,
        }

        const fullDidDetails = await queryFullDetailsFromIdentifier(
          identifier.substring(2)
        )
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

      return details?.getKey(didUri) || null
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
      return queryKey(did, fragment)
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

export const DefaultResolver: IDidResolver = { resolveDoc, resolveKey, resolve }
