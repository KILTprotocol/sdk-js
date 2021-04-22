import type { IDelegationRootNode } from '@kiltprotocol/types'
import { DataUtils, SDKErrors } from '@kiltprotocol/utils'

// eslint-disable-next-line import/prefer-default-export
export function errorCheck(delegationRootNodeInput: IDelegationRootNode): void {
  const { cTypeHash } = delegationRootNodeInput

  if (DataUtils.validateHash(cTypeHash, 'delegation root node ctype')) {
    throw SDKErrors.ERROR_HASH_MALFORMED(cTypeHash)
  }
}
