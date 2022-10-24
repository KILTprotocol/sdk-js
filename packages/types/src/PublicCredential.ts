/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { HexString } from '@polkadot/util/types'

import type { CTypeHash } from './CType'
import type { IDelegationNode } from './Delegation'
import type { IClaimContents } from './Claim'

export interface IPublicCredential {
  id: HexString
  cTypeHash: CTypeHash
  delegationId: IDelegationNode['id'] | null
  // TODO: Replace with Asset DID
  subject: string
  claims: IClaimContents
}
