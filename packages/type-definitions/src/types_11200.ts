/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { RegistryTypes } from '@polkadot/types/types'

import { types10900 } from './types_10900.js'

export const types11200: RegistryTypes = {
  ...types10900,
  IdentityCommitmentVersion: 'u16',
  // DipProvider state_call
  DipProofRequest: {
    identifier: 'AccountId32',
    version: 'IdentityCommitmentVersion',
    proofKeys: 'Vec<Hash>',
    accounts: 'Vec<PalletDidLookupLinkableAccountLinkableAccountId>',
    shouldIncludeWeb3Name: 'bool',
  },
  CompleteMerkleProof: {
    root: 'MerkleRoot',
    proof: 'MerkleProof',
  },
  MerkleRoot: 'Hash',
  MerkleProof: {
    blinded: 'BlindedLeaves',
    revealed: 'RevealedLeaves',
  },
  BlindedLeaves: 'Vec<BlindedValue>',
  BlindedValue: 'Bytes',
  RevealedLeaves: 'Vec<RevealedLeaf>',
  RevealedLeaf: {
    _enum: {
      DidKey: 'RevealedDidKey',
      Web3Name: 'RevealedWeb3Name',
      LinkedAccount: 'RevealedAccountId',
    },
  },
  RevealedDidKey: {
    id: 'Hash',
    relationship: 'KeyRelationship',
    details: 'DidDidDetailsDidPublicKeyDetails',
  },
  KeyRelationship: {
    _enum: {
      Encryption: 'Null',
      Verification: 'VerificationRelationship',
    },
  },
  VerificationRelationship: {
    _enum: [
      'Authentication',
      'CapabilityDelegation',
      'CapabilityInvocation',
      'AssertionMethod',
    ],
  },
  RevealedWeb3Name: {
    web3Name: 'Text',
    claimedAt: 'BlockNumber',
  },
  RevealedAccountId: 'PalletDidLookupLinkableAccountLinkableAccountId',
  RuntimeApiDipProofError: {
    _enum: {
      IdentityProvider: 'LinkedDidIdentityProviderError',
      MerkleProof: 'DidMerkleProofError',
    },
  },
  LinkedDidIdentityProviderError: {
    _enum: ['DidNotFound', 'DidDeleted', 'Internal'],
  },
  DidIdentityProviderError: {
    _enum: ['DidNotFound', 'Internal'],
  },
  DidMerkleProofError: {
    _enum: [
      'UnsupportedVersion',
      'KeyNotFound',
      'LinkedAccountNotFound',
      'Web3NameNotFound',
      'Internal',
    ],
  },
}
