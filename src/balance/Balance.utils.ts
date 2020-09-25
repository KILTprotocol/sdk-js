/**
 * @packageDocumentation
 * @module BalanceUtils
 * @preferred
 */

import BN from 'bn.js'
import { formatBalance } from '@polkadot/util'

export const KILT_COIN = new BN(1)
export const KILT_FEMTO_COIN = new BN('1000000000000000')

export const TRANSACTION_FEE = KILT_COIN.divn(1000000000).muln(125)

export const MIN_BALANCE = KILT_COIN.muln(1)

export const ENDOWMENT = KILT_COIN.muln(30)

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

export function asFemtoKilt(balance: BN): BN {
  return new BN(balance).mul(KILT_FEMTO_COIN)
}

export function convertToTxUnit(balance: BN, power: number): BN {
  return new BN(balance).mul(new BN(10).pow(new BN(15 + power)))
}

export default {
  KILT_COIN,
  KILT_FEMTO_COIN,
  TRANSACTION_FEE,
  MIN_BALANCE,
  ENDOWMENT,
  formatKiltBalance,
  asFemtoKilt,
  convertToTxUnit,
}
