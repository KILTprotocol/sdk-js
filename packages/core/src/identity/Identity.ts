/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

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
 */

import { Keyring } from '@polkadot/keyring'
import type { KeyringPair } from '@polkadot/keyring/types'
import type { Index } from '@polkadot/types/interfaces'
import type { KeypairType } from '@polkadot/util-crypto/types'
import {
  cryptoIsReady,
  cryptoWaitReady,
  mnemonicToMiniSecret,
} from '@polkadot/util-crypto'
import {
  mnemonicGenerate as generate,
  mnemonicValidate as validate,
} from '@polkadot/util-crypto/mnemonic'
import { hexToU8a } from '@polkadot/util/hex'
import * as u8aUtil from '@polkadot/util/u8a'
// see node_modules/@polkadot/util-crypto/nacl/keypair/fromSeed.js
// as util-crypto is providing a wrapper only for signing keypair
// and not for box keypair, we use TweetNaCl directly
import nacl from 'tweetnacl'
import { Crypto, SDKErrors } from '@kiltprotocol/utils'
import type { IIdentity, SubmittableExtrinsic } from '@kiltprotocol/types'
import { AnyNumber } from '@polkadot/types/types'
import PublicIdentity from './PublicIdentity'

type BoxPublicKey =
  | PublicIdentity['boxPublicKeyAsHex']
  | Identity['boxKeyPair']['publicKey']

export default class Identity implements IIdentity {
  private static ADDITIONAL_ENTROPY_FOR_HASHING = new Uint8Array([1, 2, 3])

  /**
   * [STATIC][ASYNC] Wait for intialization of cryptography modules. Identity creation will error for some key types if this is not called at least once beforehand.
   *
   * @returns A promise which resolves once crypto modules are initialized.
   */
  public static cryptoWaitReady(): Promise<boolean> {
    return cryptoWaitReady()
  }

  /**
   * [STATIC] Indicates (synchronously) whether crypto modules have been initialized. This will rarely be needed; prefer awaiting the resolution of cryptoWaitReady() instead.
   *
   * @returns A boolean indicating whether crypto modules have been initialized.
   */
  public static get cryptoIsReady(): boolean {
    return cryptoIsReady()
  }

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
   * @param options Optional parameters.
   * @param options.signingKeyPairType The signature key type to be used for this identity. Default is `sr25519`.
   * @throws [[ERROR_MNEMONIC_PHRASE_MALFORMED]] when phraseArg contains fewer than 12 correctly separated mnemonic words.
   * @throws [[ERROR_MNEMONIC_PHRASE_INVALID]] when phraseArg could not be validated.
   * @returns An [[Identity]].
   * @example ```javascript
   * const mnemonic = Identity.generateMnemonic();
   * // mnemonic: "coast ugly state lunch repeat step armed goose together pottery bind mention"
   *
   * Identity.buildFromMnemonic(mnemonic);
   * ```
   */
  public static buildFromMnemonic(
    phraseArg: string,
    options: { signingKeyPairType?: KeypairType } = {}
  ): Identity {
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
    return Identity.buildFromSeed(seed, options)
  }

  /**
   * [STATIC] Builds an [[Identity]], generated from a seed hex string.
   *
   * @param seedArg - Seed as hex string (Starting with 0x).
   * @param options Optional parameters.
   * @param options.signingKeyPairType The signature key type to be used for this identity. Default is `sr25519`.
   * @returns  An [[Identity]].
   * @example ```javascript
   * const seed =
   *   '0x6ce9fd060c70165c0fc8da25810d249106d5df100aa980e0d9a11409d6b35261';
   * Identity.buildFromSeedString(seed);
   * ```
   */
  public static buildFromSeedString(
    seedArg: string,
    options: { signingKeyPairType?: KeypairType } = {}
  ): Identity {
    const asU8a = hexToU8a(seedArg)
    return Identity.buildFromSeed(asU8a, options)
  }

  private static createKeyring(type: KeypairType = 'sr25519'): Keyring {
    return new Keyring({
      type,
      // KILT has registered the ss58 prefix 38
      ss58Format: 38,
    })
  }

