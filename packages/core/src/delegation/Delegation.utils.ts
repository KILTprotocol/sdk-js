import type { IDelegationBaseNode } from '@kiltprotocol/types'
import { DataUtils, SDKErrors } from '@kiltprotocol/utils'
import { query } from 'core/lib/delegation/DelegationNode.chain'

// eslint-disable-next-line import/prefer-default-export
export function errorCheck(
  id: IDelegationBaseNode['id'],
  account: IDelegationBaseNode['account']
): void {
  if (!query(id)) {
    throw SDKErrors.ERROR_NODE_QUERY(id)
  }

  if (!DataUtils.validateAddress(account, 'delegationNode Address')) {
    throw SDKErrors.ERROR_UNAUTHORIZED('delegation account not matching')
  }
}
