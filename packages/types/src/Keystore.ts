/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { SignerPayloadJSON } from '@polkadot/types/types'

export enum SigningAlgorithms {
  Ed25519 = 'ed25519',
  Sr25519 = 'sr25519',
  EcdsaSecp256k1 = 'ecdsa-secp256k1',
}

export enum EncryptionAlgorithms {
  NaclBox = 'x25519-xsalsa20-poly1305',
}

/**
 * Base interface for all {en/de}cryption & signing requests.
 */
export interface RequestData<A extends string> {
  /**
   * Identifier for the encryption/signing algorithm to use.
   */
  alg: A
  /**
   * Public key as u8a identifying the keypair to use (in combination with the alg).
   */
  publicKey: Uint8Array
  /**
   * Data to be {en/de}crypted or signed.
   */
  data: Uint8Array
  [x: string]: unknown
}

/**
 * Base interface for responses to {en/de}cryption & signing requests.
 */
export interface ResponseData<A extends string> {
  /**
   * Identifier for the encryption/signing algorithm used.
   */
  alg: A
  /**
   * Result of the {en/de}cryption or signing.
   */
  data: Uint8Array
  [x: string]: unknown
}

/**
 * Extends [[RequestData]] with optional metadata for providing info on the data to be signed, especially in case of signing extrinsics.
 */
export interface KeystoreSigningData<A extends string> extends RequestData<A> {
  /**
   * Info for extensions to display to user.
   */
  meta?: Partial<SignerPayloadJSON>
}

/**
 * Interface for the Keystore component, which provides keyring / signing / {en/de}cryption capabilities to the SDK.
 */
export interface Keystore<
  SignAlgs extends string = string,
  EncryptAlgs extends string = string
> {
  /**
   * Returns the set of supported algorithms.
   *
   * @returns A Promise containing a Set of algorithm identifiers.
   */
  supportedAlgs(): Promise<Set<SignAlgs | EncryptAlgs>>
  /**
   * Uses stored key material to sign a byte string encoded as u8a.
   *
   * @param signData [[RequestData]] containing the data to be signed, the algorithm to be used, and the public key identifying the key to use.
   * @param signData.meta An optional partial [[SignerPayloadJSON]] object which can be used to communicate information about the data to be signed to the Keystore.
   * @returns A Promise resolving to [[ResponseData]] containing the signature or rejecting if key or algorithm is unknown or if they do not match.
   */
  sign<A extends SignAlgs>(
    signData: KeystoreSigningData<A>
  ): Promise<ResponseData<A>>
  /**
   * Uses stored key material to encrypt a message encoded as u8a.
   *
   * @param requestData [[RequestData]] containing the data to be encrypted, the algorithm to be used, and the public key identifying the key to use.
   * @returns A Promise resolving to [[ResponseData]] containing the encrypted data or rejecting if key or algorithm is unknown or if they do not match.
   */
  encrypt<A extends EncryptAlgs>(
    requestData: RequestData<A>
  ): Promise<ResponseData<A>>
  /**
   * Uses stored key material to decrypt a message encoded as u8a.
   *
   * @param requestData [[RequestData]] containing the message to be decrypted, the algorithm to be used, and the public key identifying the key to use.
   * @returns A Promise resolving to [[ResponseData]] containing the decrypted message or rejecting if key or algorithm is unknown or if they do not match.
   */
  decrypt<A extends EncryptAlgs>(
    requestData: RequestData<A>
  ): Promise<ResponseData<A>>
  /**
   * Can be used to check whether a given key is stored for a given algorithm.
   *
   * @param keys Array of objects containing an algorithm identifier and public key.
   * @returns Array of boolean values indicating if a key is known or not.
   */
  hasKeys(
    keys: Array<Pick<RequestData<string>, 'alg' | 'publicKey'>>
  ): Promise<boolean[]>
  /**
   * Returns an array containing information on each key pair stored by the keystore.
   *
   * @returns An array of items { alg: string, publicKey: Uint8Array }.
   */
  getKeys?(): Promise<Array<Pick<RequestData<string>, 'alg' | 'publicKey'>>>
}

/**
 * A Keystore instance which supports signing with a given signature algorithm.
 */
export type KeystoreSigner<A extends string = any> = Pick<
  Keystore<A, string>,
  'sign'
>

export interface KeystoreSigningOptions<A extends string = any> {
  signer: KeystoreSigner<A>
  signingPublicKey: string | Uint8Array
  alg: A
}

/**
 * A Keystore instance which supports {en/de}cryption using nacl's 'x25519-xsalsa20-poly1305' algorithm.
 */
export interface NaclBoxCapable
  extends Keystore<any, 'x25519-xsalsa20-poly1305'> {
  /**
   * @inheritdoc
   * @param requestData Slightly extended [[RequestData]] containing both our and their public keys, the data to be encrypted, and `alg: 'x25519-xsalsa20-poly1305'`.
   * @param requestData.peerPublicKey The other party's public key to be used for x25519 Diffie-Hellman key agreement.
   * @returns [[ResponseData]] which additionally contains a `nonce` randomly generated in the encryption process (required for decryption).
   */
  encrypt<A extends 'x25519-xsalsa20-poly1305'>(
    requestData: RequestData<A> & {
      peerPublicKey: Uint8Array
    }
  ): Promise<ResponseData<A> & { nonce: Uint8Array }>
  /**
   * @inheritdoc
   * @param requestData Slightly extended [[RequestData]] containing both our and their public keys, the nonce used for encryption, the data to be decrypted, and `alg: 'x25519-xsalsa20-poly1305'`.
   * @param requestData.peerPublicKey The other party's public key to be used for x25519 Diffie-Hellman key agreement.
   * @param requestData.nonce The random nonce generated during encryption as u8a.
   * @returns A Promise resolving to [[ResponseData]] containing the decrypted message or rejecting if key or algorithm is unknown or if they do not match.
   */
  decrypt<A extends 'x25519-xsalsa20-poly1305'>(
    requestData: RequestData<A> & {
      peerPublicKey: Uint8Array
      nonce: Uint8Array
    }
  ): Promise<ResponseData<A>>
}
