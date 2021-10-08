/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @packageDocumentation
 * @module Claim
 */

import type { AccountId, Balance } from '@polkadot/types/interfaces'
import { Struct } from '@polkadot/types'

/**
 * @packageDocumentation
 * @internal
 */
export interface IDeposit extends Struct {
  owner: AccountId
  amount: Balance
}
