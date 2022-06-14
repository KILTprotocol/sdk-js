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
export interface RequestData<
  A extends SigningAlgorithms | EncryptionAlgorithms
> {
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
export interface ResponseData<
  A extends SigningAlgorithms | EncryptionAlgorithms
> {
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
export interface SigningData<A extends SigningAlgorithms>
  extends RequestData<A> {
  /**
   * Info for extensions to display to user.
   */
  meta?: Partial<SignerPayloadJSON>
}

/**
 * A callback function to sign with a given signature algorithm.
 */
export type SignCallback<A extends SigningAlgorithms = any> = (
  signData: SigningData<A>
) => Promise<ResponseData<A>>

export interface SigningOptions<A extends SigningAlgorithms = any> {
  sign: SignCallback<A>
  signingPublicKey: string | Uint8Array
  alg: A
}

/**
 * Uses stored key material to encrypt a message encoded as u8a.
 *
 * @param requestData Slightly extended [[RequestData]] containing both our and their public keys, the data to be encrypted, and `alg: 'x25519-xsalsa20-poly1305'`.
 * @param requestData.peerPublicKey The other party's public key to be used for x25519 Diffie-Hellman key agreement.
 * @returns [[ResponseData]] which additionally contains a `nonce` randomly generated in the encryption process (required for decryption).
 */
export interface EncryptCallback<
  A extends EncryptionAlgorithms.NaclBox = EncryptionAlgorithms.NaclBox
> {
  (
    requestData: RequestData<A> & {
      peerPublicKey: Uint8Array
    }
  ): Promise<ResponseData<A> & { nonce: Uint8Array }>
}

/**
 * Uses stored key material to decrypt a message encoded as u8a.
 *
 * @param requestData Slightly extended [[RequestData]] containing both our and their public keys, the nonce used for encryption, the data to be decrypted, and `alg: 'x25519-xsalsa20-poly1305'`.
 * @param requestData.peerPublicKey The other party's public key to be used for x25519 Diffie-Hellman key agreement.
 * @param requestData.nonce The random nonce generated during encryption as u8a.
 * @returns A Promise resolving to [[ResponseData]] containing the decrypted message or rejecting if key or algorithm is unknown or if they do not match.
 */
export interface DecryptCallback<
  A extends EncryptionAlgorithms.NaclBox = EncryptionAlgorithms.NaclBox
> {
  (
    requestData: RequestData<A> & {
      peerPublicKey: Uint8Array
      nonce: Uint8Array
    }
  ): Promise<ResponseData<A>>
}
