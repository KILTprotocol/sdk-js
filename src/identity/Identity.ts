/**
 * Identities are a core building block of the KILT SDK.
 * An Identity object represent an **entity** - be it a person, an organization, a machine or some other entity.
 *
 * An Identity object can be built via a seed phrase or other. It has a signature keypair, an associated public address, and an encryption ("boxing") keypair. These are needed to:
 * * create a signed [[Claim]], an [[Attestation]] or other (and verify these later).
 * * encrypt messages between participants.
 *
 * Note: A [[PublicIdentity]] object exposes only public information such as the public address, but doesn't expose any secrets such as private keys.
 *
 * @module Identity
 * @preferred
 */

/**
 * Dummy comment needed for correct doc display, do not remove.
 */
import { SubmittableExtrinsic } from '@polkadot/api/SubmittableExtrinsic'
import { Keyring } from '@polkadot/keyring'
import { KeyringPair } from '@polkadot/keyring/types'
import generate from '@polkadot/util-crypto/mnemonic/generate'
import toSeed from '@polkadot/util-crypto/mnemonic/toSeed'
import validate from '@polkadot/util-crypto/mnemonic/validate'
import * as u8aUtil from '@polkadot/util/u8a'
import { hexToU8a } from '@polkadot/util/hex'
import { SubscriptionResult, CodecResult } from '@polkadot/api/promise/types'
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

type BoxPublicKey =
  | PublicIdentity['boxPublicKeyAsHex']
  | Identity['boxKeyPair']['publicKey']

export default class Identity extends PublicIdentity {
  private static ADDITIONAL_ENTROPY_FOR_HASHING = new Uint8Array([1, 2, 3])

  /**
   * [STATIC] Generates Mnemonic phrase used to create identities from phrase seed.
   *
   * @returns Randomly generated [[BIP39]](https://www.npmjs.com/package/bip39) mnemonic phrase (Secret phrase).
   * @example
   * ```javascript
   * Identity.generateMnemonic();
   * // returns: "coast ugly state lunch repeat step armed goose together pottery bind mention"
   * ```
   */
  public static generateMnemonic(): string {
    return generate()
  }

