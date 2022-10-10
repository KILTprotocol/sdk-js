/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { RegistryTypes } from '@polkadot/types/types'
import { types25 } from './types_25.js'

// Delete deprecated types
delete types25.ServiceEndpoints
delete types25.UrlError
delete types25.ContentType
delete types25.Url
delete types25.HttpUrl
delete types25.FtpUrl
delete types25.IpfsUrl
delete types25.MaxEndpointUrlsCount
delete types25.MaxUrlLength
delete types25.DelegationRoot

export const types2700: RegistryTypes = {
  ...types25,

  // Add deposit for attestations
  Deposit: {
    owner: 'AccountId',
    amount: 'Balance',
  },
  AttestationDetails: {
    ctypeHash: 'CtypeHashOf',
    attester: 'AttesterOf',
    delegationId: 'Option<DelegationNodeIdOf>',
    revoked: 'bool',
    // Added
    deposit: 'Deposit',
  },

  DidAuthorizedCallOperation: {
    did: 'DidIdentifierOf',
    txCounter: 'u64',
    call: 'DidCallableOf',
    // Added
    blockNumber: 'BlockNumber',
    submitter: 'AccountId',
  },

  // Remove serviceEndpoints
  DidDetails: {
    authenticationKey: 'KeyIdOf',
    keyAgreementKeys: 'DidKeyAgreementKeys',
    capabilityDelegationKey: 'Option<KeyIdOf>',
    assertionMethodKey: 'Option<KeyIdOf>',
    publicKeys: 'DidPublicKeyMap',
    lastTxCounter: 'u64',
    // Added
    deposit: 'Deposit',
  },

  // Remove newServiceEndpoints
  DidCreationDetails: {
    did: 'DidIdentifierOf',
    // Added
    submitter: 'AccountId',
    newKeyAgreementKeys: 'DidNewKeyAgreementKeys',
    newAssertionMethodKey: 'Option<DidVerificationKey>',
    newCapabilityDelegationKey: 'Option<DidVerificationKey>',
  },

  // Remove UrlError
  DidError: {
    _enum: {
      StorageError: 'StorageError',
      SignatureError: 'SignatureError',
      InputError: 'InputError',
      InternalError: 'Null',
    },
  },

  // Remove MaxUrlLengthExceeded
  InputError: {
    _enum: [
      'MaxKeyAgreementKeysLimitExceeded',
      'MaxVerificationKeysToRemoveLimitExceeded',
    ],
  },

  StorageError: {
    _enum: {
      DidAlreadyPresent: 'Null',
      DidNotPresent: 'Null',
      DidKeyNotPresent: 'DidVerificationKeyRelationship',
      KeyNotPresent: 'Null',
      CurrentlyActiveKey: 'Null',
      MaxPublicKeysPerDidExceeded: 'Null',
      MaxTotalKeyAgreementKeysExceeded: 'Null',
      DidAlreadyDeleted: 'Null',
    },
  },
  SignatureError: {
    _enum: [
      'InvalidSignatureFormat',
      'InvalidSignature',
      'InvalidNonce',
      'TransactionExpired',
    ],
  },
  DelegationNode: {
    hierarchyRootId: 'DelegationNodeIdOf',
    parent: 'Option<DelegationNodeIdOf>',
    children: 'BoundedBTreeSet<DelegationNodeIdOf, MaxChildren>',
    details: 'DelegationDetails',
    // new
    deposit: 'Deposit',
  },

  // Add V3
  DidStorageVersion: {
    _enum: ['V1', 'V2', 'V3'],
  },
}