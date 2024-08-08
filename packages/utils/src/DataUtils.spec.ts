/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { encodeAddress } from '@polkadot/keyring'
import type { KiltAddress } from '@kiltprotocol/types'
import { SDKErrors, ss58Format } from './index'
import { verifyKiltAddress, verifyIsHex } from './DataUtils'
import * as Crypto from './Crypto'

const key = Buffer.from([0, 0, 7, 0])

it('validates address with prefix 38', () => {
  expect(() => verifyKiltAddress(encodeAddress(key, ss58Format))).not.toThrow()
})

it('throws on address with other prefix', () => {
  expect(() =>
    verifyKiltAddress(encodeAddress(key, 42) as KiltAddress)
  ).toThrow()
})

it('throws for random strings', () => {
  expect(() => verifyKiltAddress('' as KiltAddress)).toThrowError(
    SDKErrors.AddressInvalidError
  )
  expect(() => verifyKiltAddress('0x123' as KiltAddress)).toThrowError(
    SDKErrors.AddressInvalidError
  )
  expect(() => verifyKiltAddress('bananenbabara' as KiltAddress)).toThrowError(
    SDKErrors.AddressInvalidError
  )
  expect(() =>
    verifyKiltAddress('ax843zoidsfho38290rdusa' as KiltAddress)
  ).toThrowError(SDKErrors.AddressInvalidError)
})

it('throws if address is no string', () => {
  expect(() => verifyKiltAddress(Buffer.from([0, 0, 7]) as any)).toThrowError(
    SDKErrors.AddressTypeError
  )
})

it('validates hash', () => {
  ;['wurst', 'a', '1'].forEach((value) => {
    const hash = Crypto.hashStr(value)
    expect(() => verifyIsHex(hash)).not.toThrow()
  })
})

it('throws on broken hashes', () => {
  const hash = Crypto.hashStr('test')
  expect(() => {
    verifyIsHex(hash.substr(2))
  }).toThrowError(SDKErrors.HashMalformedError)
  expect(() => {
    verifyIsHex(hash.substr(0, 60), 256)
  }).toThrowError(SDKErrors.HashMalformedError)
  expect(() => {
    verifyIsHex(hash.replace('0', 'O'))
  }).toThrowError(SDKErrors.HashMalformedError)
  expect(() => {
    verifyIsHex(`${hash.substr(0, hash.length - 1)}ß`)
  }).toThrowError(SDKErrors.HashMalformedError)
  expect(() => {
    verifyIsHex(hash.replace(/\w/i, 'P'))
  }).toThrowError(SDKErrors.HashMalformedError)
})

it('throws if hash is no string', () => {
  expect(() => verifyIsHex(Buffer.from([0, 0, 7]) as any)).toThrowError(
    SDKErrors.HashMalformedError
  )
})
