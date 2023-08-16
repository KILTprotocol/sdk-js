/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
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