  /**
   * [STATIC] Builds a new [[Identity]], generated from a seed (Secret Seed).
   *
   * @param seed - A seed as an Uint8Array with 24 arbitrary numbers.
   * @param options Optional parameters.
   * @param options.signingKeyPairType The signature key type to be used for this identity. Default is `sr25519`.
   * @returns An [[Identity]].
   * @example ```javascript
   * // prettier-ignore
   * const seed = new Uint8Array([108, 233, 253,  6,  12, 112,  22,  92,
   * 15, 200, 218, 37, 129,  13,  36, 145,
   * 6, 213, 223, 16,  10, 169, 128, 224,
   * 217, 161,  20,  9, 214, 179,  82,  97
   * ]);
   * Identity.buildFromSeed(seed);
   * ```
   */
  public static buildFromSeed(
    seed: Uint8Array,
    options: { signingKeyPairType?: KeypairType } = {}
  ): Identity {
    const keyring = Identity.createKeyring(options.signingKeyPairType)
    const keyringPair = keyring.addFromSeed(seed)
    return new Identity(seed, keyringPair)
  }

  /**
   * [STATIC] Builds a new [[Identity]], generated from a uniform resource identifier (URIs).
   *
   * @param uri - Standard identifiers.
   * @param options Optional parameters.
   * @param options.signingKeyPairType The signature key type to be used for this identity. Default is `sr25519`.
   * @returns  An [[Identity]].
   * @example ```javascript
   * Identity.buildFromURI('//Bob');
   * ```
   */
  public static buildFromURI(
    uri: string,
    options: { signingKeyPairType?: KeypairType } = {}
  ): Identity {
    const keyring = Identity.createKeyring(options.signingKeyPairType)
    const derived = keyring.createFromUri(uri)
    const seed = u8aUtil.u8aToU8a(uri)
    return new Identity(seed, derived)
  }

  public readonly seed: Uint8Array
  public readonly seedAsHex: string
  public readonly signPublicKeyAsHex: string
  public readonly signKeyringPair: KeyringPair
  public readonly boxKeyPair: nacl.BoxKeyPair
  public serviceAddress?: string

  protected constructor(seed: Uint8Array, signKeyringPair: KeyringPair) {
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
  }

  public get signingKeyType(): KeypairType {
    return this.signKeyringPair.type
  }

  /**
   * Returns the [[PublicIdentity]] (identity's address and public key) of the Identity.
   * Can be given to third-parties to communicate and process signatures.
   *
   * @returns The [[PublicIdentity]], corresponding to the [[Identity]].
   * @example ```javascript
   * const mnemonic = Identity.generateMnemonic();
   * const alice = Kilt.Identity.buildFromMnemonic(mnemonic);
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
   * const alice = Identity.buildFromMnemonic(mnemonic);
   * const data = 'This is a test';
   * alice.sign(data);
   * // (output) Uint8Array [
   * //           205, 120,  29, 236, 152, 144, 114, 133,  65, ...
   * //          ]
   * ```
   */
  public sign(cryptoInput: Crypto.CryptoInput): Uint8Array {
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
  public signStr(cryptoInput: Crypto.CryptoInput): string {
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
    cryptoInput: Crypto.CryptoInput,
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
    encrypted: Crypto.EncryptedAsymmetric | Crypto.EncryptedAsymmetricString,
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
    input: Crypto.CryptoInput,
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
    encrypted: Crypto.EncryptedAsymmetric | Crypto.EncryptedAsymmetricString,
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
   * @param nonce - The nonce of the address operating the transaction.
   * @param tip - (Optional) The amount of Femto-KILT to tip the validator.
   * @returns The signed SubmittableExtrinsic.
   * @example ```javascript
   * const alice = Identity.buildFromMnemonic('car dog ...');
   * const tx = await blockchain.api.tx.ctype.add(ctype.hash);
   * await blockchain.signTx(alice, tx); // calls signSubmittableExtrinsic internally
   * ```
   */
  public async signSubmittableExtrinsic(
    submittableExtrinsic: SubmittableExtrinsic,
    nonce: AnyNumber | Index,
    tip?: AnyNumber
  ): Promise<SubmittableExtrinsic> {
    return submittableExtrinsic.signAsync(this.signKeyringPair, {
      nonce,
      tip,
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
