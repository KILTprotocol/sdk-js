/**
 * @packageDocumentation
 * @module BalanceUtils
 */

import BN from 'bn.js'
import { formatBalance } from '@polkadot/util'

export const KILT_COIN = new BN(1)

// Exported options from polkadot/util
export interface Options {
  decimals?: number
  forceUnit?: string
  withSi?: boolean
  withSiFull?: boolean
  withUnit?: boolean | string
}

export function formatKiltBalance(
  amount: BN,
  additionalOptions?: Options
): string {
  const options = {
    decimals: 15,
    withSiFull: true,
    withUnit: 'KILT',
    ...additionalOptions,
  }
  return formatBalance(amount, options)
}

export function formatKiltBalanceDecimalPlacement(
  amount: BN,
  decimal: number,
  denomination: number
): string {
  const factoring = new BN(10).pow(new BN(denomination - decimal))
  const skimmedAmount = amount.div(new BN(factoring))
  return (skimmedAmount.toNumber() / 10 ** decimal).toString()

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
  formatKiltBalanceDecimalPlacement,
  asFemtoKilt,
  convertToTxUnit,
}
