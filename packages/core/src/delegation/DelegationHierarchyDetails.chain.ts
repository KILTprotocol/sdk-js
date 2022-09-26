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
import { ConfigService } from '@kiltprotocol/config'
import { SDKErrors } from '@kiltprotocol/utils'

import { delegationHierarchyDetailsFromChain } from './DelegationDecoder.js'

/**
 * Query a delegation hierarchy node from the blockchain given its identifier.
 *
 * @param rootId The root delegation node ID to query.
 * @returns Either the retrieved [[IDelegationHierarchyDetails]] or null.
 */
export async function query(
  rootId: IDelegationNode['id']
): Promise<IDelegationHierarchyDetails> {
  const api = ConfigService.get('api')
  const chain = await api.query.delegation.delegationHierarchies(rootId)
  if (chain.isNone) {
    throw new SDKErrors.HierarchyQueryError(rootId)
  }
  return {
    ...delegationHierarchyDetailsFromChain(chain),
    id: rootId,
  }
}
