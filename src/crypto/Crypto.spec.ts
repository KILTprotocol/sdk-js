import * as string from '@polkadot/util/string'

import Identity from '../identity/Identity'
import Crypto from './index'

describe('Crypto', () => {
  // TODO: create static objects for testing
  const alice = Identity.buildFromMnemonic()
  const bob = Identity.buildFromMnemonic()

  const messageStr = 'This is a test'
  const message = new Uint8Array(string.stringToU8a(messageStr))

  it('should sign and verify (UInt8Array)', () => {
    // @ts-ignore
    const signature = Crypto.sign(message, alice.signKeyringPair)
    expect(signature).not.toBeFalsy()
    expect(Crypto.verify(message, signature, alice.address)).toBe(true)

    expect(Crypto.verify(message, signature, bob.address)).toBe(false)
    expect(
      Crypto.verify(new Uint8Array([0, 0, 0]), signature, alice.address)
    ).toBe(false)
  })

  it('should sign and verify (string)', () => {
    // @ts-ignore
    const signature = Crypto.signStr(messageStr, alice.signKeyringPair)
    expect(signature).not.toBeFalsy()
    expect(Crypto.verify(messageStr, signature, alice.signPublicKeyAsHex)).toBe(
      true
    )

    expect(Crypto.verify(messageStr, signature, bob.signPublicKeyAsHex)).toBe(
      false
    )
    expect(Crypto.verify('0x000000', signature, alice.signPublicKeyAsHex)).toBe(
      false
    )
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

  it('should encrypt and decrypt asymmetrical (string)', () => {
    const encrypted = Crypto.encryptAsymmetricAsStr(
      messageStr,
      alice.boxPublicKeyAsHex,
      // @ts-ignore
      bob.boxKeyPair.secretKey
    )
    expect(encrypted).not.toEqual(messageStr)

    const decrypted = Crypto.decryptAsymmetricAsStr(
      encrypted,
      bob.boxPublicKeyAsHex,
      // @ts-ignore
      alice.boxKeyPair.secretKey
    )
    expect(decrypted).toEqual(messageStr)
    const decryptedFalse = Crypto.decryptAsymmetricAsStr(
      encrypted,
      bob.boxPublicKeyAsHex,
      // @ts-ignore
      bob.boxKeyPair.secretKey
    )
    expect(decryptedFalse).toEqual(false)
  })

  it('should encrypt and decrypt asymmetrical (UInt8Array)', () => {
    const encrypted = Crypto.encryptAsymmetric(
      message,
      // @ts-ignore
      alice.boxKeyPair.publicKey,
      // @ts-ignore
      bob.boxKeyPair.secretKey
    )
    expect(encrypted).not.toEqual(message)

    const decrypted = Crypto.decryptAsymmetric(
      encrypted,
      // @ts-ignore
      bob.boxKeyPair.publicKey,
      // @ts-ignore
      alice.boxKeyPair.secretKey
    )
    expect(decrypted).toEqual(message)
  })
})
