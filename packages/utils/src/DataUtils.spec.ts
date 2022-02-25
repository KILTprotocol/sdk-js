/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/utils
 */

import { encodeAddress } from '@polkadot/keyring'
import { Keyring } from './index'
import { validateAddress, validateHash, validateSignature } from './DataUtils'
import { ErrorCode } from './SDKErrors'
import * as Crypto from './Crypto'

const key = Buffer.from([0, 0, 7, 0])

it('validates address with prefix 38', () => {
  expect(() => validateAddress(encodeAddress(key, 38), 'test')).not.toThrow()
  expect(validateAddress(encodeAddress(key, 38), 'test')).toBe(true)
})

it('throws on address with other prefix', () => {
  expect(() => validateAddress(encodeAddress(key, 42), 'test')).toThrow('test')
})

it('throws for random strings', () => {
  expect(() => validateAddress('', 'test')).toThrowErrorWithCode(
    ErrorCode.ERROR_ADDRESS_INVALID
  )
  expect(() => validateAddress('0x123', 'test')).toThrowErrorWithCode(
    ErrorCode.ERROR_ADDRESS_INVALID
  )
  expect(() => validateAddress('bananenbabara', 'test')).toThrowErrorWithCode(
    ErrorCode.ERROR_ADDRESS_INVALID
  )
  expect(() =>
    validateAddress('ax843zoidsfho38290rdusa', 'test')
  ).toThrowErrorWithCode(ErrorCode.ERROR_ADDRESS_INVALID)
})

it('throws if address is no string', () => {
  expect(() =>
    validateAddress(Buffer.from([0, 0, 7]) as any, 'test')
  ).toThrowErrorWithCode(ErrorCode.ERROR_ADDRESS_TYPE)
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
  }).toThrowErrorWithCode(ErrorCode.ERROR_HASH_MALFORMED)
  expect(() => {
    validateHash(hash.substr(0, 60), 'test')
  }).toThrowErrorWithCode(ErrorCode.ERROR_HASH_MALFORMED)
  expect(() => {
    validateHash(hash.replace('0', 'O'), 'test')
  }).toThrowErrorWithCode(ErrorCode.ERROR_HASH_MALFORMED)
  expect(() => {
    validateHash(`${hash.substr(0, hash.length - 1)}ß`, 'test')
  }).toThrowErrorWithCode(ErrorCode.ERROR_HASH_MALFORMED)
  expect(() => {
    validateHash(hash.replace(/\w/i, 'P'), 'test')
  }).toThrowErrorWithCode(ErrorCode.ERROR_HASH_MALFORMED)
})

it('throws if hash is no string', () => {
  expect(() =>
    validateHash(Buffer.from([0, 0, 7]) as any, 'test')
  ).toThrowErrorWithCode(ErrorCode.ERROR_HASH_TYPE)
})

describe('validate signature util', () => {
  const data = 'data'
  const keyring = new Keyring({
    type: 'ed25519',
    // KILT has registered the ss58 prefix 38
    ss58Format: 38,
  })
  const signer = keyring.addFromUri('//Alice')
  const signature = Crypto.signStr('data', signer)

  it('verifies when inputs are strings and signature checks out', () => {
    expect(validateSignature(data, signature, signer.address)).toBe(true)
  })

  it('throws when signature does not check out', () => {
    expect(() =>
      validateSignature('dörte', signature, signer.address)
    ).toThrowErrorWithCode(ErrorCode.ERROR_SIGNATURE_UNVERIFIABLE)
  })

  it('throws non-sdk error if input is bogus', () => {
    expect(() =>
      validateSignature('dörte', 'signature', 'signer')
    ).toThrowErrorMatchingInlineSnapshot(
      `"Invalid signature length, expected [64..66] bytes, found 9"`
    )
  })

  it('throws when input is incomplete', () => {
    expect(() =>
      validateSignature('data', null as any, 'signer')
    ).toThrowErrorWithCode(ErrorCode.ERROR_SIGNATURE_DATA_TYPE)
    expect(() =>
      validateSignature('data', 'signature', undefined as any)
    ).toThrowErrorWithCode(ErrorCode.ERROR_SIGNATURE_DATA_TYPE)
    expect(() =>
      validateSignature({ key: ['value'] } as any, 'signature', 'signer')
    ).toThrowErrorWithCode(ErrorCode.ERROR_SIGNATURE_DATA_TYPE)
    expect(() => (validateSignature as any)()).toThrowErrorWithCode(
      ErrorCode.ERROR_SIGNATURE_DATA_TYPE
    )
  })
})
