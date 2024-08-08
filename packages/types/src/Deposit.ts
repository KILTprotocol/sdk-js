/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { BN } from './Imported'
import type { KiltAddress } from './Address'

/**
 * An on-chain deposit. It contains information about the deposit owner and the balance used.
 */
export type Deposit = {
  owner: KiltAddress
  amount: BN
}
