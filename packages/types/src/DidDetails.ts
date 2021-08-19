/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ApiPromise } from '@polkadot/api'
import type { Metadata } from '@polkadot/types'
import type BN from 'bn.js'

export enum KeyRelationship {
  authentication = 'Authentication',
  capabilityDelegation = 'CapabilityDelegation',
  assertionMethod = 'AssertionMethod',
  keyAgreement = 'KeyAgreement',
}

export type VerificationKeyRelationship =
  | KeyRelationship.authentication
  | KeyRelationship.capabilityDelegation
  | KeyRelationship.assertionMethod

export type EncryptionKeyRelationship = KeyRelationship.keyAgreement

export type CallMeta = { section: string; method: string }

export interface KeyDetails<T extends string = string> {
  id: string
  type: T
  controller: IDidDetails['did']
  publicKeyHex: string
  includedAt?: number
}

export interface ServiceDetails {
  id: string
  type: string | string[]
  serviceEndpoint: string | string[]
  [x: string]: unknown
}

export interface IDidDetails {
  did: string
  getKey(id: KeyDetails['id']): KeyDetails | undefined
  getKeyIds(relationship?: KeyRelationship | 'none'): Array<KeyDetails['id']>
  getKeys(relationship?: KeyRelationship | 'none'): KeyDetails[]
  getServices(type?: string): ServiceDetails[]
  getNextTxIndex(): BN
}

export type ApiOrMetadata = ApiPromise | Metadata

export type DidSignature = { keyId: string; signature: string }
