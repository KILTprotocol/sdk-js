/**
 * @packageDocumentation
 * @module BalanceUtils
 */

import BN from 'bn.js'
import { formatBalance } from '@polkadot/util'
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

export function asFemtoKilt(balance: BN): BN {
  return convertToTxUnit(balance, 0)
}

export const TRANSACTION_FEE = convertToTxUnit(new BN(125), -9)

export default {
  KILT_COIN,
  TRANSACTION_FEE,
  formatKiltBalance,
  asFemtoKilt,
  convertToTxUnit,
}
