import Identity from './Identity'
import * as NaCl from '@polkadot/util-crypto/nacl'

describe('Identity', () => {
  it('should create different identities with random phrases', () => {
    const alice = new Identity()
    const bob = new Identity()

    expect(alice.phrase).not.toBeFalsy()
    expect(alice.seedAsHex).not.toBeFalsy()
    expect(alice.seed).not.toBeFalsy()
    expect(alice.publicKey).not.toBeFalsy()
    expect(alice.secretKey).not.toBeFalsy()
    expect(alice.publicKeyAsHex).not.toBeFalsy()

    expect(alice.phrase).not.toEqual(bob.phrase)
    expect(alice.seedAsHex).not.toEqual(bob.seedAsHex)
    expect(alice.seed).not.toEqual(bob.seed)
    expect(alice.publicKey).not.toEqual(bob.seed)
    expect(alice.secretKey).not.toEqual(bob.secretKey)
    expect(alice.publicKeyAsHex).not.toEqual(bob.publicKeyAsHex)
  })

  it('should restore identity based on phrase', () => {
    const expectedPhrase = 'taxi toddler rally tonight certain tired program settle topple what execute few'
    const alice = new Identity(expectedPhrase)

    expect(alice.phrase).toEqual(expectedPhrase)
    expect(alice.seedAsHex).toEqual('0xb29b07cad072e729f3745035917af307ab74b2bd7efdb8454742192c22f0521d')
    expect(alice.seed).toEqual(new Uint8Array([178, 155, 7, 202, 208, 114, 231, 41, 243, 116, 80, 53, 145, 122, 243, 7, 171, 116, 178, 189, 126, 253, 184, 69, 71, 66, 25, 44, 34, 240, 82, 29]))
    expect(alice.publicKey).toEqual(new Uint8Array([60, 214, 73, 213, 33, 208, 250, 41, 218, 148, 10, 204, 217, 148, 75, 96, 236, 114, 148, 142, 38, 102, 173, 184, 68, 147, 179, 227, 83, 3, 251, 41]))
    expect(alice.secretKey).toEqual(new Uint8Array([178, 155, 7, 202, 208, 114, 231, 41, 243, 116, 80, 53, 145, 122, 243, 7, 171, 116, 178, 189, 126, 253, 184, 69, 71, 66, 25, 44, 34, 240, 82, 29, 60, 214, 73, 213, 33, 208, 250, 41, 218, 148, 10, 204, 217, 148, 75, 96, 236, 114, 148, 142, 38, 102, 173, 184, 68, 147, 179, 227, 83, 3, 251, 41]))
    expect(alice.publicKeyAsHex).toEqual('0x3cd649d521d0fa29da940accd9944b60ec72948e2666adb84493b3e35303fb29')
  })

  it('should fail creating identity based on invalid phrase', () => {
    const expectedPhrase = 'taxi toddler rally tonight certain tired program settle topple what execute stew' // stew instead of few
    expect(() => new Identity(expectedPhrase)).toThrowError()
  })

  it('should restore keypair from secret', () => {
    const alice = new Identity()
    const aliceKeypair = NaCl.naclKeypairFromSecret(alice.secretKey)
    expect(aliceKeypair.secretKey).toEqual(alice.secretKey)
    expect(aliceKeypair.publicKey).toEqual(alice.publicKey)

    const bob = new Identity()
    const bobKeypair = NaCl.naclKeypairFromSecret(bob.secretKey)
    expect(bobKeypair.secretKey).not.toEqual(alice.secretKey)
    expect(bobKeypair.publicKey).not.toEqual(alice.publicKey)
  })

})
