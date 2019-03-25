import * as NaCl from '@polkadot/util-crypto/nacl'
import * as u8aUtil from '@polkadot/util/u8a'
import Identity from './Identity'

describe('Identity', () => {
  // https://polkadot.js.org/api/examples/promise/
  // testing to create correct demo accounts
  it('should create known identities', () => {
    const alice = Identity.buildFromSeedString('Alice')

    expect(alice.seedAsHex).toEqual(
      '0x416c696365202020202020202020202020202020202020202020202020202020'
    )
    // @ts-ignore
    expect(u8aUtil.u8aToHex(alice.signKeyPair.secretKey)).toEqual(
      '0x416c696365202020202020202020202020202020202020202020202020202020d172a74cda4c865912c32ba0a80a57ae69abae410e5ccb59dee84e2f4432db4f'
    )

    expect(alice.address).toEqual(
      '5GoKvZWG5ZPYL1WUovuHW3zJBWBP5eT8CbqjdRY4Q6iMaDtZ'
    )

    // @ts-ignore
    expect(u8aUtil.u8aToHex(alice.signKeyringPair.publicKey())).toEqual(
      '0xd172a74cda4c865912c32ba0a80a57ae69abae410e5ccb59dee84e2f4432db4f'
    )
  })

  it('should create different identities with random phrases', () => {
    const alice = Identity.buildFromMnemonic()
    const bob = Identity.buildFromMnemonic()

    // @ts-ignore
    expect(alice.signKeyPair.publicKey).not.toBeFalsy()
    // @ts-ignore
    expect(alice.boxKeyPair.publicKey).not.toBeFalsy()
    // @ts-ignore
    expect(alice.signKeyPair.secretKey).not.toBeFalsy()
    // @ts-ignore
    expect(alice.boxKeyPair.secretKey).not.toBeFalsy()
    expect(alice.seed).not.toBeFalsy()
    expect(alice.seedAsHex).not.toBeFalsy()

    // @ts-ignore
    expect(alice.signKeyPair.publicKey).not.toEqual(bob.signKeyPair.publicKey)
    // @ts-ignore
    expect(alice.signKeyPair.secretKey).not.toEqual(bob.signKeyPair.secretKey)
    // @ts-ignore
    expect(alice.boxKeyPair.publicKey).not.toEqual(bob.boxKeyPair.publicKey)
    // @ts-ignore
    expect(alice.boxKeyPair.secretKey).not.toEqual(bob.boxKeyPair.secretKey)
    expect(alice.seed).not.toEqual(bob.seed)
    expect(alice.seedAsHex).not.toEqual(bob.seedAsHex)
  })

  it('should restore identity based on phrase', () => {
    const expectedPhrase =
      'taxi toddler rally tonight certain tired program settle topple what execute few'
    const alice = Identity.buildFromMnemonic(expectedPhrase)

    // @ts-ignore
    expect(u8aUtil.u8aToHex(alice.signKeyPair.publicKey)).toEqual(
      '0x3cd649d521d0fa29da940accd9944b60ec72948e2666adb84493b3e35303fb29'
    )
    // @ts-ignore
    expect(u8aUtil.u8aToHex(alice.signKeyPair.secretKey)).toEqual(
      '0xb29b07cad072e729f3745035917af307ab74b2bd7efdb8454742192c22f0521d3cd649d521d0fa29da940accd9944b60ec72948e2666adb84493b3e35303fb29'
    )

    // @ts-ignore
    expect(u8aUtil.u8aToHex(alice.boxKeyPair.publicKey)).toEqual(
      '0x7dbec771d890b6b15456a407771eef290119a164a60158cf76970168d362304d'
    )
    // @ts-ignore
    expect(u8aUtil.u8aToHex(alice.boxKeyPair.secretKey)).toEqual(
      '0x0eaa3cae227044959659476bcbffafd38b2acb201c9cf63f079284f76bf5d28f'
    )
  })

  it('should have different (secret) keys for signing and boxing', () => {
    const alice = Identity.buildFromMnemonic()
    // @ts-ignore
    expect(alice.signKeyPair.secretKey.length).not.toEqual(
      // @ts-ignore
      alice.boxKeyPair.secretKey.length
    )
    // @ts-ignore
    expect(alice.signKeyPair.secretKey).not.toEqual(alice.boxKeyPair.secretKey)
    // @ts-ignore
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
    // @ts-ignore
    const aliceKeypair = NaCl.naclKeypairFromSecret(alice.signKeyPair.secretKey)
    // @ts-ignore
    expect(aliceKeypair.secretKey).toEqual(alice.signKeyPair.secretKey)
    // @ts-ignore
    expect(aliceKeypair.publicKey).toEqual(alice.signKeyPair.publicKey)

    const bob = Identity.buildFromMnemonic()
    // @ts-ignore
    const bobKeypair = NaCl.naclKeypairFromSecret(bob.signKeyPair.secretKey)
    // @ts-ignore
    expect(bobKeypair.secretKey).not.toEqual(alice.signKeyPair.secretKey)
    // @ts-ignore
    expect(bobKeypair.publicKey).not.toEqual(alice.signKeyPair.publicKey)
  })
})
