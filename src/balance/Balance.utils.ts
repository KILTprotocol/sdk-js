/**
 * @packageDocumentation
 * @module BalanceUtils
 * @preferred
 */

import BN from 'bn.js'
import { formatBalance } from '@polkadot/util'

export const KILT_COIN = new BN(1)

export function formatKiltBalance(amount: BN): string {
  return formatBalance(
    amount,
    {
      withSiFull: true,
      withUnit: 'KILT',
    },
    15
  )
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
