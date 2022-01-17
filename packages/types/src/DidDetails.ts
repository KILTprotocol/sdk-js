/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { BN } from '@polkadot/util'

import type { DidPublicKey } from './DidDocumentExporter'
import type { IIdentity } from './Identity'

/**
 * A DID identifier, e.g., 4nvZhWv71x8reD9gq7BUGYQQVvTiThnLpTTanyru9XckaeWa.
 */
export type IDidIdentifier = IIdentity['address']

/**
 * DID keys are purpose-bound. Their role or purpose is indicated by the verification or key relationship type.
 */
export enum KeyRelationship {
  authentication = 'authentication',
  capabilityDelegation = 'capabilityDelegation',
  assertionMethod = 'assertionMethod',
  keyAgreement = 'keyAgreement',
}

/**
 * Subset of key relationships which pertain to signing/verification keys.
 */
export type VerificationKeyRelationship =
  | KeyRelationship.authentication
  | KeyRelationship.capabilityDelegation
  | KeyRelationship.assertionMethod

/**
 * Subset of key relationships which pertain to key agreement/encryption keys.
 */
export type EncryptionKeyRelationship = KeyRelationship.keyAgreement

/**
 * The SDK-specific details of a new DID public key.
 */
export type DidKey<T extends string = string> = {
  /**
   * Key id without the leading did:kilt:<did_identifier> prefix.
   */
  id: string
  /**
   * Key type, e.g. Ed25519.
   */
  type: T
  /**
   * The public key material.
   */
  publicKey: Uint8Array
  /**
   * The inclusion block of the key, if stored on chain.
   */
  includedAt?: BN
}

/**
 * The SDK-specific details of a new DID service endpoint.
 */
export type DidServiceEndpoint = {
  /**
   * The identifier of the endpoint, without the leading did:kilt:<did_identifier> prefix.
   */
  id: string
  /**
   * A list of service types the endpoint exposes.
   */
  types: string[]
  /**
   * A list of URLs the endpoint exposes its services at.
   */
  urls: string[]
}

/**
 * An internal representation of data associated with a DID, equivalent to a DID document.
 */
export interface IDidDetails {
  /**
   * The decentralized identifier (DID) to which the remaining info pertains.
   */
  did: string
  /**
   * Retrieves a particular public key record via its id.
   *
   * @param id The key ID, without the leading DID URI.
   * @returns [[IDidKey]] or undefined if no key with this id is present.
   */
  getKey(id: DidKey['id']): DidKey | undefined
  /**
   * Retrieves public key details from the [[IDid]], optionally filtering by [[KeyRelationship]].
   *
   * @param relationship A [[KeyRelationship]] or 'none' to filter out keys with a specific key
   * relationship, undefined to return all keys.
   * @returns An array of all or selected [[IDid]], depending on the `relationship` parameter.
   */
  getKeys(relationship?: KeyRelationship | 'none'): DidKey[]
  /**
   * Retrieves the service endpoint associated with the DID, if any.
   *
   * @param id The identifier of the service endpoint, without the DID prefix.
   */
  getEndpoint(id: DidServiceEndpoint['id']): DidServiceEndpoint | undefined
  /**
   * Retrieves all the service endpoints associated with the DID.
   *
   * @param type The type of the service endpoints to filter and include in the result.
   */
  getEndpoints(type?: string): DidServiceEndpoint[]
}

/**
 * A signature issued with a DID associated key, indicating which key was used to sign.
 */
export type DidSignature = {
  keyId: DidPublicKey['id']
  signature: string
}
