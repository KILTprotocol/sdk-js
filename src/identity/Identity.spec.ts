import * as u8aUtil from '@polkadot/util/u8a'
import Identity from './Identity'
import { coToUInt8 } from '../crypto/Crypto'
import constants from '../test/constants'

describe('Identity', () => {
  // https://polkadot.js.org/api/examples/promise/
  // testing to create correct demo accounts
  it('should create known identities', async () => {
    const alice = await Identity.buildFromURI('//Alice')

    expect(alice.seedAsHex).toEqual(
      '0x2f2f416c69636520202020202020202020202020202020202020202020202020'
    )

    expect(alice.address).toEqual(
      '5DkmtHGyAWY3kNvfYv4xGfyb3NLpJF6ZTKkHv76w1m6cEy1M'
    )

    // @ts-ignore
    expect(u8aUtil.u8aToHex(alice.signKeyringPair.publicKey)).toEqual(
      '0x4acb9bc1db9af5512d91da6461e362ebf0e6500f5ee36d39adc476e2558f9477'
    )
  })

  it('should create different identities with random phrases', async () => {
    const alice = await Identity.buildFromMnemonic()
    const bob = await Identity.buildFromMnemonic()

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

  it('should restore identity based on phrase', async () => {
    const expectedPhrase =
      'taxi toddler rally tonight certain tired program settle topple what execute few'
    const alice = await Identity.buildFromMnemonic(expectedPhrase)

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

  it('should have different keys for signing and boxing', async () => {
    const alice = await Identity.buildFromMnemonic()
    expect(coToUInt8(alice.signPublicKeyAsHex)).not.toEqual(
      // @ts-ignore
      alice.boxKeyPair.publicKey
    )
  })

  it('should fail creating identity based on invalid phrase', async () => {
    const phraseWithUnknownWord =
      'taxi toddler rally tonight certain tired program settle topple what execute stew' // stew instead of few
    await expect(
      Identity.buildFromMnemonic(phraseWithUnknownWord)
    ).rejects.toThrowError()

    const phraseTooLong =
      'taxi toddler rally tonight certain tired program settle topple what execute' // stew instead of few
    await expect(
      Identity.buildFromMnemonic(phraseTooLong)
    ).rejects.toThrowError()
  })

  it('should have different keys for signing and boxing', async () => {
    const alice = await Identity.buildFromMnemonic()
    expect(coToUInt8(alice.signPublicKeyAsHex)).not.toEqual(
      // @ts-ignore
      alice.boxKeyPair.publicKey
    )
  })

  it('should initiate attestation with gabi keys (PE)', async () => {
    const alice = await Identity.buildFromMnemonic()
    alice.loadGabiKeys(constants.pubKey, constants.privKey)
    const msgSession = await alice.initiateAttestation()
    expect(msgSession.session).toBeDefined()
    expect(msgSession.message).toBeDefined()
  })

  it('should raise error without gabi keys (PE)', async () => {
    const alice = await Identity.buildFromMnemonic()
    expect(alice.initiateAttestation()).rejects.toThrowError()
  })
})
