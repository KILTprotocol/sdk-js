import * as NaCl from '@polkadot/util-crypto/nacl'
import * as u8aUtil from '@polkadot/util/u8a'
import Identity from './Identity'

describe('Identity', () => {
  // https://polkadot.js.org/api/examples/promise/
  // testing to create correct demo accounts
  it('should create known identities', () => {
    const alice = Identity.buildFromSeedString('Alice')

    expect(alice.phrase).toBeUndefined()
    expect(alice.seedAsHex).toEqual(
      '0x416c696365202020202020202020202020202020202020202020202020202020'
    )
    expect(u8aUtil.u8aToHex(alice.signKeyPair.secretKey)).toEqual(
      '0x416c696365202020202020202020202020202020202020202020202020202020d172a74cda4c865912c32ba0a80a57ae69abae410e5ccb59dee84e2f4432db4f'
    )

    expect(alice.signKeyringPair.address()).toEqual(
      '5GoKvZWG5ZPYL1WUovuHW3zJBWBP5eT8CbqjdRY4Q6iMaDtZ'
    )

    expect(u8aUtil.u8aToHex(alice.signKeyringPair.publicKey())).toEqual(
      '0xd172a74cda4c865912c32ba0a80a57ae69abae410e5ccb59dee84e2f4432db4f'
    )
  })

  it('should create different identities with random phrases', () => {
    const alice = Identity.buildFromMnemonic()
    const bob = Identity.buildFromMnemonic()

    expect(alice.phrase).not.toBeFalsy()
    expect(alice.signKeyPair.publicKey).not.toBeFalsy()
    expect(alice.boxKeyPair.publicKey).not.toBeFalsy()
    expect(alice.signKeyPair.secretKey).not.toBeFalsy()
    expect(alice.boxKeyPair.secretKey).not.toBeFalsy()
    expect(alice.seed).not.toBeFalsy()
    expect(alice.seedAsHex).not.toBeFalsy()

    expect(alice.phrase).not.toEqual(bob.phrase)
    expect(alice.signKeyPair.publicKey).not.toEqual(bob.signKeyPair.publicKey)
    expect(alice.signKeyPair.secretKey).not.toEqual(bob.signKeyPair.secretKey)
    expect(alice.boxKeyPair.publicKey).not.toEqual(bob.boxKeyPair.publicKey)
    expect(alice.boxKeyPair.secretKey).not.toEqual(bob.boxKeyPair.secretKey)
    expect(alice.seed).not.toEqual(bob.seed)
    expect(alice.seedAsHex).not.toEqual(bob.seedAsHex)
  })

  it('should restore identity based on phrase', () => {
    const expectedPhrase =
      'taxi toddler rally tonight certain tired program settle topple what execute few'
    const alice = Identity.buildFromMnemonic(expectedPhrase)

    expect(alice.phrase).toEqual(expectedPhrase)
    expect(u8aUtil.u8aToHex(alice.signKeyPair.publicKey)).toEqual(
      '0x3cd649d521d0fa29da940accd9944b60ec72948e2666adb84493b3e35303fb29'
    )
    expect(u8aUtil.u8aToHex(alice.signKeyPair.secretKey)).toEqual(
      '0xb29b07cad072e729f3745035917af307ab74b2bd7efdb8454742192c22f0521d3cd649d521d0fa29da940accd9944b60ec72948e2666adb84493b3e35303fb29'
    )

    expect(u8aUtil.u8aToHex(alice.boxKeyPair.publicKey)).toEqual(
      '0xaf57dd23e369c7c93d97891c0a509260c3d52a9485d4f8eb2f8a983688aaac11'
    )
    expect(u8aUtil.u8aToHex(alice.boxKeyPair.secretKey)).toEqual(
      '0x43d7ab1427761c7f773c313b3d33edeb3379ef356ef10a5eefc77dd999754ba9'
    )
  })

  it('should have different (secret) keys for signing and boxing', () => {
    const alice = Identity.buildFromMnemonic()
    expect(alice.signKeyPair.secretKey.length).not.toEqual(
      alice.boxKeyPair.secretKey.length
    )
    expect(alice.signKeyPair.secretKey).not.toEqual(alice.boxKeyPair.secretKey)
    expect(alice.signKeyPair.publicKey).not.toEqual(alice.boxKeyPair.publicKey)
  })

  it('should fail creating identity based on invalid phrase', () => {
    const phraseWithUnknownWord =
      'taxi toddler rally tonight certain tired program settle topple what execute stew' // stew instead of few
    expect(() =>
      Identity.buildFromMnemonic(phraseWithUnknownWord)
    ).toThrowError()

    const phraseTooLong =
      'taxi toddler rally tonight certain tired program settle topple what execute' // stew instead of few
    expect(() => Identity.buildFromMnemonic(phraseTooLong)).toThrowError()
  })

  it('should restore signing keypair from secret', () => {
    const alice = Identity.buildFromMnemonic()
    const aliceKeypair = NaCl.naclKeypairFromSecret(alice.signKeyPair.secretKey)
    expect(aliceKeypair.secretKey).toEqual(alice.signKeyPair.secretKey)
    expect(aliceKeypair.publicKey).toEqual(alice.signKeyPair.publicKey)

    const bob = Identity.buildFromMnemonic()
    const bobKeypair = NaCl.naclKeypairFromSecret(bob.signKeyPair.secretKey)
    expect(bobKeypair.secretKey).not.toEqual(alice.signKeyPair.secretKey)
    expect(bobKeypair.publicKey).not.toEqual(alice.signKeyPair.publicKey)
  })
})
