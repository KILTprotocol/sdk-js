import * as u8aUtil from '@polkadot/util/u8a'
import Identity from './Identity'
import { coToUInt8 } from '../crypto/Crypto'
import constants from '../test/constants'
import AttesterIdentity from '../attesteridentity/AttesterIdentity'

describe('Identity', () => {
  // https://polkadot.js.org/api/examples/promise/
  // testing to create correct demo accounts
  it('should create known identities', async () => {
    const alice = await Identity.buildFromURI('//Alice')

    expect(alice.seedAsHex).toEqual(
      '0x2f2f416c69636520202020202020202020202020202020202020202020202020'
    )

    expect(alice.getAddress()).toEqual(
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
    expect(alice.getBoxPublicKey()).not.toEqual(bob.getBoxPublicKey())
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
      '0x89bd53e9cde92516291a674475f41cc3d66f3db97463c92252e5c5b575ab9d0c'
    )

    // @ts-ignore
    expect(u8aUtil.u8aToHex(alice.boxKeyPair.publicKey)).toEqual(
      '0x501850cea2751cb16488fbcdf1219c099c0ab03a1f8570b725f9fcf51f0d4b32'
    )
    // @ts-ignore
    expect(u8aUtil.u8aToHex(alice.boxKeyPair.secretKey)).toEqual(
      '0x502a3b640768b87bedecf164b2a8dbe3b922babbe3d8f7803d0af413a3768f2b'
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
    const alice = await AttesterIdentity.buildFromMnemonicAndKey(
      constants.PUBLIC_KEY.valueOf(),
      constants.PRIVATE_KEY.valueOf()
    )

    const msgSession = await alice.initiateAttestation()
    expect(msgSession.session).toBeDefined()
    expect(msgSession.message).toBeDefined()
  })
})
