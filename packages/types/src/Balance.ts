/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { BN } from '@polkadot/util'
import { AnyNumber } from '@polkadot/types/types'

export type Balances = {
  free: BN
  reserved: BN
  miscFrozen: BN
  feeFrozen: BN
}

// Extracted options from polkadot/util
export interface BalanceOptions {
  decimals?: number
  forceUnit?: string
  withSi?: boolean
  withSiFull?: boolean
  withUnit?: boolean | string
  locale?: string
}

export type BalanceNumber = Exclude<AnyNumber, Uint8Array>

export type MetricPrefix =
  | 'femto'
  | 'pico'
  | 'nano'
  | 'micro'
  | 'milli'
  | 'centi'
  | 'KILT'
  | 'kilo'
  | 'mega'
  | 'mill'
  | 'giga'
  | 'bill'
  | 'tera'
  | 'tril'
  | 'peta'
  | 'exa'
  | 'zetta'
  | 'yotta'
