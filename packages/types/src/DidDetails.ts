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
 * Possible types for a DID verification key.
 */
export enum VerificationKeyType {
  Sr25519 = 'Sr25519',
  Ed25519 = 'Ed25519',
  Ecdsa = 'Ecdsa',
}

/**
 * Subset of key relationships which pertain to key agreement/encryption keys.
 */
export type EncryptionKeyRelationship = KeyRelationship.keyAgreement
/**
 * Possible types for a DID encryption key.
 */
export enum EncryptionKeyType {
  X25519 = 'X25519',
}

/**
 * Type of a new key material to add under a DID.
 */
export type BaseNewDidKey = {
  publicKey: Uint8Array
}

/**
 * Type of a new verification key to add under a DID.
 */
export type NewDidVerificationKey = BaseNewDidKey & {
  type: VerificationKeyType
}
/**
 * Type of a new encryption key to add under a DID.
 */
export type NewDidEncryptionKey = BaseNewDidKey & { type: EncryptionKeyType }
/**
 * Type of a new key (verification or encryption) to add under a DID.
 */
export type NewDidKey = NewDidVerificationKey | NewDidEncryptionKey

/**
 * The SDK-specific base details of a DID key.
 */
export type BaseDidKey = {
  /**
   * Key id without the leading did:kilt:<did_identifier> prefix.
   */
  id: string
  /**
   * The public key material.
   */
  publicKey: NewDidKey['publicKey']
  /**
   * The inclusion block of the key, if stored on chain.
   */
  includedAt?: BN
}

/**
 * The SDK-specific details of a DID verification key.
 */
export type DidVerificationKey = BaseDidKey & { type: VerificationKeyType }
/**
 * The SDK-specific details of a DID encryption key.
 */
export type DidEncryptionKey = BaseDidKey & { type: EncryptionKeyType }
/**
 * The SDK-specific details of a DID key.
 */
export type DidKey = DidVerificationKey | DidEncryptionKey

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
   * Retrieves public key details from the [[IDid]].
   *
   * @param relationship A [[KeyRelationship]] or 'none' to filter out keys with a specific key
   * relationship, undefined to return all keys.
   * @returns An array of all or selected [[IDid]], depending on the `relationship` parameter.
   */
  getVerificationKeys(
    relationship: VerificationKeyRelationship
  ): DidVerificationKey[]
  /**
   * Retrieves public key details from the [[IDid]].
   *
   * @param relationship A [[KeyRelationship]] or 'none' to filter out keys with a specific key
   * relationship, undefined to return all keys.
   * @returns An array of all or selected [[IDid]], depending on the `relationship` parameter.
   */
  getEncryptionKeys(relationship: EncryptionKeyRelationship): DidEncryptionKey[]
  getKeys(): DidKey[]
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
