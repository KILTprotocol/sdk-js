// Auto-generated via `yarn polkadot-types-from-defs`, do not edit
/* eslint-disable */

import type { Bytes, Enum, Option, Struct, Text, Vec, bool, u16 } from '@polkadot/types-codec';
import type { AccountId32, BlockNumber, Hash, Perquintill } from '@polkadot/types/interfaces/runtime';
// FIXME: manually added as they are not automatically imported
import type { DidServiceEndpointsDidEndpoint, DidDidDetails, DidDidDetailsDidPublicKeyDetails, PalletDidLookupLinkableAccountLinkableAccountId } from '@polkadot/types/lookup'

/** @name BlindedLeaves */
export interface BlindedLeaves extends Vec<BlindedValue> { }

/** @name BlindedValue */
export interface BlindedValue extends Bytes { }

/** @name CompleteMerkleProof */
export interface CompleteMerkleProof extends Struct {
  readonly root: MerkleRoot;
  readonly proof: MerkleProof;
}

/** @name DidApiAccountId */
export interface DidApiAccountId extends PalletDidLookupLinkableAccountLinkableAccountId { }

/** @name DidIdentityProviderError */
export interface DidIdentityProviderError extends Enum {
  readonly isDidNotFound: boolean;
  readonly isInternal: boolean;
  readonly type: 'DidNotFound' | 'Internal';
}

/** @name DidMerkleProofError */
export interface DidMerkleProofError extends Enum {
  readonly isUnsupportedVersion: boolean;
  readonly isKeyNotFound: boolean;
  readonly isLinkedAccountNotFound: boolean;
  readonly isWeb3NameNotFound: boolean;
  readonly isInternal: boolean;
  readonly type: 'UnsupportedVersion' | 'KeyNotFound' | 'LinkedAccountNotFound' | 'Web3NameNotFound' | 'Internal';
}

/** @name DipProofRequest */
export interface DipProofRequest extends Struct {
  readonly identifier: AccountId32;
  readonly version: IdentityCommitmentVersion;
  readonly proofKeys: Vec<Hash>;
  readonly accounts: Vec<PalletDidLookupLinkableAccountLinkableAccountId>;
  readonly shouldIncludeWeb3Name: bool;
}

/** @name IdentityCommitmentVersion */
export interface IdentityCommitmentVersion extends u16 { }

/** @name KeyRelationship */
export interface KeyRelationship extends Enum {
  readonly isEncryption: boolean;
  readonly isVerification: boolean;
  readonly asVerification: VerificationRelationship;
  readonly type: 'Encryption' | 'Verification';
}

/** @name LinkedDidIdentityProviderError */
export interface LinkedDidIdentityProviderError extends Enum {
  readonly isDidNotFound: boolean;
  readonly isDidDeleted: boolean;
  readonly isInternal: boolean;
  readonly type: 'DidNotFound' | 'DidDeleted' | 'Internal';
}

/** @name MerkleProof */
export interface MerkleProof extends Struct {
  readonly blinded: BlindedLeaves;
  readonly revealed: RevealedLeaves;
}

/** @name MerkleRoot */
export interface MerkleRoot extends Hash { }

/** @name PublicCredentialError */
export interface PublicCredentialError extends Enum {
  readonly isInvalidSubjectId: boolean;
  readonly type: 'InvalidSubjectId';
}

/** @name PublicCredentialFilter */
export interface PublicCredentialFilter extends Enum {
  readonly isCtypeHash: boolean;
  readonly asCtypeHash: Hash;
  readonly isAttester: boolean;
  readonly asAttester: AccountId32;
  readonly type: 'CtypeHash' | 'Attester';
}

/** @name RawDidLinkedInfo */
export interface RawDidLinkedInfo extends Struct {
  readonly identifier: AccountId32;
  readonly accounts: Vec<DidApiAccountId>;
  readonly w3n: Option<Text>;
  readonly serviceEndpoints: Vec<DidServiceEndpointsDidEndpoint>;
  readonly details: DidDidDetails;
}

/** @name RevealedAccountId */
export interface RevealedAccountId extends PalletDidLookupLinkableAccountLinkableAccountId { }

/** @name RevealedDidKey */
export interface RevealedDidKey extends Struct {
  readonly id: Hash;
  readonly relationship: KeyRelationship;
  readonly details: DidDidDetailsDidPublicKeyDetails;
}

/** @name RevealedLeaf */
export interface RevealedLeaf extends Enum {
  readonly isDidKey: boolean;
  readonly asDidKey: RevealedDidKey;
  readonly isWeb3Name: boolean;
  readonly asWeb3Name: RevealedWeb3Name;
  readonly isLinkedAccount: boolean;
  readonly asLinkedAccount: RevealedAccountId;
  readonly type: 'DidKey' | 'Web3Name' | 'LinkedAccount';
}

/** @name RevealedLeaves */
export interface RevealedLeaves extends Vec<RevealedLeaf> { }

/** @name RevealedWeb3Name */
export interface RevealedWeb3Name extends Struct {
  readonly web3Name: Text;
  readonly claimedAt: BlockNumber;
}

/** @name RuntimeApiDipProofError */
export interface RuntimeApiDipProofError extends Enum {
  readonly isIdentityProvider: boolean;
  readonly asIdentityProvider: LinkedDidIdentityProviderError;
  readonly isMerkleProof: boolean;
  readonly asMerkleProof: DidMerkleProofError;
  readonly type: 'IdentityProvider' | 'MerkleProof';
}

/** @name StakingRates */
export interface StakingRates extends Struct {
  readonly collatorStakingRate: Perquintill;
  readonly collatorRewardRate: Perquintill;
  readonly delegatorStakingRate: Perquintill;
  readonly delegatorRewardRate: Perquintill;
}

/** @name VerificationRelationship */
export interface VerificationRelationship extends Enum {
  readonly isAuthentication: boolean;
  readonly isCapabilityDelegation: boolean;
  readonly isCapabilityInvocation: boolean;
  readonly isAssertionMethod: boolean;
  readonly type: 'Authentication' | 'CapabilityDelegation' | 'CapabilityInvocation' | 'AssertionMethod';
}

export type PHANTOM_EXTRADEFS = 'extraDefs';
