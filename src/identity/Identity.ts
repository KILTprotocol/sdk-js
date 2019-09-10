/**
 * @module Identity
 */
import { SubmittableExtrinsic } from '@polkadot/api/SubmittableExtrinsic'
import { Keyring } from '@polkadot/keyring'
import { KeyringPair } from '@polkadot/keyring/types'
import generate from '@polkadot/util-crypto/mnemonic/generate'
import toSeed from '@polkadot/util-crypto/mnemonic/toSeed'
import validate from '@polkadot/util-crypto/mnemonic/validate'
import * as u8aUtil from '@polkadot/util/u8a'
import { hexToU8a } from '@polkadot/util/hex'
// see node_modules/@polkadot/util-crypto/nacl/keypair/fromSeed.js
// as util-crypto is providing a wrapper only for signing keypair
// and not for box keypair, we use TweetNaCl directly
import nacl, { BoxKeyPair } from 'tweetnacl'
import Crypto from '../crypto'
import {
  CryptoInput,
  EncryptedAsymmetric,
  EncryptedAsymmetricString,
} from '../crypto/Crypto'
import PublicIdentity from './PublicIdentity'
import { SubscriptionResult, CodecResult } from '@polkadot/api/promise/types'

type BoxPublicKey =
  | PublicIdentity['boxPublicKeyAsHex']
  | Identity['boxKeyPair']['publicKey']

export default class Identity extends PublicIdentity {
  private static ADDITIONAL_ENTROPY_FOR_HASHING = new Uint8Array([1, 2, 3])
  /**
   * @description [STATIC] Generates Mnemonic phrase used to create identities from phrase seed.
   * @returns `generate` randomly generated mnemonic phrase (Secret phrase)
   * @example
   * ```javascript
   *
   * Identity.generateMnemonic()
   * // (Output) mnemonic: "coast ugly state lunch repeat step armed goose together pottery bind mention"
   *
   * ```
   */
  public static generateMnemonic() {
    return generate()
  }

  /**
   * @description [STATIC] Builds an identity object from a mnemonic string.
   * @param phraseArg [[BIP39]](https://www.npmjs.com/package/bip39) Mnemonic word phrase. (Secret phrase)
   * @returns `Identity`
   *
   * @example
   *
   * ```javascript
   * //Build a Mnemonic to use as an argument
   *
   * const mnemonic = Identity.generateMnemonic()
   * // mnemonic: "coast ugly state lunch repeat step armed goose together pottery bind mention"
   *
   * const testIdentity = Identity.buildFromMnemonic(mnemonic)
   * //  (Output) Identity {
   * //             address: '5GwqmTBQHWi6M6Bjek2ppXLVMDVBHx6ND8rs9eh1PnCjZBkr',
   * //             boxPublicKeyAsHex: '0x26b353bb20038ff5068f00dd1d2a7bf4899a77bd9f6cf33c5ba267800d225872',
   * //             ...
   * //            }
   *
   * ```
   */
  public static buildFromMnemonic(phraseArg?: string) {
    let phrase = phraseArg
    if (phrase) {
      if (phrase.trim().split(/\s+/g).length < 12) {
        // https://www.npmjs.com/package/bip39
        throw Error(`Phrase '${phrase}' too long or malformed`)
      }
    } else {
      phrase = generate()
    }

    if (!validate(phrase)) {
      throw Error(`Invalid phrase '${phrase}'`)
    }

    const seed = toSeed(phrase)
    return Identity.buildFromSeed(seed)
  }

  /**
   * @description [STATIC] Builds an Identity, generated from a seed string as a hex.
   * @param seedArg as hex string. (Starting with 0x)
   * @returns  `Identity`
   * @example
   *
   * ```javascript
   *
   * // Using the Mnemonic below to generate an Identity.
   *
   * const mnemonic = "coast ugly state lunch repeat step armed goose together pottery bind mention";
   *
   * const testerIdentity = Kilt.Identity.buildFromMnemonic(mnemonic);
   *
   * const testerIdentityCheck = Kilt.Identity.buildFromSeed(tester.seed);
   *
   * // (Output) Address: '5HXfLqrqbKoKyi61YErwUrWEa1PWxikEojV7PCnLJgxrWd6W'
   * //          seedAsHex: '0x6ce9fd060c70165c0fc8da25810d249106d5df100aa980e0d9a11409d6b35261'
   *
   * ```
   */
  public static buildFromSeedString(seedArg: string) {
    const asU8a = hexToU8a(seedArg)
    return Identity.buildFromSeed(asU8a)
  }
  /**
   * @description [STATIC] Builds a new Identity, generated from a seed (Secret Seed).
   * @param seed as a Unit 8 Array
   * @returns `Identity`
   * @example
   *
   * ```javascript
   *
   * // Using the Mnemonic below to generate an Identity.
   *
   * const mnemonic = "coast ugly state lunch repeat step armed goose together pottery bind mention";
   *
   * const testerIdentity = Kilt.Identity.buildFromMnemonic(mnemonic);
   *
   * // (Output) testerIdentity.seed = seed: Uint8Array [
   * //           108, 233, 253,  6,  12, 112,  22,  92,
   * //           15, 200, 218, 37, 129,  13,  36, 145,
   * //           6, 213, 223, 16,  10, 169, 128, 224,
   * //           217, 161,  20,  9, 214, 179,  82,  97
   * //           ],
   *
   * const testerIdentityCheck = Kilt.Identity.buildFromSeed(tester.seed);
   *
   * // (Output) Address: '5HXfLqrqbKoKyi61YErwUrWEa1PWxikEojV7PCnLJgxrWd6W'
   *
   * ```
   */
  public static buildFromSeed(seed: Uint8Array) {
    const keyring = new Keyring({ type: 'ed25519' })
    const keyringPair = keyring.addFromSeed(seed)
    return new Identity(seed, keyringPair)
  }
  /**
   * @description [STATIC] Builds a new Identity, generated from a uniform resource identifier (URIs).
   * @param uri Standard identifiers (//Alice)
   * @returns `Identity` built from an URI
   * @example
   * ```javascript
   *
   * const identityBob = Identity.buildFromURI('//Bob')
   *
   * // Provides an URI.
   * // (output) URI of Bob: Identity {
   * //           address: '5GoNkf6WdbxCFnPdAnYYQyCjAKPJgLNxXwPjwTh6DGg6gcWn',
   * //           ...
   * //          }
   *
   * ```
   */
  public static buildFromURI(uri: string) {
    const keyring = new Keyring({ type: 'ed25519' })
    const derived = keyring.createFromUri(uri)
    // TODO: heck to create identity from //Alice
    return new Identity(u8aUtil.u8aToU8a(uri), derived)
  }

