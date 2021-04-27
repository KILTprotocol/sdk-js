/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/balance
 */

import { BN } from '@polkadot/util'
import type { BalanceOptions } from '@kiltprotocol/types'
import {
  formatKiltBalance,
  convertToTxUnit,
  toFemtoKilt,
  TRANSACTION_FEE,
  fromFemtoKilt,
} from './Balance.utils'

const TESTVALUE = new BN('123456789000')
describe('formatKiltBalance', () => {
  const alterExistingOptions: BalanceOptions = {
    decimals: 17,
    withUnit: 'KIL',
  }
  const addingOptions: BalanceOptions = {
    // When enables displays the full unit - micro KILT
    withSiFull: false,
  }
  const baseValue = new BN('1')
  it('formats the given balance', async () => {
    expect(formatKiltBalance(TESTVALUE)).toEqual('123.4567 micro KILT')
    expect(formatKiltBalance(baseValue.mul(new BN(10).pow(new BN(3))))).toEqual(
      '1.0000 pico KILT'
    )
    expect(formatKiltBalance(baseValue.mul(new BN(10).pow(new BN(6))))).toEqual(
      '1.0000 nano KILT'
    )
    expect(formatKiltBalance(baseValue.mul(new BN(10).pow(new BN(9))))).toEqual(
      '1.0000 micro KILT'
    )
    expect(
      formatKiltBalance(baseValue.mul(new BN(10).pow(new BN(12))))
    ).toEqual('1.0000 milli KILT')
    expect(
      formatKiltBalance(baseValue.mul(new BN(10).pow(new BN(15))))
    ).toEqual('1.0000 KILT')
    expect(
      formatKiltBalance(baseValue.mul(new BN(10).pow(new BN(18))))
    ).toEqual('1.0000 Kilo KILT')
    expect(
      formatKiltBalance(baseValue.mul(new BN(10).pow(new BN(21))))
    ).toEqual('1.0000 Mill KILT')
    expect(
      formatKiltBalance(baseValue.mul(new BN(10).pow(new BN(24))))
    ).toEqual('1.0000 Bill KILT')
    expect(
      formatKiltBalance(baseValue.mul(new BN(10).pow(new BN(27))))
    ).toEqual('1.0000 Tril KILT')
  })
  it('changes formatting options for given balances', () => {
    expect(
      formatKiltBalance(
        baseValue.mul(new BN(10).pow(new BN(12))),
        alterExistingOptions
      )
    ).toEqual('10.0000 micro KIL')
    expect(
      formatKiltBalance(
        baseValue.mul(new BN(10).pow(new BN(12))),
        alterExistingOptions
      )
    ).not.toEqual('1.0000 micro KILT')
    expect(
      formatKiltBalance(
        baseValue.mul(new BN(10).pow(new BN(12))),
        addingOptions
      )
    ).toEqual('1.0000 mKILT')
  })
})

describe('convertToTxUnit', () => {
  it('converts given value with given power to femto KILT', () => {
    expect(new BN(convertToTxUnit(new BN(1), -15).toString())).toEqual(
      new BN(1)
    )
    expect(new BN(convertToTxUnit(new BN(1), -12).toString())).toEqual(
      new BN('1000')
    )
    expect(new BN(convertToTxUnit(new BN(1), -9).toString())).toEqual(
      new BN('1000000')
    )
    expect(new BN(convertToTxUnit(new BN(1), -6).toString())).toEqual(
      new BN('1000000000')
    )
    expect(new BN(convertToTxUnit(new BN(1), -3).toString())).toEqual(
      new BN('1000000000000')
    )
    expect(new BN(convertToTxUnit(new BN(1), 0).toString())).toEqual(
      new BN('1000000000000000')
    )
    expect(new BN(convertToTxUnit(new BN(1), 3).toString())).toEqual(
      new BN('1000000000000000000')
    )
    expect(new BN(convertToTxUnit(new BN(1), 6).toString())).toEqual(
      new BN('1000000000000000000000')
    )
    expect(new BN(convertToTxUnit(new BN(1), 9).toString())).toEqual(
      new BN('1000000000000000000000000')
    )
    expect(new BN(convertToTxUnit(new BN(1), 12).toString())).toEqual(
      new BN('1000000000000000000000000000')
    )
    expect(new BN(convertToTxUnit(new BN(1), 15).toString())).toEqual(
      new BN('1000000000000000000000000000000')
    )
    expect(new BN(convertToTxUnit(new BN(1), 18).toString())).toEqual(
      new BN('1000000000000000000000000000000000')
    )
  })
})
describe('asFemtoKilt', () => {
  it('converts whole KILT to femtoKilt using convertToTxUnit', () => {
    expect(new BN(toFemtoKilt(new BN(1000)).toString())).toEqual(
      new BN('1000000000000000000')
    )
  })
})
describe('fromFemtoKilt', () => {
  it('converts femtoKilt to whole KILT using convertToTxUnit', () => {
    expect(
      new BN(fromFemtoKilt(new BN('1000000000000000000')).toString())
    ).toEqual(new BN('1000'))
  })
})

describe('TRANSACTION_FEE', () => {
  it('equals 125 nano KILT', () => {
    expect(formatKiltBalance(TRANSACTION_FEE)).toEqual('125.0000 nano KILT')
  })
})
