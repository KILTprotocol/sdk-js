import Identity from '../identity/Identity'
import * as string from '@polkadot/util/string'
// import * as u8a from '@polkadot/util/u8a'
import * as Crypto from './Crypto'

describe('Crypto', () => {

  const alice = new Identity()
  const bob = new Identity()

  const message = new Uint8Array(string.stringToU8a('This is a test'))

  it('should sign and verify', () => {
    const signature = Crypto.sign(message, alice.signKeyPair.secretKey)
    expect(Crypto.verify(message, signature, alice.signKeyPair.publicKey)).toBe(true)

    expect(Crypto.verify(message, signature, bob.signKeyPair.publicKey)).toBe(false)
    expect(Crypto.verify(new Uint8Array([0, 0, 0]), signature, alice.signKeyPair.publicKey)).toBe(false)
  })

  // https://polkadot.js.org/common/examples/util-crypto/01_encrypt_decrypt_message_nacl/
  it('should encrypt and decrypt symmetrical using random secret key', () => {
    const secret = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31])
    const data = Crypto.encryptSymmetric(message, secret)
    expect(Crypto.decryptSymmetric(data, secret)).toEqual(message)
  })

  it('should hash', () => {
    expect(Crypto.hash(message)).toHaveLength(32)
    expect(Crypto.hash(message)).toEqual(Crypto.hash(message))
    expect(Crypto.hash('123')).toEqual(Crypto.hash('123'))

    expect(Crypto.hash(new Uint8Array([0, 0, 0]))).not.toEqual(Crypto.hash(message))
    expect(Crypto.hash('123')).not.toEqual(Crypto.hash(message))
  })

  xit('should encrypt and decrypt asymmetrical', () => {
    const encrypted = Crypto.encryptAsymmetric(message, alice.boxKeyPair.publicKey, bob.boxKeyPair.secretKey)
    expect(encrypted).not.toEqual(message)

    const decrypted = Crypto.decryptAsymmetric(encrypted, bob.boxKeyPair.publicKey, alice.boxKeyPair.secretKey)
    expect(decrypted).toEqual(message)
  })
})
