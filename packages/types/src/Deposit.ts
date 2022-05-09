/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { AccountId, Balance } from '@polkadot/types/interfaces'
import { Struct } from '@polkadot/types'

/**
 * An on-chain deposit. It contains information about the deposit owner and the balance used.
 */
export interface Deposit extends Struct {
  owner: AccountId
  amount: Balance
}
