/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ApiPromise } from '@polkadot/api'
import type { Metadata } from '@polkadot/types'

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

export type CallMeta = { section: string; method: string }

/**
 * A public key record associated with a DID record.
 */
export interface IDidKeyDetails<T extends string = string> {
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
  controller: IDidDetails['did']
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
   * @param id Key id, which is a URI consisting of did:kilt:<did identifier>#<key identifier>.
   * @returns [[IDidKeyDetails]] or undefined if no key with this id is present in the [[IDidDetails]].
   */
  getKey(id: IDidKeyDetails['id']): IDidKeyDetails | undefined
  /**
   * Retrieves public key ids from the [[IDidDetails]], optionally filtering by [[KeyRelationship]].
   *
   * @param relationship A [[KeyRelationship]] or 'none' to filter out keys with a specific key
   * relationship, undefined to return all key ids.
   * @returns An array of all or selected key ids, depending on the `relationship` parameter.
   */
  getKeyIds(
    relationship?: KeyRelationship | 'none'
  ): Array<IDidKeyDetails['id']>
  /**
   * Retrieves public key details from the [[IDidDetails]], optionally filtering by [[KeyRelationship]].
   *
   * @param relationship A [[KeyRelationship]] or 'none' to filter out keys with a specific key
   * relationship, undefined to return all keys.
   * @returns An array of all or selected [[IDidKeyDetails]], depending on the `relationship` parameter.
   */
  getKeys(relationship?: KeyRelationship | 'none'): IDidKeyDetails[]
}

export type ApiOrMetadata = ApiPromise | Metadata

/**
 * A signature issued with a DID associated key, indicating which key was used to sign.
 */
export type DidSignature = { keyId: string; signature: string }