  /**
   * [STATIC] Builds an identity object from a mnemonic string.
   *
   * @param phraseArg - [[BIP39]](https://www.npmjs.com/package/bip39) Mnemonic word phrase (Secret phrase).
   * @returns An [[Identity]].
   *
   * @example
   * ```javascript
   * Identity.buildFromMnemonic(mnemonic);
   * ```
   */
  public static buildFromMnemonic(phraseArg?: string): Identity {
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
   * [STATIC] Builds an [[Identity]], generated from a seed hex string.
   *
   * @param seedArg - Seed as hex string (Starting with 0x).
   * @returns  An [[Identity]]
   * @example
   * ```javascript
   * Identity.buildFromSeedString(seed);
   * ```
   */
  public static buildFromSeedString(seedArg: string): Identity {
    const asU8a = hexToU8a(seedArg)
    return Identity.buildFromSeed(asU8a)
  }

  /**
   * [STATIC] Builds a new [[Identity]], generated from a seed (Secret Seed).
   *
   * @param seed - A seed as an Uint8Array with 24 arbitrary numbers.
   * @returns An [[Identity]].
   * @example
   * ```javascript
   * Identity.buildFromSeed(seed);
   * ```
   */
  public static buildFromSeed(seed: Uint8Array): Identity {
    const keyring = new Keyring({ type: 'ed25519' })
    const keyringPair = keyring.addFromSeed(seed)
    return new Identity(seed, keyringPair)
  }

  /**
   * [STATIC] Builds a new [[Identity]], generated from a uniform resource identifier (URI).
   *
   * @param uri - Standard identifiers.
   * @returns  An [[Identity]].
   * @example
   * ```javascript
   * Identity.buildFromURI('//Bob');
   * ```
   */
  public static buildFromURI(uri: string): Identity {
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

  /**
   * Returns the [[PublicIdentity]] (identity's address and public key) of the Identity.
   * Can be given to third-parties to communicate and process signatures.
   *
   * @returns The [[PublicIdentity]], corresponding to the [[Identity]].
   * @example
   * ```javascript
   * // provides a PublicIdentity
   * identity.getPublicIdentity();
   * ```
   */
  public getPublicIdentity(): PublicIdentity {
    const { address, boxPublicKeyAsHex } = this
    return { address, boxPublicKeyAsHex }
  }

  /**
   * Signs data with an [[Identity]] object's key.
   *
   * @param cryptoInput - The data to be signed.
   * @returns The signed data.
   * @example
   * ```javascript
   * identity.sign(data);
   * ```
   */
  public sign(cryptoInput: CryptoInput): Uint8Array {
    return Crypto.sign(cryptoInput, this.signKeyringPair)
  }

  /**
   * Signs data with an [[Identity]] object's key returns it as string.
   *
   * @param cryptoInput - The data to be signed.
   * @returns The signed data.
   * @example
   * ```javascript
   * identity.signStr(data);
   * ```
   */
  public signStr(cryptoInput: CryptoInput): string {
    return Crypto.signStr(cryptoInput, this.signKeyringPair)
  }

  /**
   * Encrypts data asymmetrically and returns it as string.
   *
   * @param cryptoInput - The data to be encrypted.
   * @param boxPublicKey - The public key of the receiver of the encrypted data.
   * @returns The encrypted data.
   * @example
   * ```javascript
   * identity.encryptAsymmetricAsStr(messageStr, PublicIdentity.boxPublicKeyAsHex);
   * ```
   */
  public encryptAsymmetricAsStr(
    cryptoInput: CryptoInput,
    boxPublicKey: BoxPublicKey
  ): Crypto.EncryptedAsymmetricString {
    return Crypto.encryptAsymmetricAsStr(
      cryptoInput,
      boxPublicKey,
      this.boxKeyPair.secretKey
    )
  }

  /**
   * Decrypts data asymmetrical and returns it as string.
   *
   * @param encrypted - The encrypted data.
   * @param boxPublicKey - The public key of the sender of the encrypted data.
   * @returns The decrypted data.
   * @example
   * ```javascript
   * identity.decryptAsymmetricAsStr(encryptedData, PublicIdentity.boxPublicKeyAsHex);
   * // decrypted data
   * ```
   */
  public decryptAsymmetricAsStr(
    encrypted: EncryptedAsymmetric | EncryptedAsymmetricString,
    boxPublicKey: BoxPublicKey
  ): string | false {
    return Crypto.decryptAsymmetricAsStr(
      encrypted,
      boxPublicKey,
      this.boxKeyPair.secretKey
    )
  }

  /**
   * Encrypts data asymmetrically and returns it as a byte array.
   *
   * @param input - The data to be encrypted.
   * @param boxPublicKey - The public key of the receiver of the encrypted data.
   * @returns The encrypted data.
   * @example
   * ```javascript
   * identity.encryptAsymmetric(data, PublicIdentity.boxPublicKeyAsHex);
   * // encrypted data
   * ```
   */
  public encryptAsymmetric(
    input: CryptoInput,
    boxPublicKey: BoxPublicKey
  ): Crypto.EncryptedAsymmetric {
    return Crypto.encryptAsymmetric(
      input,
      boxPublicKey,
      this.boxKeyPair.secretKey
    )
  }

  /**
   * Decrypts data asymmetrical and returns it as a byte array.
   *
   * @param encrypted - The encrypted data.
   * @param boxPublicKey - The public key of the sender of the encrypted data.
   * @returns The decrypted data.
   * @example
   * ```javascript
   * identity.decryptAsymmetric(encryptedData, PublicIdentity.boxPublicKeyAsHex);
   * // decrypted data
   * ```
   */
  public decryptAsymmetric(
    encrypted: EncryptedAsymmetric | EncryptedAsymmetricString,
    boxPublicKey: BoxPublicKey
  ): false | Uint8Array {
    return Crypto.decryptAsymmetric(
      encrypted,
      boxPublicKey,
      this.boxKeyPair.secretKey
    )
  }

  /**
   * Signs a submittable extrinsic (transaction), in preparation to pushing it to the blockchain.
   *
   * @param submittableExtrinsic - A chain transaction.
   * @param nonceAsHex - The nonce of the address operating the transaction.
   * @returns The signed SubmittableExtrinsic.
   * @example
   * ```javascript
   * identity.signSubmittableExtrinsic(tx, nonce.tohex());
   * // A signed chain transaction
   * ```
   */
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
  private static createBoxKeyPair(seed: Uint8Array): nacl.BoxKeyPair {
    const paddedSeed = new Uint8Array(
      seed.length + Identity.ADDITIONAL_ENTROPY_FOR_HASHING.length
    )
    paddedSeed.set(seed)
    paddedSeed.set(Identity.ADDITIONAL_ENTROPY_FOR_HASHING, seed.length)

    const hash = Crypto.hash(paddedSeed)
    return nacl.box.keyPair.fromSecretKey(hash)
  }
}
