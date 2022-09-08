/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { SignerPayloadJSON } from '@polkadot/types/types'
import {
  DidResourceUri,
  DidVerificationKey,
  VerificationKeyRelationship,
} from './DidDocument.js'

const signingAlgorithmsC = ['ed25519', 'sr25519', 'ecdsa-secp256k1'] as const
export const signingAlgorithms = signingAlgorithmsC as unknown as string[]
export type SigningAlgorithms = typeof signingAlgorithmsC[number]

export type EncryptionAlgorithms = 'x25519-xsalsa20-poly1305'

/**
 * Base interface for all signing requests.
 */
export interface SignRequestData {
  /**
   * Data to be signed.
   */
  data: Uint8Array
  /**
   * Info for extensions to display to user.
   * Available when signing extrinsics.
   */
  meta?: Partial<SignerPayloadJSON>
  /**
   * The did key relationship to be used.
   */
  keyRelationship: VerificationKeyRelationship
}

/**
 * Base interface for responses to signing requests.
 */
export interface SignResponseData {
  /**
   * Result of the signing.
   */
  data: Uint8Array
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
 * A callback function to sign data without an existing DID.
 */
export type SignWithoutDidCallback = (
  signData: SignRequestData
) => Promise<Omit<SignResponseData, 'keyUri'>>

/**
 * Base interface for encryption requests.
 */
export interface EncryptionRequestData {
  /**
   * Data to be encrypted.
   */
  data: Uint8Array
  /**
   * The other party's public key to be used for x25519 Diffie-Hellman key agreement.
   */
  peerPublicKey: Uint8Array
}

/**
 * Base interface for responses to encryption requests.
 */
export interface EncryptionResponseData {
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
  (requestData: EncryptionRequestData): Promise<EncryptionResponseData>
}

export interface DecryptRequestData extends EncryptionRequestData {
  /**
   * The random nonce generated during encryption as u8a.
   */
  nonce: Uint8Array
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
