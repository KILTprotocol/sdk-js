/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { RegistryTypes } from '@polkadot/types/types'
import { subtype } from './subtyper.js'
import { types20 } from './types_20.js'

export const types21: RegistryTypes = {
  ...subtype(types20, ['DidUpdateDetails', 'OrderedSet']),

  StorageError: {
    _enum: {
      DidAlreadyPresent: 'Null',
      DidNotPresent: 'Null',
      DidKeyNotPresent: 'DidVerificationKeyRelationship',
      VerificationKeyNotPresent: 'Null',
      CurrentlyActiveKey: 'Null',
      MaxTxCounterValue: 'Null',
      MaxPublicKeysPerDidKeyIdentifierExceeded: 'Null',
      // renamed
      MaxTotalKeyAgreementKeysExceeded: 'Null',
      MaxOldAttestationKeysExceeded: 'Null',
    },
  },
  DidCreationDetails: {
    did: 'DidIdentifierOf',
    newKeyAgreementKeys: 'DidNewKeyAgreementKeys',
    newAssertionMethodKey: 'Option<DidVerificationKey>',
    newCapabilityDelegationKey: 'Option<DidVerificationKey>',
    newServiceEndpoints: 'Option<ServiceEndpoints>',
  },
  DidDetails: {
    authenticationKey: 'KeyIdOf',
    keyAgreementKeys: 'DidKeyAgreementKeys',
    // renamed
    capabilityDelegationKey: 'Option<KeyIdOf>',
    // renamed
    assertionMethodKey: 'Option<KeyIdOf>',
    publicKeys: 'DidPublicKeyMap',
    serviceEndpoints: 'Option<ServiceEndpoints>',
    lastTxCounter: 'u64',
  },
  DelegateSignatureTypeOf: 'DidSignature',
  ContentType: {
    _enum: ['application/json', 'application/ld+json'],
  },

  // fix: generics mostly don't work here, but OrderedSet is reduced to a Vec anyway
  Collator: {
    id: 'AccountId',
    stake: 'Balance',
    // fix
    delegators: 'Vec<Stake>',
    total: 'Balance',
    state: 'CollatorStatus',
  },
  Delegator: {
    // fix
    delegations: 'Vec<Stake>',
    total: 'Balance',
  },
  Lookup80: '[u8; 34]',
}
