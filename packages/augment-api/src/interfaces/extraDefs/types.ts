// Auto-generated via `yarn polkadot-types-from-defs`, do not edit
/* eslint-disable */

import type { Enum, Option, Struct, Text, Vec } from '@polkadot/types-codec';
import type { AccountId32, Hash, Perquintill } from '@polkadot/types/interfaces/runtime';
// FIXME: manually added as they are not automatically imported
import type { DidServiceEndpointsDidEndpoint, DidDidDetails } from '@polkadot/types/lookup'

/** @name DidApiAccountId */
export interface DidApiAccountId extends AccountId32 {}

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

/** @name StakingRates */
export interface StakingRates extends Struct {
  readonly collatorStakingRate: Perquintill;
  readonly collatorRewardRate: Perquintill;
  readonly delegatorStakingRate: Perquintill;
  readonly delegatorRewardRate: Perquintill;
}

export type PHANTOM_EXTRADEFS = 'extraDefs';
