// Auto-generated via `yarn polkadot-types-from-defs`, do not edit
/* eslint-disable */

import type { BTreeMap, BTreeSet, Enum, Option, Struct, Text, Vec } from '@polkadot/types-codec';
import type { AccountId32, AccountId33, BlockNumber, Hash, Perquintill } from '@polkadot/types/interfaces/runtime';

// FIXME: manually added as they are not automatically imported
import type { DidDidDetailsDidPublicKeyDetails, KiltSupportDeposit, PalletDidLookupLinkableAccountLinkableAccountId } from '@polkadot/types/lookup'

/** @name DidLinkedInfo */
export interface DidLinkedInfo extends Struct {
  readonly identifier: AccountId32;
  readonly accounts: Vec<PalletDidLookupLinkableAccountLinkableAccountId>;
  readonly w3n: Option<Text>;
  readonly serviceEndpoints: Vec<RpcServiceEndpoint>;
  readonly details: RpcDidDetails;
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

/** @name RpcDidDetails */
export interface RpcDidDetails extends Struct {
  readonly authenticationKey: Hash;
  readonly keyAgreementKeys: BTreeSet<Hash>;
  readonly delegationKey: Option<Hash>;
  readonly attestationKey: Option<Hash>;
  readonly publicKeys: BTreeMap<Hash, RpcPublicKeyDetails>;
  readonly lastTxCounter: BlockNumber;
  readonly deposit: KiltSupportDeposit;
}

/** @name RpcDidEncryptionKey */
export interface RpcDidEncryptionKey extends Enum {
  readonly isX25519: boolean;
  readonly asX25519: AccountId32;
  readonly type: 'X25519';
}

/** @name RpcDidPublicKey */
export interface RpcDidPublicKey extends Enum {
  readonly isPublicVerificationKey: boolean;
  readonly asPublicVerificationKey: RpcDidVerificationKey;
  readonly isPublicEncryptionKey: boolean;
  readonly asPublicEncryptionKey: RpcDidEncryptionKey;
  readonly type: 'PublicVerificationKey' | 'PublicEncryptionKey';
}

/** @name RpcDidVerificationKey */
export interface RpcDidVerificationKey extends Enum {
  readonly isEd25519: boolean;
  readonly asEd25519: AccountId32;
  readonly isSr25519: boolean;
  readonly asSr25519: AccountId32;
  readonly isEcdsa: boolean;
  readonly asEcdsa: AccountId33;
  readonly type: 'Ed25519' | 'Sr25519' | 'Ecdsa';
}

/** @name RpcPublicKeyDetails */
export interface RpcPublicKeyDetails extends Struct {
  readonly key: RpcDidPublicKey;
  readonly blockNumber: BlockNumber;
}

/** @name RpcServiceEndpoint */
export interface RpcServiceEndpoint extends Struct {
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
