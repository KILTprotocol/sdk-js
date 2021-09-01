/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  IDidResolver,
  IDidKeyDetails,
  IDidDetails,
  ResolverOpts,
  IServiceDetails,
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

async function queryFullDetailsFromIdentifier(
  identifier: string,
  { servicesResolver }: ResolverOpts,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  version = 1
): Promise<FullDidDetails | null> {
  const didRec = await queryById(identifier)
  if (!didRec) return null
  const {
    publicKeys,
    assertionMethodKey,
    authenticationKey,
    capabilityDelegationKey,
    endpointData,
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

  let services: IServiceDetails[] = []
  if (servicesResolver && endpointData) {
    const { contentHash, contentType, urls } = endpointData
    services = await servicesResolver(contentHash, urls, contentType)
  }

  return new FullDidDetails({
    did: getKiltDidFromIdentifier(identifier, 'full'),
    keys: publicKeys,
    keyRelationships,
    lastTxIndex: lastTxCounter.toBn(),
    services,
  })
}

export async function resolve(
  didUri: string,
  opts: ResolverOpts = {}
): Promise<IDidDetails | IDidKeyDetails | IServiceDetails | null> {
  const { identifier, type, version, fragment, encodedDetails } = parseDidUrl(
    didUri
  )
  if (type === 'full') {
    const details = await queryFullDetailsFromIdentifier(
      identifier,
      opts,
      version
    )
    if (!fragment || !details) {
      return details
    }

    return details?.getKey(didUri) || details?.getService(didUri) || null
  }

  // If type === 'light'
  const kiltIdentifier = identifier.substr(2)
  const keyTypeEncoding = identifier.substr(0, 2)
  const keyType = getSigningKeyTypeFromEncoding(keyTypeEncoding)
  if (!keyType) {
    throw SDKErrors.ERROR_INVALID_DID_FORMAT(didUri)
  }
  const lightDidCreationOptions: LightDidDetailsCreationOpts = {
    authenticationKey: {
      publicKey: Crypto.decodeAddress(kiltIdentifier, true, 38),
      type: keyType,
    },
  }

  if (encodedDetails) {
    const decodedDetails = decodeAndDeserializeAdditionalLightDidDetails(
      encodedDetails
    )
    lightDidCreationOptions.encryptionKey = decodedDetails.encryptionKey
    lightDidCreationOptions.services = decodedDetails.services
  }

  const details = new LightDidDetails(lightDidCreationOptions)

  if (!fragment || !details) {
    return details
  }

  return details?.getKey(didUri) || details?.getService(didUri) || null
}

export async function resolveDoc(
  did: string,
  opts: ResolverOpts = {}
): Promise<IDidDetails | null> {
  const { fragment } = parseDidUrl(did)

  // A fragment must not be present when resolving a whole document
  if (fragment) {
    throw SDKErrors.ERROR_INVALID_DID_FORMAT(did)
  }

  return resolve(did, opts) as Promise<IDidDetails | null>
}

export async function resolveKey(
  didUri: string
): Promise<IDidKeyDetails | null> {
  const { did, fragment, type } = parseDidUrl(didUri)

  if (!fragment) {
    throw SDKErrors.ERROR_INVALID_DID_FORMAT
  }

  if (type === 'full') {
    return queryKey(did, fragment)
  }

  // If type === 'light'
  const lightDidDetails = (await resolveDoc(didUri)) as LightDidDetails
  return lightDidDetails.getKey(fragment.substr(1)) || null
}

export const DefaultResolver: IDidResolver = { resolveDoc, resolveKey, resolve }
