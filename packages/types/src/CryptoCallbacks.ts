/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { SignerPayloadJSON } from '@polkadot/types/types'
import { DidResourceUri, DidUri, DidVerificationKey } from './DidDocument.js'

const signingAlgorithmsC = ['ed25519', 'sr25519', 'ecdsa-secp256k1'] as const
export const signingAlgorithms = signingAlgorithmsC as unknown as string[]
export type SigningAlgorithms = typeof signingAlgorithmsC[number]

export type EncryptionAlgorithms = 'x25519-xsalsa20-poly1305'

/**
 * Base interface for all {en/de}cryption & signing requests.
 */
export interface RequestData {
  /**
   * Data to be {en/de}crypted or signed.
   */
  data: Uint8Array
}

/**
 * Base interface for responses to {en/de}cryption & signing requests.
 */
export interface ResponseData {
  /**
   * Result of the {en/de}cryption or signing.
   */
  data: Uint8Array
}

/**
 * Extends [[RequestData]] with optional metadata for providing info on the data to be signed, especially in case of signing extrinsics.
 */
export interface SigningExtrinsicData extends RequestData {
  /**
   * Info for extensions to display to user.
   */
  meta: Partial<SignerPayloadJSON>
  did: DidUri
  keyId: DidVerificationKey['id']
}

/**
 * A callback function to sign extrinsics.
 */
export type SignExtrinsicCallback = (
  signData: SigningExtrinsicData
) => Promise<ResponseData>

/**
 * A callback function to sign an extrinsic without an existing DID.
 */
export type SignExtrinsicWithoutDidCallback = (
  signData: RequestData
) => Promise<
  ResponseData & {
    keyType: DidVerificationKey['type']
  }
>

/**
 * A callback function to sign data.
 */
export type SignCallback = (signData: RequestData) => Promise<
  ResponseData & {
    keyUri: DidResourceUri
  }
>

/**
 * Uses stored key material to encrypt a message encoded as u8a.
 *
 * @param requestData Slightly extended [[RequestData]] containing both our and their public keys, the data to be encrypted, and `alg: 'x25519-xsalsa20-poly1305'`.
 * @param requestData.peerPublicKey The other party's public key to be used for x25519 Diffie-Hellman key agreement.
 * @returns [[ResponseData]] which additionally contains a `nonce` randomly generated in the encryption process (required for decryption).
 */
export interface EncryptCallback {
  (
    requestData: RequestData & {
      peerPublicKey: Uint8Array
    }
  ): Promise<
    ResponseData & {
      nonce: Uint8Array
      keyUri: DidResourceUri
    }
  >
}

/**
 * Uses stored key material to decrypt a message encoded as u8a.
 *
 * @param requestData Slightly extended [[RequestData]] containing both our and their public keys, the nonce used for encryption, the data to be decrypted, and `alg: 'x25519-xsalsa20-poly1305'`.
 * @param requestData.peerPublicKey The other party's public key to be used for x25519 Diffie-Hellman key agreement.
 * @param requestData.nonce The random nonce generated during encryption as u8a.
 * @returns A Promise resolving to [[ResponseData]] containing the decrypted message or rejecting if key or algorithm is unknown or if they do not match.
 */
export interface DecryptCallback {
  (
    requestData: RequestData & {
      peerPublicKey: Uint8Array
      nonce: Uint8Array
    }
  ): Promise<ResponseData>
}
