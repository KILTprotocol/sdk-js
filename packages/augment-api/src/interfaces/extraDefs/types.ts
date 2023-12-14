// Auto-generated via `yarn polkadot-types-from-defs`, do not edit
/* eslint-disable */

import type { Bytes, Enum, Null, Option, Struct, Text, Vec, bool, u16 } from '@polkadot/types-codec';
import type { ITuple } from '@polkadot/types-codec/types';
import type { AccountId32, BlockNumber, Hash, Perquintill } from '@polkadot/types/interfaces/runtime';
// FIXME: manually added as they are not automatically imported
import type { DidServiceEndpointsDidEndpoint, DidDidDetails, DidDidDetailsDidPublicKeyDetails, PalletDidLookupLinkableAccountLinkableAccountId } from '@polkadot/types/lookup'

/** @name BlindedLeaves */
export interface BlindedLeaves extends Vec<BlindedValue> {}

/** @name BlindedValue */
export interface BlindedValue extends Bytes {}

/** @name CompleteMerkleProof */
export interface CompleteMerkleProof extends Struct {
  readonly root: MerkleRoot;
  readonly proof: MerkleProof;
}

/** @name DidApiAccountId */
export interface DidApiAccountId extends PalletDidLookupLinkableAccountLinkableAccountId {}

/** @name DidIdentityProviderError */
export interface DidIdentityProviderError extends Enum {
  readonly isDidNotFound: boolean;
  readonly isInternal: boolean;
  readonly type: 'DidNotFound' | 'Internal';
}

/** @name DidKeyMerkleKey */
export interface DidKeyMerkleKey extends ITuple<[KeyId, KeyRelationship]> {}

/** @name DidKeyMerkleValue */
export interface DidKeyMerkleValue extends DidDidDetailsDidPublicKeyDetails {}

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
// @ts-expect-error Property `keys` is confused with the `keys` property of an iterator.
export interface DipProofRequest extends Struct {
  readonly identifier: AccountId32;
  readonly version: IdentityCommitmentVersion;
  readonly keys: Vec<Hash>;
  readonly accounts: Vec<PalletDidLookupLinkableAccountLinkableAccountId>;
  readonly shouldIncludeWeb3Name: bool;
}

/** @name IdentityCommitmentVersion */
export interface IdentityCommitmentVersion extends u16 {}

/** @name KeyId */
export interface KeyId extends Hash {}

/** @name KeyRelationship */
export interface KeyRelationship extends Enum {
  readonly isEncryption: boolean;
  readonly isVerification: boolean;
  readonly asVerification: VerificationRelationship;
  readonly type: 'Encryption' | 'Verification';
}

/** @name LinkedAccountMerkleKey */
export interface LinkedAccountMerkleKey extends PalletDidLookupLinkableAccountLinkableAccountId {}

/** @name LinkedAccountMerkleValue */
export interface LinkedAccountMerkleValue extends Null {}

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
export interface MerkleRoot extends Hash {}

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

/** @name RevealedLeaf */
export interface RevealedLeaf extends Enum {
  readonly isDidKey: boolean;
  readonly asDidKey: ITuple<[DidKeyMerkleKey, DidKeyMerkleValue]>;
  readonly isWeb3Name: boolean;
  readonly asWeb3Name: ITuple<[Web3NameMerkleKey, Web3NameMerkleValue]>;
  readonly isLinkedAccount: boolean;
  readonly asLinkedAccount: ITuple<[LinkedAccountMerkleKey, LinkedAccountMerkleValue]>;
  readonly type: 'DidKey' | 'Web3Name' | 'LinkedAccount';
}

/** @name RevealedLeaves */
export interface RevealedLeaves extends Vec<RevealedLeaf> {}

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

/** @name Web3NameMerkleKey */
export interface Web3NameMerkleKey extends Text {}

/** @name Web3NameMerkleValue */
export interface Web3NameMerkleValue extends BlockNumber {}

export type PHANTOM_EXTRADEFS = 'extraDefs';
