/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @packageDocumentation
 * @module BalanceUtils
 */

import { BN, formatBalance } from '@polkadot/util'

import type { BalanceOptions } from '@kiltprotocol/types'

export const KILT_COIN = new BN(1)

export function formatKiltBalance(
  amount: BN,
  additionalOptions?: BalanceOptions
): string {
  const options = {
    decimals: 15,
    withSiFull: true,
    withUnit: 'KILT',
    ...additionalOptions,
  }
  return formatBalance(amount, options)
}

export function convertToTxUnit(balance: BN, power: number): BN {
  return new BN(balance).mul(new BN(10).pow(new BN(15 + power)))
}

export function toFemtoKilt(balance: BN): BN {
  return convertToTxUnit(balance, 0)
}
export function fromFemtoKilt(balance: BN): BN {
  return new BN(balance).div(new BN(10).pow(new BN(15)))
}
export const TRANSACTION_FEE = convertToTxUnit(new BN(125), -9)

export default {
  KILT_COIN,
  TRANSACTION_FEE,
  formatKiltBalance,
  toFemtoKilt,
  fromFemtoKilt,
  convertToTxUnit,
}
