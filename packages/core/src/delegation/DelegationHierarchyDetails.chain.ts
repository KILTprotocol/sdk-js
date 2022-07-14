/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  IDelegationHierarchyDetails,
  IDelegationNode,
} from '@kiltprotocol/types'
import { BlockchainApiConnection } from '@kiltprotocol/chain-helpers'
import { decodeDelegationHierarchyDetails } from './DelegationDecoder.js'

/**
 * Query a delegation hierarchy node from the blockchain given its identifier.
 *
 * @param rootId The root delegation node ID to query.
 * @returns Either the retrieved [[IDelegationHierarchyDetails]] or null.
 */
export async function query(
  rootId: IDelegationNode['id']
): Promise<IDelegationHierarchyDetails | null> {
  const api = await BlockchainApiConnection.getConnectionOrConnect()
  const decoded = decodeDelegationHierarchyDetails(
    await api.query.delegation.delegationHierarchies(rootId)
  )
  if (!decoded) {
    return null
  }
  return {
    ...decoded,
    id: rootId,
  }
}
