/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { IDelegationRootNode } from '@kiltprotocol/types'
import { DataUtils, SDKErrors } from '@kiltprotocol/utils'

export default function errorCheck(
  delegationRootNodeInput: IDelegationRootNode
): void {
  const { cTypeHash } = delegationRootNodeInput

  if (!cTypeHash) {
    throw SDKErrors.ERROR_CTYPE_HASH_NOT_PROVIDED()
  } else DataUtils.validateHash(cTypeHash, 'delegation root node ctype')
}
