import Identity from './Identity'
import * as NaCl from '@polkadot/util-crypto/nacl'

describe('Identity', () => {
  it('should create different identities with random phrases', () => {
    const alice = new Identity()
    const bob = new Identity()

    expect(alice.phrase).not.toBeFalsy()
    expect(alice.signKeyPair.publicKey).not.toBeFalsy()
    expect(alice.boxKeyPair.publicKey).not.toBeFalsy()
    expect(alice.signKeyPair.secretKey).not.toBeFalsy()
    expect(alice.boxKeyPair.secretKey).not.toBeFalsy()

    expect(alice.phrase).not.toEqual(bob.phrase)
    expect(alice.signKeyPair.publicKey).not.toEqual(bob.signKeyPair.publicKey)
    expect(alice.signKeyPair.secretKey).not.toEqual(bob.signKeyPair.secretKey)
    expect(alice.boxKeyPair.publicKey).not.toEqual(bob.boxKeyPair.publicKey)
    expect(alice.boxKeyPair.secretKey).not.toEqual(bob.boxKeyPair.secretKey)
  })

  it('should restore identity based on phrase', () => {
    const expectedPhrase = 'taxi toddler rally tonight certain tired program settle topple what execute few'
    const alice = new Identity(expectedPhrase)

    expect(alice.phrase).toEqual(expectedPhrase)
    expect(alice.signKeyPair.publicKey).toEqual(new Uint8Array([60, 214, 73, 213, 33, 208, 250, 41, 218, 148, 10, 204, 217, 148, 75, 96, 236, 114, 148, 142, 38, 102, 173, 184, 68, 147, 179, 227, 83, 3, 251, 41]))
    expect(alice.signKeyPair.secretKey).toEqual(new Uint8Array([178, 155, 7, 202, 208, 114, 231, 41, 243, 116, 80, 53, 145, 122, 243, 7, 171, 116, 178, 189, 126, 253, 184, 69, 71, 66, 25, 44, 34, 240, 82, 29, 60, 214, 73, 213, 33, 208, 250, 41, 218, 148, 10, 204, 217, 148, 75, 96, 236, 114, 148, 142, 38, 102, 173, 184, 68, 147, 179, 227, 83, 3, 251, 41]))

    expect(alice.boxKeyPair.publicKey).toEqual(new Uint8Array([175, 87, 221, 35, 227, 105, 199, 201, 61, 151, 137, 28, 10, 80, 146, 96, 195, 213, 42, 148, 133, 212, 248, 235, 47, 138, 152, 54, 136, 170, 172, 17]))
    expect(alice.boxKeyPair.secretKey).toEqual(new Uint8Array([67, 215, 171, 20, 39, 118, 28, 127, 119, 60, 49, 59, 61, 51, 237, 235, 51, 121, 239, 53, 110, 241, 10, 94, 239, 199, 125, 217, 153, 117, 75, 169]))

  })

  it('should have different (secret) keys for signing and boxing', () => {
    const alice = new Identity()
    expect(alice.signKeyPair.secretKey.length).not.toEqual(alice.boxKeyPair.secretKey.length)
    expect(alice.signKeyPair.secretKey).not.toEqual(alice.boxKeyPair.secretKey)
    expect(alice.signKeyPair.publicKey).not.toEqual(alice.boxKeyPair.publicKey)
  })

  it('should fail creating identity based on invalid phrase', () => {
    const expectedPhrase = 'taxi toddler rally tonight certain tired program settle topple what execute stew' // stew instead of few
    expect(() => new Identity(expectedPhrase)).toThrowError()
  })

  it('should restore signing keypair from secret', () => {
    const alice = new Identity()
    const aliceKeypair = NaCl.naclKeypairFromSecret(alice.signKeyPair.secretKey)
    expect(aliceKeypair.secretKey).toEqual(alice.signKeyPair.secretKey)
    expect(aliceKeypair.publicKey).toEqual(alice.signKeyPair.publicKey)

    const bob = new Identity()
    const bobKeypair = NaCl.naclKeypairFromSecret(bob.signKeyPair.secretKey)
    expect(bobKeypair.secretKey).not.toEqual(alice.signKeyPair.secretKey)
    expect(bobKeypair.publicKey).not.toEqual(alice.signKeyPair.publicKey)
  })

})
