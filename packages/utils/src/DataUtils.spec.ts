/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/utils
 */

import { encodeAddress } from '@polkadot/keyring'
import { Keyring, SDKErrors, ss58Format } from './index'
import { validateAddress, validateHash, validateSignature } from './DataUtils'
import * as Crypto from './Crypto'

const key = Buffer.from([0, 0, 7, 0])

it('validates address with prefix 38', () => {
  expect(() =>
    validateAddress(encodeAddress(key, ss58Format), 'test')
  ).not.toThrow()
  expect(validateAddress(encodeAddress(key, ss58Format), 'test')).toBe(true)
})

it('throws on address with other prefix', () => {
  expect(() => validateAddress(encodeAddress(key, 42), 'test')).toThrow('test')
})

it('throws for random strings', () => {
  expect(() => validateAddress('', 'test')).toThrowError(
    SDKErrors.AddressInvalidError
  )
  expect(() => validateAddress('0x123', 'test')).toThrowError(
    SDKErrors.AddressInvalidError
  )
  expect(() => validateAddress('bananenbabara', 'test')).toThrowError(
    SDKErrors.AddressInvalidError
  )
  expect(() => validateAddress('ax843zoidsfho38290rdusa', 'test')).toThrowError(
    SDKErrors.AddressInvalidError
  )
})

it('throws if address is no string', () => {
  expect(() =>
    validateAddress(Buffer.from([0, 0, 7]) as any, 'test')
  ).toThrowError(SDKErrors.AddressTypeError)
})

it('validates hash', () => {
  ;['wurst', 'a', '1'].forEach((value) => {
    const hash = Crypto.hashStr(value)
    expect(validateHash(hash, 'test')).toBe(true)
  })
})

it('throws on broken hashes', () => {
  const hash = Crypto.hashStr('test')
  expect(() => {
    validateHash(hash.substr(2), 'test')
  }).toThrowError(SDKErrors.HashMalformedError)
  expect(() => {
    validateHash(hash.substr(0, 60), 'test')
  }).toThrowError(SDKErrors.HashMalformedError)
  expect(() => {
    validateHash(hash.replace('0', 'O'), 'test')
  }).toThrowError(SDKErrors.HashMalformedError)
  expect(() => {
    validateHash(`${hash.substr(0, hash.length - 1)}ß`, 'test')
  }).toThrowError(SDKErrors.HashMalformedError)
  expect(() => {
    validateHash(hash.replace(/\w/i, 'P'), 'test')
  }).toThrowError(SDKErrors.HashMalformedError)
})

it('throws if hash is no string', () => {
  expect(() =>
    validateHash(Buffer.from([0, 0, 7]) as any, 'test')
  ).toThrowError(SDKErrors.HashTypeError)
})

describe('validate signature util', () => {
  const data = 'data'
  const keyring = new Keyring({
    type: 'ed25519',
    ss58Format,
  })
  const signer = keyring.addFromUri('//Alice')
  const signature = Crypto.signStr('data', signer)

  it('verifies when inputs are strings and signature checks out', () => {
    expect(validateSignature(data, signature, signer.address)).toBe(true)
  })

  it('throws when signature does not check out', () => {
    expect(() =>
      validateSignature('dörte', signature, signer.address)
    ).toThrowError(SDKErrors.SignatureUnverifiableError)
  })

  it('throws non-sdk error if input is bogus', () => {
    expect(() =>
      validateSignature('dörte', 'signature', 'signer')
    ).toThrowErrorMatchingInlineSnapshot(
      `"Invalid signature length, expected [64..66] bytes, found 9"`
    )
  })

  it('throws when input is incomplete', () => {
    expect(() => validateSignature('data', null as any, 'signer')).toThrowError(
      SDKErrors.SignatureMalformedError
    )
    expect(() =>
      validateSignature('data', 'signature', undefined as any)
    ).toThrowError(SDKErrors.SignatureMalformedError)
    expect(() =>
      validateSignature({ key: ['value'] } as any, 'signature', 'signer')
    ).toThrowError(SDKErrors.SignatureMalformedError)
    expect(() => (validateSignature as any)()).toThrowError(
      SDKErrors.SignatureMalformedError
    )
  })
})
