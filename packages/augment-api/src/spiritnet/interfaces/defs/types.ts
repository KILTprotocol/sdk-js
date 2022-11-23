// Auto-generated via `yarn polkadot-types-from-defs`, do not edit
/* eslint-disable */

import type { Option, Struct, Text, Vec } from '@polkadot/types-codec';
import type { AccountId32 } from '@polkadot/types/interfaces/runtime';

// FIXME: had to be added manually
import type { DidServiceEndpointsDidEndpoint, DidDidDetails } from '@kiltprotocol/augment-api/spiritnet/types';

/** @name DidApiAccountId */
export interface DidApiAccountId extends AccountId32 {}

/** @name RawDidLinkedInfo */
export interface RawDidLinkedInfo extends Struct {
  readonly identifier: AccountId32;
  readonly accounts: Vec<DidApiAccountId>;
  readonly w3n: Option<Text>;
  readonly serviceEndpoints: Vec<DidServiceEndpointsDidEndpoint>;
  readonly details: DidDidDetails;
}

export type PHANTOM_DEFS = 'defs';
