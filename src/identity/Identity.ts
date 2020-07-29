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
 * @packageDocumentation
 * @module Identity
 * @preferred
 */

import { Claimer } from '@kiltprotocol/portablegabi'
import { SubmittableExtrinsic } from '@polkadot/api/promise/types'
import { Keyring } from '@polkadot/keyring'
import { KeyringPair } from '@polkadot/keyring/types'
import { mnemonicToMiniSecret } from '@polkadot/util-crypto'
import generate from '@polkadot/util-crypto/mnemonic/generate'
import validate from '@polkadot/util-crypto/mnemonic/validate'
import { hexToU8a } from '@polkadot/util/hex'
import * as u8aUtil from '@polkadot/util/u8a'
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
import * as SDKErrors from '../errorhandling/SDKErrors'
import PublicIdentity from './PublicIdentity'

type BoxPublicKey =
  | PublicIdentity['boxPublicKeyAsHex']
  | Identity['boxKeyPair']['publicKey']

/**
 * The minimal required length of the seed.
 */
const MIN_SEED_LENGTH = 32

function fillRight(
  data: Uint8Array,
  value: number,
  length: number
): Uint8Array {
  // pad seed if needed for claimer
  let paddedSeed = u8aUtil.u8aToU8a([...data])
  if (paddedSeed.length < length) {
    paddedSeed = u8aUtil.u8aToU8a([
      ...paddedSeed,
      ...new Array<number>(length - paddedSeed.length).fill(value),
    ])
  }
  return paddedSeed
}

export type IdentityBuildOptions = {
  peEnabled?: boolean
}

export default class Identity {
  private static ADDITIONAL_ENTROPY_FOR_HASHING = new Uint8Array([1, 2, 3])

  /**
   * [STATIC] Generates Mnemonic phrase used to create identities from phrase seed.
   *
   * @returns Randomly generated [BIP39](https://www.npmjs.com/package/bip39) mnemonic phrase (Secret phrase).
   * @example ```javascript
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
   * @param phraseArg - [BIP39](https://www.npmjs.com/package/bip39) Mnemonic word phrase (Secret phrase).
   * @param options The option object.
   * @param options.peEnabled - If the identity should be privacy enhanced, or not (default: false).
   * @throws When phraseArg contains fewer than 12 correctly separated mnemonic words.
   * @throws When the phraseArg could not be validated.
   * @throws [[ERROR_MNEMONIC_PHRASE_MALFORMED]], [[ERROR_MNEMONIC_PHRASE_INVALID]].
   * @returns An [[Identity]].
   *
   * @example ```javascript
   * const mnemonic = Identity.generateMnemonic();
   * // mnemonic: "coast ugly state lunch repeat step armed goose together pottery bind mention"
   *
   * await Identity.buildFromMnemonic(mnemonic);
   * ```
   */
  public static async buildFromMnemonic(
    phraseArg: string,
    { peEnabled = false }: IdentityBuildOptions = {}
  ): Promise<Identity> {
    let phrase = phraseArg
    if (phrase) {
      if (phrase.trim().split(/\s+/g).length < 12) {
        // https://www.npmjs.com/package/bip39
        throw SDKErrors.ERROR_MNEMONIC_PHRASE_MALFORMED()
      }
    } else {
      phrase = generate()
    }

    if (!validate(phrase)) {
      throw SDKErrors.ERROR_MNEMONIC_PHRASE_INVALID()
    }

    const seed = mnemonicToMiniSecret(phrase)
    return Identity.buildFromSeed(seed, { peEnabled })
  }

  /**
   * [STATIC] Builds an [[Identity]], generated from a seed hex string.
   *
   * @param seedArg - Seed as hex string (Starting with 0x).
   * @param options The option object.
   * @param options.peEnabled - If the identity should be privacy enhanced, or not (default: false).
   * @returns  An [[Identity]].
   * @example ```javascript
   * const seed =
   *   '0x6ce9fd060c70165c0fc8da25810d249106d5df100aa980e0d9a11409d6b35261';
   * await Identity.buildFromSeedString(seed);
   * ```
   */
  public static async buildFromSeedString(
    seedArg: string,
    { peEnabled = false }: IdentityBuildOptions = {}
  ): Promise<Identity> {
    const asU8a = hexToU8a(seedArg)
    return Identity.buildFromSeed(asU8a, { peEnabled })
  }

