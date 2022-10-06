/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  DidResourceUri,
  DidUri,
  DidVerificationKey,
  VerificationKeyRelationship,
} from './DidDocument.js'

/**
 * Base interface for all signing requests.
 */
export interface SignRequestData {
  /**
   * Data to be signed.
   */
  data: Uint8Array

  /**
   * The did key relationship to be used.
   */
  keyRelationship: VerificationKeyRelationship

  /**
   * The DID to be used for signing.
   */
  did: DidUri
}

/**
 * Base interface for responses to signing requests.
 */
export interface SignResponseData {
  /**
   * Result of the signing.
   */
  signature: Uint8Array
  /**
   * The did key uri used for signing.
   */
  keyUri: DidResourceUri
  /**
   * The did key type used for signing.
   */
  keyType: DidVerificationKey['type']
}

/**
 * A callback function to sign data.
 */
export type SignCallback = (
  signData: SignRequestData
) => Promise<SignResponseData>

/**
 * A callback function to sign extrinsics.
 */
export type SignExtrinsicCallback = (
  signData: SignRequestData
) => Promise<Omit<SignResponseData, 'keyUri'>>

/**
 * Base interface for encryption requests.
 */
export interface EncryptRequestData {
  /**
   * Data to be encrypted.
   */
  data: Uint8Array
  /**
   * The other party's public key to be used for x25519 Diffie-Hellman key agreement.
   */
  peerPublicKey: Uint8Array
  /**
   * The DID to be used for encryption.
   */
  did: DidUri
}

/**
 * Base interface for responses to encryption requests.
 */
export interface EncryptResponseData {
  /**
   * Result of the encryption.
   */
  data: Uint8Array
  /**
   * A random nonce generated in the encryption process.
   */
  nonce: Uint8Array
  /**
   * The did key uri used for the encryption.
   */
  keyUri: DidResourceUri
}

/**
 * Uses stored key material to encrypt a message encoded as u8a.
 *
 * @param requestData The data to be encrypted, the peers public key and `alg: 'x25519-xsalsa20-poly1305'`.
 * @returns [[EncryptionResponseData]] which additionally to the data contains a `nonce` randomly generated in the encryption process (required for decryption).
 */
export interface EncryptCallback {
  (requestData: EncryptRequestData): Promise<EncryptResponseData>
}

export interface DecryptRequestData {
  /**
   * Data to be encrypted.
   */
  data: Uint8Array
  /**
   * The other party's public key to be used for x25519 Diffie-Hellman key agreement.
   */
  peerPublicKey: Uint8Array
  /**
   * The random nonce generated during encryption as u8a.
   */
  nonce: Uint8Array
  /**
   * The did key uri, which should be used for decryption.
   */
  keyUri: DidResourceUri
}

export interface DecryptResponseData {
  /**
   * Result of the decryption.
   */
  data: Uint8Array
}

/**
 * Uses stored key material to decrypt a message encoded as u8a.
 *
 * @param requestData Slightly extended [[RequestData]] containing both our and their public keys, the nonce used for encryption, the data to be decrypted, and `alg: 'x25519-xsalsa20-poly1305'`.
 * @param requestData.nonce The random nonce generated during encryption as u8a.
 * @returns A Promise resolving to [[ResponseData]] containing the decrypted message or rejecting if key or algorithm is unknown or if they do not match.
 */
export interface DecryptCallback {
  (requestData: DecryptRequestData): Promise<DecryptResponseData>
}
