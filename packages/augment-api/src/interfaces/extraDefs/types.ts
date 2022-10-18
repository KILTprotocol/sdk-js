// Auto-generated via `yarn polkadot-types-from-defs`, do not edit
/* eslint-disable */

import type { BTreeMap, BTreeSet, Option, Struct, Text, Vec } from '@polkadot/types-codec';
import type { AccountId32, BlockNumber, Hash, Perquintill } from '@polkadot/types/interfaces/runtime';

// FIXME: manually added as they are not automatically imported
import type { DidDidDetailsDidPublicKeyDetails, KiltSupportDeposit, PalletDidLookupLinkableAccountLinkableAccountId } from '@polkadot/types/lookup'

/** @name DidApiAccountId */
export interface DidApiAccountId extends PalletDidLookupLinkableAccountLinkableAccountId {}

/** @name RawDidDetails */
export interface RawDidDetails extends Struct {
  readonly authenticationKey: Hash;
  readonly keyAgreementKeys: BTreeSet<Hash>;
  readonly delegationKey: Option<Hash>;
  readonly attestationKey: Option<Hash>;
  readonly publicKeys: BTreeMap<Hash, DidDidDetailsDidPublicKeyDetails>;
  readonly lastTxCounter: BlockNumber;
  readonly deposit: KiltSupportDeposit;
}

/** @name RawDidLinkedInfo */
export interface RawDidLinkedInfo extends Struct {
  readonly identifier: AccountId32;
  readonly accounts: Vec<DidApiAccountId>;
  readonly w3n: Option<Text>;
  readonly serviceEndpoints: Vec<RawServiceEndpoints>;
  readonly details: RawDidDetails;
}

/** @name RawServiceEndpoints */
export interface RawServiceEndpoints extends Struct {
  readonly id: Text;
  readonly serviceTypes: Vec<Text>;
  readonly urls: Vec<Text>;
}

/** @name StakingRates */
export interface StakingRates extends Struct {
  readonly collatorStakingRate: Perquintill;
  readonly collatorRewardRate: Perquintill;
  readonly delegatorStakingRate: Perquintill;
  readonly delegatorRewardRate: Perquintill;
}

export type PHANTOM_EXTRADEFS = 'extraDefs';
