/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ServiceDetails } from '@kiltprotocol/types'
import { DidDetails, DidDetailsCreationOpts } from '../DidDetails/DidDetails'
import { queryByDID } from '../Did.chain'

/**
 * This is only a dummy; we don't know yet how the extra service data will be secured (signature over data?).
 */
export type ServicesResolver = (
  resourceHash: string,
  endpoints: string[],
  contentType: string
) => Promise<ServiceDetails[]>

export interface ResolverOpts {
  did: string
  servicesResolver?: ServicesResolver
}

export async function resolveDid({
  did,
  servicesResolver,
}: ResolverOpts): Promise<DidDetails | null> {
  const didRec = await queryByDID(did)
  if (!didRec) return null
  const {
    publicKeys,
    attestationKey,
    authenticationKey,
    delegationKey,
    endpointData,
    keyAgreementKeys,
    lastTxCounter,
  } = didRec

  const keyRelationships: DidDetailsCreationOpts['keyRelationships'] = {
    authentication: [authenticationKey],
    keyAgreement: keyAgreementKeys,
  }
  if (attestationKey) {
    keyRelationships.assertionMethod = [attestationKey]
  }
  if (delegationKey) {
    keyRelationships.capabilityDelegation = [delegationKey]
  }
  const didDetails: DidDetailsCreationOpts = {
    did,
    keys: publicKeys,
    keyRelationships,
    lastTxIndex: lastTxCounter.toBigInt(),
  }
  if (servicesResolver && endpointData) {
    const { digest, contentType, urls } = endpointData
    didDetails.services = await servicesResolver(digest, urls, contentType)
  }
  return new DidDetails(didDetails)
}
