/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { IDidResolver, ResolverOpts } from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'
import { DidDetails, DidDetailsCreationOpts } from '../DidDetails/DidDetails'
import { queryById } from '../Did.chain'
import { getKiltDidFromIdentifier, parseDidUrl } from '../Did.utils'

/**
 * This is only a dummy; we don't know yet how the extra service data will be secured (signature over data?).
 */

export async function resolve({
  did,
  servicesResolver,
}: ResolverOpts): Promise<DidDetails | null> {
  const { identifier } = parseDidUrl(did)
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
    lastTxIndex: lastTxCounter.toBigInt(),
  }
  if (servicesResolver && endpointData) {
    const { contentHash, contentType, urls } = endpointData
    didDetails.services = await servicesResolver(contentHash, urls, contentType)
  }
  return new DidDetails(didDetails)
}

export const DefaultResolver: IDidResolver = { resolve }
