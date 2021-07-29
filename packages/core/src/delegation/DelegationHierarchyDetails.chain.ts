/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  IDelegationHierarchyDetails,
  IDelegationNode,
} from '@kiltprotocol/types'
import { Option } from '@polkadot/types'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import {
  decodeDelegationHierarchyDetails,
  DelegationHierarchyDetailsRecord,
  IChainDelegationHierarchyDetails,
} from './DelegationDecoder'

/**
 * @packageDocumentation
 * @module DelegationHierarchyDetails
 */

export default async function query(
  rootId: IDelegationNode['id']
): Promise<IDelegationHierarchyDetails | null> {
  const blockchain = await BlockchainApiConnection.getConnectionOrConnect()
  const decoded: DelegationHierarchyDetailsRecord | null = decodeDelegationHierarchyDetails(
    await blockchain.api.query.delegation.delegationHierarchies<
      Option<IChainDelegationHierarchyDetails>
    >(rootId)
  )
  if (!decoded) {
    return null
  }
  const details = {
    rootId,
    cTypeHash: decoded.cTypeHash,
  }
  return details
}
