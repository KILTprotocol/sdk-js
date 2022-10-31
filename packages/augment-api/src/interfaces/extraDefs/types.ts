// Auto-generated via `yarn polkadot-types-from-defs`, do not edit
/* eslint-disable */

import type { Option, Struct, Text, Vec } from '@polkadot/types-codec';
import type { AccountId32 } from '@polkadot/types/interfaces/runtime';
// FIXME: manually added as they are not automatically imported
import type { DidServiceEndpointsDidEndpoint, DidDidDetails, PalletDidLookupLinkableAccountLinkableAccountId } from '@polkadot/types/lookup'

/** @name DidApiAccountId */
export interface DidApiAccountId extends PalletDidLookupLinkableAccountLinkableAccountId {}

/** @name RawDidLinkedInfo */
export interface RawDidLinkedInfo extends Struct {
  readonly identifier: AccountId32;
  readonly accounts: Vec<DidApiAccountId>;
  readonly w3n: Option<Text>;
  readonly serviceEndpoints: Vec<DidServiceEndpointsDidEndpoint>;
  readonly details: DidDidDetails;
}

export type PHANTOM_EXTRADEFS = 'extraDefs';