  /**
   * [STATIC] Builds a new [[Identity]], generated from a seed (Secret Seed).
   *
   * @param seed - A seed as an Uint8Array with 24 arbitrary numbers.
   * @param options The option object.
   * @param options.peEnabled - If the identity should be privacy enhanced, or not (default: false).
   * @returns An [[Identity]].
   * @example ```javascript
   * // prettier-ignore
   * const seed = new Uint8Array([108, 233, 253,  6,  12, 112,  22,  92,
   *                               15, 200, 218, 37, 129,  13,  36, 145,
   *                                6, 213, 223, 16,  10, 169, 128, 224,
   *                              217, 161,  20,  9, 214, 179,  82,  97
   *                            ]);
   * await Identity.buildFromSeed(seed);
   * ```
   */
  public static async buildFromSeed(
    seed: Uint8Array,
    { peEnabled = false }: IdentityBuildOptions = {}
  ): Promise<Identity> {
    const keyring = new Keyring({ type: 'ed25519' })
    const keyringPair = keyring.addFromSeed(seed)

    // pad seed if needed for claimer
    const paddedSeed = fillRight(seed, 0, MIN_SEED_LENGTH)
    let claimer = null
    if (peEnabled) {
      claimer = await Claimer.buildFromSeed(paddedSeed)
    }

    return new Identity(seed, keyringPair, claimer)
  }

  /**
   * [STATIC] Builds a new [[Identity]], generated from a uniform resource identifier (URIs).
   *
   * @param uri - Standard identifiers.
   * @param options The option object.
   * @param options.peEnabled - If the identity should be privacy enhanced, or not (default: false).
   * @returns  An [[Identity]].
   * @example ```javascript
   * Identity.buildFromURI('//Bob');
   * ```
   */
  public static async buildFromURI(
    uri: string,
    { peEnabled = false }: IdentityBuildOptions = {}
  ): Promise<Identity> {
    const keyring = new Keyring({ type: 'ed25519' })
    const derived = keyring.createFromUri(uri)
    const seed = u8aUtil.u8aToU8a(uri)

    let claimer = null
    if (peEnabled) {
      const paddedSeed = fillRight(seed, 0, MIN_SEED_LENGTH)
      claimer = await Claimer.buildFromSeed(paddedSeed)
    }

    return new Identity(seed, derived, claimer)
  }

  public readonly seed: Uint8Array
  public readonly seedAsHex: string
  public readonly signPublicKeyAsHex: string
  public readonly claimer: Claimer | null
  public readonly signKeyringPair: KeyringPair
  public readonly boxKeyPair: BoxKeyPair
  public serviceAddress?: string

  protected constructor(
    seed: Uint8Array,
    signKeyringPair: KeyringPair,
    claimer: Claimer | null
  ) {
    // NB: use different secret keys for each key pair in order to avoid
    // compromising both key pairs at the same time if one key becomes public
    // Maybe use BIP32 and BIP44
    const seedAsHex = u8aUtil.u8aToHex(seed)

    const boxKeyPair = Identity.createBoxKeyPair(seed)

    this.seed = seed
    this.seedAsHex = seedAsHex

    this.signKeyringPair = signKeyringPair
    this.signPublicKeyAsHex = u8aUtil.u8aToHex(signKeyringPair.publicKey)

    this.boxKeyPair = boxKeyPair
    this.claimer = claimer
  }

  /**
   * Returns the [[PublicIdentity]] (identity's address and public key) of the Identity.
   * Can be given to third-parties to communicate and process signatures.
   *
   * @returns The [[PublicIdentity]], corresponding to the [[Identity]].
   * @example ```javascript
   * const mnemonic = Identity.generateMnemonic();
   * const alice = await Kilt.Identity.buildFromMnemonic(mnemonic);
   * alice.getPublicIdentity();
   * ```
   */
  public getPublicIdentity(): PublicIdentity {
    return new PublicIdentity(
      this.signKeyringPair.address,
      u8aUtil.u8aToHex(this.boxKeyPair.publicKey),
      this.serviceAddress
    )
  }

