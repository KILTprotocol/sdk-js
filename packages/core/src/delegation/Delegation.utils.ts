import type { IDelegationBaseNode } from '@kiltprotocol/types'
import { SDKErrors, DataUtils } from '@kiltprotocol/utils'
import { isHex } from '@polkadot/util'

export default function errorCheck(
  id: IDelegationBaseNode['id'],
  account: IDelegationBaseNode['account'],
  revoked: IDelegationBaseNode['revoked']
): void {
  if (!id || typeof id !== 'string') {
    throw SDKErrors.ERROR_NODE_QUERY(id)
  } else if (!isHex(id)) {
    throw SDKErrors.ERROR_DELEGATION_ID_TYPE()
  }

  if (!account) {
    throw SDKErrors.ERROR_OWNER_NOT_PROVIDED
  } else DataUtils.validateAddress(account, 'delegationNode owner')

  if (typeof revoked !== 'boolean') {
    throw SDKErrors.ERROR_NOT_FOUND('not boolean')
  }
}
