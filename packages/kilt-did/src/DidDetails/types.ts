/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { KeyDetails } from '../types'

export type VerificationKeyRelationship =
  | 'authentication'
  | 'assertionMethod'
  | 'capabilityDelegation'
  | 'capabilityInvocation'

export type KeyRelationship = VerificationKeyRelationship | 'keyAgreement'

export type CallMeta = { section: string; method: string }

export interface ServiceRecord {
  id: string
  type: string | string[]
  serviceEndpoint: string | string[]
  [x: string]: unknown
}

export interface IDidDetails {
  did: string
  getKey(id: KeyDetails['id']): KeyDetails | undefined
  getKeyIds(): Array<KeyDetails['id']>
  getKeys(): KeyDetails[]
  getVerificationKeys(relationship?: VerificationKeyRelationship): KeyDetails[]
  getSigningKeys(relationship?: VerificationKeyRelationship): KeyDetails[]
  getKeyAgreementKeys(): KeyDetails[]
  getServices(type?: string): ServiceRecord[]
  getNextTxIndex(): BigInt
}
