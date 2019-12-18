import * as u8aUtil from '@polkadot/util/u8a'
import Identity from './Identity'
import { coToUInt8 } from '../crypto/Crypto'

describe('Identity', () => {
  // https://polkadot.js.org/api/examples/promise/
  // testing to create correct demo accounts
  it('should create known identities', () => {
    const alice = Identity.buildFromURI('//Alice')

    expect(alice.seedAsHex).toEqual('0x2f2f416c696365')

    expect(alice.address).toEqual(
      '5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TTpu'
    )

    // @ts-ignore
    expect(u8aUtil.u8aToHex(alice.signKeyringPair.publicKey)).toEqual(
      '0x88dc3417d5058ec4b4503e0c12ea1a0a89be200fe98922423d4334014fa6b0ee'
    )
  })

  it('should create different identities with random phrases', () => {
    const alice = Identity.buildFromMnemonic()
    const bob = Identity.buildFromMnemonic()

    expect(alice.signPublicKeyAsHex).not.toBeFalsy()
    // @ts-ignore
    expect(alice.boxKeyPair.publicKey).not.toBeFalsy()
    // @ts-ignore
    expect(alice.boxKeyPair.secretKey).not.toBeFalsy()
    expect(alice.seed).not.toBeFalsy()
    expect(alice.seedAsHex).not.toBeFalsy()

    expect(alice.signPublicKeyAsHex).not.toEqual(bob.signPublicKeyAsHex)
    // @ts-ignore
    expect(alice.boxPublicKeyAsHex).not.toEqual(bob.boxPublicKeyAsHex)
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
    expect(alice.signPublicKeyAsHex).toEqual(
      '0x3cd649d521d0fa29da940accd9944b60ec72948e2666adb84493b3e35303fb29'
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

  it('should have different keys for signing and boxing', () => {
    const alice = Identity.buildFromMnemonic()
    expect(coToUInt8(alice.signPublicKeyAsHex)).not.toEqual(
      // @ts-ignore
      alice.boxKeyPair.publicKey
    )
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
})
