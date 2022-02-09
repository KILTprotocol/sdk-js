/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  DidEncryptionKey,
  DidKey,
  DidServiceEndpoint,
  DidVerificationKey,
  IDidDetails,
  IDidIdentifier,
  KeyRelationship,
  NewDidEncryptionKey,
  NewDidVerificationKey,
} from '@kiltprotocol/types'

/**
 * Map from a key relationship (including the 'none' relationship) -> set of key IDs.
 */
export type MapKeysToRelationship = Partial<
  Record<KeyRelationship, Set<DidKey['id']>> & { none: Set<DidKey['id']> }
>

/**
 * Map from a key ID -> set of keys.
 */
export type PublicKeys = Record<DidKey['id'], Omit<DidKey, 'id'>>

/**
 * Map from a service ID -> set of services.
 */
export type ServiceEndpoints = Record<
  DidServiceEndpoint['id'],
  Omit<DidServiceEndpoint, 'id'>
>

export type DidVerificationKeySelectionHandler = (
  keys: DidVerificationKey[]
) => Promise<DidVerificationKey | null>
export type DidEncryptionKeySelectionHandler = (
  keys: DidEncryptionKey[]
) => Promise<DidEncryptionKey | null>

export type DidConstructorDetails = {
  did: IDidDetails['did']
  // Accepts a list of keys where the ID does not include the DID URI.
  keys: PublicKeys
  keyRelationships: MapKeysToRelationship
  // Accepts a list of service endpoints where the ID does not include the DID URI.
  serviceEndpoints?: ServiceEndpoints
}

export type FullDidCreationDetails = {
  identifier: IDidIdentifier
  authenticationKey: NewDidVerificationKey
  keyAgreementKeys?: NewDidEncryptionKey[]
  assertionKey?: NewDidVerificationKey
  delegationKey?: NewDidVerificationKey
  serviceEndpoints?: DidServiceEndpoint[]
}
