/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import {
  IDelegationHierarchyDetails,
  IDelegationNode,
  SubmittableExtrinsic,
} from '@kiltprotocol/sdk-js'
import { Option } from '@polkadot/types'
import { BlockchainApiConnection } from 'chain-helpers/src/blockchainApiConnection'
import {
  decodeDelegationHierarchyDetails,
  DelegationHierarchyDetailsRecord,
  IChainDelegationHierarchyDetails,
} from './DelegationDecoder'
import DelegationHierarchyDetails from './DelegationHierarchyDetails'

/**
 * @packageDocumentation
 * @module DelegationHierarchyDetails
 */

/**
 * @param delegationHierarchyDetails The details associated with the delegation hierarchy being created.
 * @internal
 */
export async function store(
  delegationHierarchyDetails: IDelegationHierarchyDetails
): Promise<SubmittableExtrinsic> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const tx: SubmittableExtrinsic = blockchain.api.tx.delegation.createHierarchy(
    delegationHierarchyDetails.rootId,
    delegationHierarchyDetails.cTypeHash
  )
  return tx
}

export async function query(
  rootId: IDelegationNode['id']
): Promise<DelegationHierarchyDetails | null> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const decoded: DelegationHierarchyDetailsRecord | null = decodeDelegationHierarchyDetails(
    await blockchain.api.query.delegation.delegationHierarchies<
      Option<IChainDelegationHierarchyDetails>
    >(rootId)
  )
  if (!decoded) {
    return null
  }
  const details = new DelegationHierarchyDetails({
    rootId,
    cTypeHash: decoded.cTypeHash,
  })
  return details
}
