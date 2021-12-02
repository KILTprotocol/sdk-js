/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { IIdentity } from './Identity'

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
 * The details of a public key record with a given DID.
 */
export interface IDidKey<T extends string = string> {
  /**
   * Key id, which is a URI consisting of did:kilt:<did identifier>#<key identifier>.
   */
  id: string
  /**
   * Key type, e.g. Ed25519.
   */
  type: T
  /**
   * The DID with which this public key is associated.
   */
  // eslint-disable-next-line no-use-before-define
  controller: IDid['did']
  /**
   * The public key material encoded as hex.
   */
  publicKeyHex: string
  /**
   * Can be used to indicate the block at which this key was added to the on-chain DID record.
   */
  includedAt?: number
}

/**
 * A single service endpoint.
 */
export interface IDidServiceEndpoint {
  /**
   * The identifier of the endpoint in the form <did_identifier>#<endpoint_id>.
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
export interface IDid {
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
  getKey(id: string): IDidKey | undefined
  /**
   * Retrieves public key details from the [[IDid]], optionally filtering by [[KeyRelationship]].
   *
   * @param relationship A [[KeyRelationship]] or 'none' to filter out keys with a specific key
   * relationship, undefined to return all keys.
   * @returns An array of all or selected [[IDid]], depending on the `relationship` parameter.
   */
  getKeys(relationship?: KeyRelationship | 'none'): IDidKey[]
  /**
   * Retrieves the service endpoint associated with the DID, if any.
   *
   * @param id The identifier of the service endpoint, without the DID prefix.
   */
  getEndpoint(id: string): IDidServiceEndpoint | undefined
  /**
   * Retrieves all the service endpoints associated with the DID.
   *
   * @param type The type of the service endpoints to filter and include in the result.
   */
  getEndpoints(type?: string): IDidServiceEndpoint[]
}

/**
 * A signature issued with a DID associated key, indicating which key was used to sign.
 */
export type DidSignature = { keyId: string; signature: string }
