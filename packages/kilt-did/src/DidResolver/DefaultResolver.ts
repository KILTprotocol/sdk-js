/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  IDidResolver,
  KeyDetails,
  ResolverOpts,
  ServiceDetails,
} from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'
import { DidDetails, DidDetailsCreationOpts } from '../DidDetails/DidDetails'
import { queryById, queryKey } from '../Did.chain'
import { getKiltDidFromIdentifier, parseDidUrl } from '../Did.utils'

async function detailsFromIdentifier(
  identifier: string,
  { servicesResolver }: ResolverOpts
): Promise<DidDetails | null> {
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

  const keyRelationships: DidDetailsCreationOpts['keyRelationships'] = {
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
  const didDetails: DidDetailsCreationOpts = {
    did: getKiltDidFromIdentifier(identifier),
    keys: publicKeys,
    keyRelationships,
    lastTxIndex: lastTxCounter.toBn(),
  }
  if (servicesResolver && endpointData) {
    const { contentHash, contentType, urls } = endpointData
    didDetails.services = await servicesResolver(contentHash, urls, contentType)
  }
  return new DidDetails(didDetails)
}

export async function resolveKey(didUri: string): Promise<KeyDetails | null> {
  const { did, fragment } = parseDidUrl(didUri)
  return queryKey(did, fragment)
}

export async function resolveDoc(
  did: string,
  opts: ResolverOpts = {}
): Promise<DidDetails | null> {
  const { identifier } = parseDidUrl(did)
  return detailsFromIdentifier(identifier, opts)
}

export async function resolve(
  didUri: string,
  opts: ResolverOpts = {}
): Promise<DidDetails | KeyDetails | ServiceDetails | null> {
  const { fragment, identifier } = parseDidUrl(didUri)
  const details = await detailsFromIdentifier(identifier, opts)
  if (!fragment || !details) {
    return details
  }
  return details?.getKey(didUri) || details?.getService(didUri) || null
}

export const DefaultResolver: IDidResolver = { resolveDoc, resolveKey, resolve }
