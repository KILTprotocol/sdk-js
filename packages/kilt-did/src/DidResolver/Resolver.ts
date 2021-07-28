/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { DidDetails, DidDetailsCreationOpts } from '../DidDetails/DidDetails'
import { queryByDID } from '../Did.chain'
import { ServiceRecord } from '../DidDetails/types'

export type ServicesResolver = (
  endpointUrl: string,
  did: string
) => Promise<ServiceRecord[]>

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
    endpointUrl,
    keyAgreementKeys,
    lastTxCounter,
  } = didRec
  const didDetails: DidDetailsCreationOpts = {
    did,
    keys: publicKeys,
    keyRelationships: {
      authentication: [authenticationKey],
      assertionMethod: attestationKey ? [attestationKey] : [],
      capabilityDelegation: delegationKey ? [delegationKey] : [],
      keyAgreement: keyAgreementKeys,
    },
    lastTxIndex: lastTxCounter.toBigInt(),
  }
  if (servicesResolver && endpointUrl) {
    didDetails.services = await servicesResolver(endpointUrl, did)
  }
  return new DidDetails(didDetails)
}
