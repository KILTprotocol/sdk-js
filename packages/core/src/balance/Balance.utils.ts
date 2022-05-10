/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { BN, formatBalance } from '@polkadot/util'
import type {
  BalanceNumber,
  BalanceOptions,
  MetricPrefix,
} from '@kiltprotocol/types'

export const KILT_COIN = new BN(1)

export const Prefixes = new Map<MetricPrefix, number>([
  ['femto', -15],
  ['pico', -12],
  ['nano', -9],
  ['micro', -6],
  ['milli', -3],
  ['centi', -2],
  ['KILT', 0],
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

/**
 * Uses the polkadot.js balance formatter, to convert given BN to a human readable prefixed number.
 *
 * @param amount BN to format.
 * @param additionalOptions Optional formatting settings, these are defaulted to KILT specific settings.
 * @returns String representation of the given BN with prefix and unit ('KILT' as default).
 */
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

/**
 * Converts balance from KILT denomination to base unit.
 *
 * @param balance Balance in KILT denomination.
 * @param power Allows modifying conversion. Set to 0 for conversion to base unit, set to <0 for various larger denominations. -15 is KILT denomination.
 * @returns Converted (redenominated) balance.
 */
export function convertToTxUnit(balance: BN, power: number): BN {
  return new BN(balance).mul(new BN(10).pow(new BN(15 + power)))
}

export const TRANSACTION_FEE = convertToTxUnit(new BN(125), -9)

/**
 * Safely converts the given [[BalanceNumber]] to a string, using the supplied methods,
 * or it given a string checks for valid number representation.
 *
 * @param input [[BalanceNumber]] to convert.
 * @returns String representation of the given [[BalanceNumber]].
 * @throws On invalid number representation if given a string.
 * @throws On malformed input.
 */
export function balanceNumberToString(input: BalanceNumber): string {
  if (typeof input === 'string') {
    if (!input.match(/^-?\d*\.?\d+$/)) {
      throw new Error('not a string representation of number')
    }
    return input
  }
  if (
    typeof input === 'number' ||
    (typeof input === 'bigint' && input.toString) ||
    (typeof input === 'object' && input instanceof BN && input.toString)
  ) {
    return input.toString()
  }
  throw new Error('could not convert to String')
}

/**
 * Converts the given [[BalanceNumber]] to the femto KILT equivalent.
 *
 * @param input [[BalanceNumber]] to convert.
 * @param unit Metric prefix of the given [[BalanceNumber]].
 * @returns Exact BN representation in femtoKilt, to use in transactions and calculations.
 * @throws Unknown metricPrefix, or if the input has too many decimal places for it's unit.
 */
export function toFemtoKilt(
  input: BalanceNumber,
  unit: MetricPrefix = 'KILT'
): BN {
  const stringRepresentation = balanceNumberToString(input)

  if (!Prefixes.has(unit)) {
    throw new Error('Unknown metric prefix')
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const unitVal = Prefixes.get(unit)!
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

/**
 * Converts the given [[BalanceNumber]] to a human readable number with metric prefix and Unit.
 * This function uses the polkadot formatBalance function,
 * it's output can therefore be formatted via the polkadot formatting options.
 *
 * @param input [[BalanceNumber]] to convert from Femto Kilt.
 * @param decimals Set the minimum decimal places in the formatted localized output, default is 4.
 * @param options [[BalanceOptions]] for internationalization and formatting.
 * @returns String representation of the given [[BalanceNumber]] with unit und metric prefix.
 */
export function fromFemtoKilt(
  input: BalanceNumber,
  decimals = 4,
  options?: BalanceOptions
): string {
  const inputBN = new BN(balanceNumberToString(input))
  const formatted = formatKiltBalance(inputBN, options)
  const [number, ...rest] = formatted.split(' ')
  const negative = number.startsWith('-')
  const localeNumber = new Intl.NumberFormat(options?.locale, {
    minimumFractionDigits: 4,
  }).format(Number(negative ? number.slice(1) : number))
  return `${negative ? '-' : ''}${localeNumber.slice(
    0,
    localeNumber.length - 4 + decimals
  )} ${rest.join(' ')}`
}
