/**
 * @packageDocumentation
 * @group unit/crypto
 * @ignore
 */

import * as string from '@polkadot/util/string'
import { Keyring } from '@polkadot/keyring'
import { KeyringPair } from '@polkadot/keyring/types'
import { u8aToHex } from '@polkadot/util'
import nacl from 'tweetnacl'
import * as Crypto from './Crypto'

const messageStr = 'This is a test'
const message = new Uint8Array(string.stringToU8a(messageStr))

describe('Symmetric Crypto', () => {
  let alice: KeyringPair
  let alicePubKey: string
  let bob: KeyringPair
  let bobPubKey: string

  beforeAll(async () => {
    const keyring = new Keyring({
      type: 'ed25519',
      // KILT has registered the ss58 prefix 38
      ss58Format: 38,
    })
    alice = keyring.addFromUri('//Alice')
    alicePubKey = u8aToHex(alice.publicKey)
    bob = keyring.addFromUri('//Bob')
    bobPubKey = u8aToHex(bob.publicKey)
  })

  it('should sign and verify (UInt8Array)', () => {
    const signature = Crypto.sign(message, alice)
    expect(signature).not.toBeFalsy()
    expect(Crypto.verify(message, signature, alice.address)).toBe(true)

    expect(Crypto.verify(message, signature, bob.address)).toBe(false)
    expect(
      Crypto.verify(new Uint8Array([0, 0, 0]), signature, alice.address)
    ).toBe(false)
  })

  it('should sign and verify (string)', () => {
    const signature = Crypto.signStr(messageStr, alice)
    expect(signature).not.toBeFalsy()
    expect(Crypto.verify(messageStr, signature, alicePubKey)).toBe(true)

    expect(Crypto.verify(messageStr, signature, bobPubKey)).toBe(false)
    expect(Crypto.verify('0x000000', signature, alicePubKey)).toBe(false)
  })

  // https://polkadot.js.org/common/examples/util-crypto/01_encrypt_decrypt_message_nacl/
  it('should encrypt and decrypt symmetrical using random secret key (UInt8Array)', () => {
    const secret = new Uint8Array([
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28,
      29,
      30,
      31,
    ])
    const data = Crypto.encryptSymmetric(message, secret)
    expect(data).not.toBeFalsy()
    expect(Crypto.decryptSymmetric(data, secret)).toEqual(message)
    const dataWithNonce = Crypto.encryptSymmetric(message, secret, data.nonce)
    expect(Crypto.decryptSymmetric(dataWithNonce, secret)).toEqual(message)
  })

  // https://polkadot.js.org/common/examples/util-crypto/01_encrypt_decrypt_message_nacl/
  it('should encrypt and decrypt symmetrical using random secret key (string)', () => {
    const secret =
      '0x000102030405060708090A0B0C0D0E0F101112131415161718191A1B1C1D1E1F'

    const data = Crypto.encryptSymmetricAsStr(messageStr, secret)
    expect(data).not.toBeFalsy()
    expect(Crypto.decryptSymmetricStr(data, secret)).toEqual(messageStr)
    expect(
      Crypto.decryptSymmetricStr(
        { encrypted: '0x000102030405060708090A0B0C0D0E0F', nonce: data.nonce },
        secret
      )
    ).toEqual(null)
    const dataWithNonce = Crypto.encryptSymmetricAsStr(
      messageStr,
      secret,
      data.nonce
    )
    expect(Crypto.decryptSymmetricStr(dataWithNonce, secret)).toEqual(
      messageStr
    )
  })

  it('should hash', () => {
    expect(Crypto.hash(message)).toHaveLength(32)
    expect(Crypto.hash(message)).toEqual(Crypto.hash(message))
    expect(Crypto.hash('123')).toEqual(Crypto.hash('123'))

    expect(Crypto.hash(new Uint8Array([0, 0, 0]))).not.toEqual(
      Crypto.hash(message)
    )
    expect(Crypto.hash('123')).not.toEqual(Crypto.hash(message))
    expect(Crypto.hashStr('123')).not.toEqual(Crypto.hashStr(message))
  })
})

describe('asymmetric crypto', () => {
  let alice: nacl.BoxKeyPair
  let bob: nacl.BoxKeyPair

  beforeAll(() => {
    alice = nacl.box.keyPair()
    bob = nacl.box.keyPair()
  })

  it('should encrypt and decrypt asymmetrical (string)', () => {
    const encrypted = Crypto.encryptAsymmetricAsStr(
      messageStr,
      alice.publicKey,
      bob.secretKey
    )
    expect(encrypted).not.toEqual(messageStr)
    const decrypted = Crypto.decryptAsymmetricAsStr(
      encrypted,
      bob.publicKey,
      alice.secretKey
    )
    expect(decrypted).toEqual(messageStr)
    const decryptedFalse = Crypto.decryptAsymmetricAsStr(
      encrypted,
      bob.publicKey,
      bob.secretKey
    )
    expect(decryptedFalse).toEqual(false)
  })
  it('should encrypt and decrypt asymmetrical (UInt8Array)', () => {
    const encrypted = Crypto.encryptAsymmetric(
      message,
      alice.publicKey,
      bob.secretKey
    )
    expect(encrypted).not.toEqual(message)
    const decrypted = Crypto.decryptAsymmetric(
      encrypted,
      bob.publicKey,
      alice.secretKey
    )
    expect(decrypted).toEqual(message)
  })
})
