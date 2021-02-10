// Auto-generated via `yarn polkadot-types-from-defs`, do not edit
/* eslint-disable */

import type { Option, Struct, bool, u16, u32, u64 } from '@polkadot/types';
import type { MultiSignature } from '@polkadot/types/interfaces/extrinsics';
import type { AccountId, Hash } from '@polkadot/types/interfaces/runtime';

/** @name Address */
export interface Address extends AccountId {}

/** @name Attestation */
export interface Attestation extends Struct {
  readonly ctypeHash: Hash;
  readonly attester: AccountId;
  readonly delegationId: Option<DelegationNodeId>;
  readonly revoked: bool;
}

/** @name BlockNumber */
export interface BlockNumber extends u64 {}

/** @name DelegationNode */
export interface DelegationNode extends Struct {
  readonly rootId: DelegationNodeId;
  readonly parent: Option<DelegationNodeId>;
  readonly owner: AccountId;
  readonly permissions: Permissions;
  readonly revoked: bool;
}

/** @name DelegationNodeId */
export interface DelegationNodeId extends Hash {}

/** @name DelegationRoot */
export interface DelegationRoot extends Struct {
  readonly ctypeHash: Hash;
  readonly owner: AccountId;
  readonly revoked: bool;
}

/** @name ErrorCode */
export interface ErrorCode extends u16 {}

/** @name Index */
export interface Index extends u64 {}

/** @name LookupSource */
export interface LookupSource extends AccountId {}

/** @name Permissions */
export interface Permissions extends u32 {}

/** @name PublicBoxKey */
export interface PublicBoxKey extends Hash {}

/** @name PublicSigningKey */
export interface PublicSigningKey extends Hash {}

/** @name RefCount */
export interface RefCount extends u32 {}

/** @name Signature */
export interface Signature extends MultiSignature {}

export type PHANTOM_KILT = 'Kilt';