  public readonly seed: Uint8Array
  public readonly seedAsHex: string
  public readonly signPublicKeyAsHex: string

  private constructor(seed: Uint8Array, signKeyringPair: KeyringPair) {
    // NB: use different secret keys for each key pair in order to avoid
    // compromising both key pairs at the same time if one key becomes public
    // Maybe use BIP32 and BIP44
    const seedAsHex = u8aUtil.u8aToHex(seed)
    const address = signKeyringPair.address()

    const boxKeyPair = Identity.createBoxKeyPair(seed)
    const boxPublicKeyAsHex = u8aUtil.u8aToHex(boxKeyPair.publicKey)

    super(address, boxPublicKeyAsHex)

    this.seed = seed
    this.seedAsHex = seedAsHex

    this.signKeyringPair = signKeyringPair
    this.signPublicKeyAsHex = u8aUtil.u8aToHex(signKeyringPair.publicKey())

    this.boxKeyPair = boxKeyPair
  }

  private readonly signKeyringPair: KeyringPair
  private readonly boxKeyPair: BoxKeyPair

  public getPublicIdentity(): PublicIdentity {
    const { address, boxPublicKeyAsHex } = this
    return { address, boxPublicKeyAsHex }
  }

  public sign(cryptoInput: CryptoInput) {
    return Crypto.sign(cryptoInput, this.signKeyringPair)
  }

  /**
   * @description Signs for a message string with an Identity.
   * @param cryptoInput The 'CryptoInput' is raw data hashed.
   * @returns `Crypto.signStr(...)`
   * @example
   * ```javascript
   *
   * const alice = Identity.buildFromMnemonic()
   * // The identity is used to create a signature.
   *
   * alice.signStr()
   * // (output) 0x0327f479bb8a6914...afc68c3ab0bf4e8de004
   * ```
   */
  public signStr(cryptoInput: CryptoInput) {
    return Crypto.signStr(cryptoInput, this.signKeyringPair)
  }

  public encryptAsymmetricAsStr(
    cryptoInput: CryptoInput,
    boxPublicKey: BoxPublicKey
  ) {
    return Crypto.encryptAsymmetricAsStr(
      cryptoInput,
      boxPublicKey,
      this.boxKeyPair.secretKey
    )
  }

  public decryptAsymmetricAsStr(
    encrypted: EncryptedAsymmetric | EncryptedAsymmetricString,
    boxPublicKey: BoxPublicKey
  ) {
    return Crypto.decryptAsymmetricAsStr(
      encrypted,
      boxPublicKey,
      this.boxKeyPair.secretKey
    )
  }

  public encryptAsymmetric(input: CryptoInput, boxPublicKey: BoxPublicKey) {
    return Crypto.encryptAsymmetric(
      input,
      boxPublicKey,
      this.boxKeyPair.secretKey
    )
  }

  public decryptAsymmetric(
    encrypted: EncryptedAsymmetric | EncryptedAsymmetricString,
    boxPublicKey: BoxPublicKey
  ) {
    return Crypto.decryptAsymmetric(
      encrypted,
      boxPublicKey,
      this.boxKeyPair.secretKey
    )
  }

  public signSubmittableExtrinsic(
    submittableExtrinsic: SubmittableExtrinsic<CodecResult, SubscriptionResult>,
    nonceAsHex: string
  ): SubmittableExtrinsic<CodecResult, SubscriptionResult> {
    return submittableExtrinsic.sign(this.signKeyringPair, {
      nonce: nonceAsHex,
    })
  }

  // As nacl.box.keyPair.fromSeed() is not implemented here we do our own hashing in order to prohibit inferring the original seed from a secret key
  // To be sure that we don't generate the same hash by accidentally using the same hash algorithm we do some padding
  private static createBoxKeyPair(seed: Uint8Array) {
    const paddedSeed = new Uint8Array(
      seed.length + Identity.ADDITIONAL_ENTROPY_FOR_HASHING.length
    )
    paddedSeed.set(seed)
    paddedSeed.set(Identity.ADDITIONAL_ENTROPY_FOR_HASHING, seed.length)

    const hash = Crypto.hash(paddedSeed)
    return nacl.box.keyPair.fromSecretKey(hash)
  }
}