  /**
   * Get the address of the identity on the KILT blockchain.
   *
   * @returns The on chain address.
   */
  public get address(): string {
    return this.signKeyringPair.address
  }

  /**
   * Get the public encryption key.
   *
   * @returns The public part of the encryption key.
   */
  public getBoxPublicKey(): string {
    return u8aUtil.u8aToHex(this.boxKeyPair.publicKey)
  }

  /**
   * Signs data with an [[Identity]] object's key.
   *
   * @param cryptoInput - The data to be signed.
   * @returns The signed data.
   * @example  ```javascript
   * const mnemonic = Identity.generateMnemonic();
   * const alice = await Identity.buildFromMnemonic(mnemonic);
   * const data = 'This is a test';
   * alice.sign(data);
   * // (output) Uint8Array [
   * //           205, 120,  29, 236, 152, 144, 114, 133,  65, ...
   * //          ]
   * ```
   */
  public sign(cryptoInput: CryptoInput): Uint8Array {
    return Crypto.sign(cryptoInput, this.signKeyringPair)
  }

  /**
   * Signs data with an [[Identity]] object's key and returns it as string.
   *
   * @param cryptoInput - The data to be signed.
   * @returns The signed data.
   * @example ```javascript
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
   * @example ```javascript
   * const alice = Identity.buildFromMnemonic('car dog ...');
   * const bob = new PublicIdentity('523....', '0xab1234...');
   *
   * const messageStr = 'This is a test';
   * alice.encryptAsymmetricAsStr(messageStr, bob.boxPublicKeyAsHex);
   * // (output) EncryptedAsymmetricString {
   * //           box: '0xd0b556c4438270901662ff2d3e9359f244f211a225d66dcf74b64f814a92',
   * //           nonce: '0xe4c82d261d1f8fc8a0cf0bbd524530afcc5b201541827580'
   * //          }
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
   * @example  ```javascript
   * const alice = new PublicIdentity('74be...', '0xeb98765...');
   * const bob = Identity.buildFromMnemonic('house cat ...');
   *
   * const encryptedData = {
   *   box: '0xd0b556c4438270901662ff2d3e9359f244f211a225d66dcf74b64f814a92',
   *   nonce: '0xe4c82d261d1f8fc8a0cf0bbd524530afcc5b201541827580',
   * };
   *
   * bob.decryptAsymmetricAsStr(encryptedData, alice.boxPublicKeyAsHex);
   * // (output) "This is a test"
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
   * @example ```javascript
   * const alice = Identity.buildFromMnemonic('car dog ...');
   * const bob = new PublicIdentity('523....', '0xab1234...');
   *
   * const message = 'This is a test';
   * const data = stringToU8a(message);
   * alice.encryptAsymmetric(data, bob.boxPublicKeyAsHex);
   * // (output) EncryptedAsymmetric {
   * //           box: Uint8Array [ 56,  27,   2, 254, ... ],
   * //           nonce: Uint8Array [ 76, 23, 145, 216, ...]
   * //         }
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
   * @example ```javascript
   * const alice = new PublicIdentity('74be...', '0xeb98765...');
   * const bob = Identity.buildFromMnemonic('house cat ...');
   *
   * const encryptedData = {
   *   box: '0xd0b556c4438270901662ff2d3e9359f244f211a225d66dcf74b64f814a92',
   *   nonce: '0xe4c82d261d1f8fc8a0cf0bbd524530afcc5b201541827580',
   * };
   *
   * bob.decryptAsymmetric(encryptedData, alice.boxPublicKeyAsHex);
   * // (output) "This is a test"
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
   * @example ```javascript
   * const alice = Identity.buildFromMnemonic('car dog ...');
   * const tx = await blockchain.api.tx.ctype.add(ctype.hash);
   * const { nonce } = await blockchain.api.query.system.account(alice.address);
   * alice.signSubmittableExtrinsic(tx, nonce.toHex());
   * ```
   */
  public signSubmittableExtrinsic(
    submittableExtrinsic: SubmittableExtrinsic,
    nonceAsHex: string
  ): SubmittableExtrinsic {
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
