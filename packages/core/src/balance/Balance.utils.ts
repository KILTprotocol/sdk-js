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
import type { BalanceNumber, BalanceOptions } from '@kiltprotocol/types'

export const KILT_COIN = new BN(1)

export const prefixes = new Map<string, number>([
  ['femto', -15],
  ['pico', -12],
  ['nano', -9],
  ['micro', -6],
  ['milli', -3],
  ['centi', -2],
  ['kilt', 0],
  ['kilo', 3],
  ['mega', 6],
  ['mill', 6],
  ['giga', 9],
  ['bill', 9],
  ['tera', 12],
  ['tril', 12],
  ['peta', 15],
  ['exa', 18],
  ['zetta', 21],
  ['yotta', 24],
])

export function formatKiltBalance(
  amount: BN,
  additionalOptions?: BalanceOptions
): string {
  const options = {
    withSi: true,
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
export function balanceNumberToString(input: BalanceNumber): string {
  if (typeof input === 'string') {
    if (!input.match(/^-?\d*\.?\d+$/)) {
      throw new Error('not a string representation of number')
    }
    return input
  }
  if (typeof input === 'number') {
    return input.toString()
  }
  if (
    typeof input === 'object' &&
    ((input instanceof BN && input.toString) ||
      (input instanceof BigInt && input.toLocaleString))
  ) {
    return input.toString()
  }
  throw new Error('could not convert to String')
}

export function toFemtoKilt(input: BalanceNumber, unitInput = 'kilt'): BN {
  const stringRepresentation = balanceNumberToString(input)
  const unit = unitInput.toLowerCase()
  if (!prefixes.has(unit)) {
    throw new Error('Unknown metric prefix')
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const unitVal = prefixes.get(unit)!
  const negative = stringRepresentation.substring(0, 1) === '-'

  const [integer, fraction] = negative
    ? stringRepresentation.substring(1).split('.')
    : stringRepresentation.split('.')
  if (fraction && fraction.length > unitVal + 15) {
    throw new Error(
      `Too many decimal places: input with unit ${unit} and value ${stringRepresentation} exceeds the ${
        unitVal + 15
      } possible decimal places by ${fraction.length - unitVal + 15}`
    )
  }
  const fractionBN = fraction
    ? convertToTxUnit(new BN(fraction), unitVal - fraction.length)
    : new BN(0)
  const resultingBN = convertToTxUnit(new BN(integer), unitVal).add(fractionBN)

  return resultingBN.mul(new BN(negative ? -1 : 1))
}
export function fromFemtoKilt(
  input: BalanceNumber,
  options?: BalanceOptions
): string {
  const inputBN = new BN(balanceNumberToString(input))
  const formatted = formatKiltBalance(inputBN, options)
  const [number, ...rest] = formatted.split(' ')
  const localeNumber = new Intl.NumberFormat(options?.locale, {
    minimumFractionDigits: 3,
  }).format(Number(number))
  return `${localeNumber} ${rest.join(' ')}`
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
