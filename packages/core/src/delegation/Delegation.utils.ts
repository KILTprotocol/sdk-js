/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { IDelegationBaseNode } from '@kiltprotocol/types'
import { SDKErrors, DataUtils } from '@kiltprotocol/utils'
import { isHex } from '@polkadot/util'

export default function errorCheck(
  delegationBaseNode: IDelegationBaseNode
): void {
  const { id, account, revoked } = delegationBaseNode
  if (!id) {
    throw SDKErrors.ERROR_DELEGATION_ID_MISSING()
  } else if (typeof id !== 'string') {
    throw SDKErrors.ERROR_DELEGATION_ID_TYPE()
  } else if (!isHex(id)) {
    throw SDKErrors.ERROR_DELEGATION_ID_TYPE()
  }

  if (!account) {
    throw SDKErrors.ERROR_OWNER_NOT_PROVIDED()
  } else DataUtils.validateAddress(account, 'delegationNode owner')

  if (typeof revoked !== 'boolean') {
    throw new TypeError('revoked is expected to be a boolean')
  }
}
