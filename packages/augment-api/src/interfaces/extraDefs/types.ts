// Auto-generated via `yarn polkadot-types-from-defs`, do not edit
/* eslint-disable */

import type { BTreeMap, BTreeSet, Enum, Option, Struct, Text, Vec } from '@polkadot/types-codec';
import type { AccountId32, BlockNumber, Hash } from '@polkadot/types/interfaces/runtime';

// FIXME: This import should be automatically generated as part of the typegen process, but it is somehow not happening. So it has been manually added.
import type { DidDidDetailsDidPublicKeyDetails, KiltSupportDeposit, PalletDidLookupLinkableAccountLinkableAccountId } from '@polkadot/types/lookup'

/** @name PublicCredentialFilter */
export interface PublicCredentialFilter extends Enum {
  readonly isCtypeHash: boolean;
  readonly asCtypeHash: Hash;
  readonly isAttester: boolean;
  readonly asAttester: AccountId32;
  readonly type: 'CtypeHash' | 'Attester';
}

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
  readonly accounts: Vec<PalletDidLookupLinkableAccountLinkableAccountId>;
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

export type PHANTOM_EXTRADEFS = 'extraDefs';
