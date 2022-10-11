// Auto-generated via `yarn polkadot-types-from-defs`, do not edit
/* eslint-disable */

// import type lookup before we augment - in some environments
// this is required to allow for ambient/previous definitions
import '@polkadot/types/lookup';

import type { BTreeMap, BTreeSet, Bytes, Compact, Enum, Null, Option, Result, Struct, Text, U256, U8aFixed, Vec, bool, u128, u16, u32, u64, u8 } from '@polkadot/types-codec';
import type { ITuple } from '@polkadot/types-codec/types';
import type { AccountId32, Call, H256, MultiAddress, Perbill, Weight } from '@polkadot/types/interfaces/runtime';
import type { Event } from '@polkadot/types/interfaces/system';

declare module '@polkadot/types/lookup' {
  /** @name FrameSystemAccountInfo (3) */
  interface FrameSystemAccountInfo extends Struct {
    readonly nonce: u64;
    readonly consumers: u32;
    readonly providers: u32;
    readonly sufficients: u32;
    readonly data: PalletBalancesAccountData;
  }

  /** @name PalletBalancesAccountData (5) */
  interface PalletBalancesAccountData extends Struct {
    readonly free: u128;
    readonly reserved: u128;
    readonly miscFrozen: u128;
    readonly feeFrozen: u128;
  }

  /** @name FrameSupportWeightsPerDispatchClassWeight (8) */
  interface FrameSupportWeightsPerDispatchClassWeight extends Struct {
    readonly normal: Weight;
    readonly operational: Weight;
    readonly mandatory: Weight;
  }

  /** @name SpRuntimeDigest (12) */
  interface SpRuntimeDigest extends Struct {
    readonly logs: Vec<SpRuntimeDigestDigestItem>;
  }

  /** @name SpRuntimeDigestDigestItem (14) */
  interface SpRuntimeDigestDigestItem extends Enum {
    readonly isOther: boolean;
    readonly asOther: Bytes;
    readonly isConsensus: boolean;
    readonly asConsensus: ITuple<[U8aFixed, Bytes]>;
    readonly isSeal: boolean;
    readonly asSeal: ITuple<[U8aFixed, Bytes]>;
    readonly isPreRuntime: boolean;
    readonly asPreRuntime: ITuple<[U8aFixed, Bytes]>;
    readonly isRuntimeEnvironmentUpdated: boolean;
    readonly type: 'Other' | 'Consensus' | 'Seal' | 'PreRuntime' | 'RuntimeEnvironmentUpdated';
  }

  /** @name FrameSystemEventRecord (17) */
  interface FrameSystemEventRecord extends Struct {
    readonly phase: FrameSystemPhase;
    readonly event: Event;
    readonly topics: Vec<H256>;
  }

  /** @name FrameSystemEvent (19) */
  interface FrameSystemEvent extends Enum {
    readonly isExtrinsicSuccess: boolean;
    readonly asExtrinsicSuccess: {
      readonly dispatchInfo: FrameSupportWeightsDispatchInfo;
    } & Struct;
    readonly isExtrinsicFailed: boolean;
    readonly asExtrinsicFailed: {
      readonly dispatchError: SpRuntimeDispatchError;
      readonly dispatchInfo: FrameSupportWeightsDispatchInfo;
    } & Struct;
    readonly isCodeUpdated: boolean;
    readonly isNewAccount: boolean;
    readonly asNewAccount: {
      readonly account: AccountId32;
    } & Struct;
    readonly isKilledAccount: boolean;
    readonly asKilledAccount: {
      readonly account: AccountId32;
    } & Struct;
    readonly isRemarked: boolean;
    readonly asRemarked: {
      readonly sender: AccountId32;
      readonly hash_: H256;
    } & Struct;
    readonly type: 'ExtrinsicSuccess' | 'ExtrinsicFailed' | 'CodeUpdated' | 'NewAccount' | 'KilledAccount' | 'Remarked';
  }

  /** @name FrameSupportWeightsDispatchInfo (20) */
  interface FrameSupportWeightsDispatchInfo extends Struct {
    readonly weight: Weight;
    readonly class: FrameSupportWeightsDispatchClass;
    readonly paysFee: FrameSupportWeightsPays;
  }

  /** @name FrameSupportWeightsDispatchClass (21) */
  interface FrameSupportWeightsDispatchClass extends Enum {
    readonly isNormal: boolean;
    readonly isOperational: boolean;
    readonly isMandatory: boolean;
    readonly type: 'Normal' | 'Operational' | 'Mandatory';
  }

  /** @name FrameSupportWeightsPays (22) */
  interface FrameSupportWeightsPays extends Enum {
    readonly isYes: boolean;
    readonly isNo: boolean;
    readonly type: 'Yes' | 'No';
  }

  /** @name SpRuntimeDispatchError (23) */
  interface SpRuntimeDispatchError extends Enum {
    readonly isOther: boolean;
    readonly isCannotLookup: boolean;
    readonly isBadOrigin: boolean;
    readonly isModule: boolean;
    readonly asModule: SpRuntimeModuleError;
    readonly isConsumerRemaining: boolean;
    readonly isNoProviders: boolean;
    readonly isTooManyConsumers: boolean;
    readonly isToken: boolean;
    readonly asToken: SpRuntimeTokenError;
    readonly isArithmetic: boolean;
    readonly asArithmetic: SpRuntimeArithmeticError;
    readonly isTransactional: boolean;
    readonly asTransactional: SpRuntimeTransactionalError;
    readonly type: 'Other' | 'CannotLookup' | 'BadOrigin' | 'Module' | 'ConsumerRemaining' | 'NoProviders' | 'TooManyConsumers' | 'Token' | 'Arithmetic' | 'Transactional';
  }

  /** @name SpRuntimeModuleError (24) */
  interface SpRuntimeModuleError extends Struct {
    readonly index: u8;
    readonly error: U8aFixed;
  }

  /** @name SpRuntimeTokenError (25) */
  interface SpRuntimeTokenError extends Enum {
    readonly isNoFunds: boolean;
    readonly isWouldDie: boolean;
    readonly isBelowMinimum: boolean;
    readonly isCannotCreate: boolean;
    readonly isUnknownAsset: boolean;
    readonly isFrozen: boolean;
    readonly isUnsupported: boolean;
    readonly type: 'NoFunds' | 'WouldDie' | 'BelowMinimum' | 'CannotCreate' | 'UnknownAsset' | 'Frozen' | 'Unsupported';
  }

  /** @name SpRuntimeArithmeticError (26) */
  interface SpRuntimeArithmeticError extends Enum {
    readonly isUnderflow: boolean;
    readonly isOverflow: boolean;
    readonly isDivisionByZero: boolean;
    readonly type: 'Underflow' | 'Overflow' | 'DivisionByZero';
  }

  /** @name SpRuntimeTransactionalError (27) */
  interface SpRuntimeTransactionalError extends Enum {
    readonly isLimitReached: boolean;
    readonly isNoLayer: boolean;
    readonly type: 'LimitReached' | 'NoLayer';
  }

  /** @name PalletGrandpaEvent (28) */
  interface PalletGrandpaEvent extends Enum {
    readonly isNewAuthorities: boolean;
    readonly asNewAuthorities: {
      readonly authoritySet: Vec<ITuple<[SpFinalityGrandpaAppPublic, u64]>>;
    } & Struct;
    readonly isPaused: boolean;
    readonly isResumed: boolean;
    readonly type: 'NewAuthorities' | 'Paused' | 'Resumed';
  }

  /** @name SpFinalityGrandpaAppPublic (31) */
  interface SpFinalityGrandpaAppPublic extends SpCoreEd25519Public {}

  /** @name SpCoreEd25519Public (32) */
  interface SpCoreEd25519Public extends U8aFixed {}

  /** @name PalletIndicesEvent (33) */
  interface PalletIndicesEvent extends Enum {
    readonly isIndexAssigned: boolean;
    readonly asIndexAssigned: {
      readonly who: AccountId32;
      readonly index: u64;
    } & Struct;
    readonly isIndexFreed: boolean;
    readonly asIndexFreed: {
      readonly index: u64;
    } & Struct;
    readonly isIndexFrozen: boolean;
    readonly asIndexFrozen: {
      readonly index: u64;
      readonly who: AccountId32;
    } & Struct;
    readonly type: 'IndexAssigned' | 'IndexFreed' | 'IndexFrozen';
  }

  /** @name PalletBalancesEvent (34) */
  interface PalletBalancesEvent extends Enum {
    readonly isEndowed: boolean;
    readonly asEndowed: {
      readonly account: AccountId32;
      readonly freeBalance: u128;
    } & Struct;
    readonly isDustLost: boolean;
    readonly asDustLost: {
      readonly account: AccountId32;
      readonly amount: u128;
    } & Struct;
    readonly isTransfer: boolean;
    readonly asTransfer: {
      readonly from: AccountId32;
      readonly to: AccountId32;
      readonly amount: u128;
    } & Struct;
    readonly isBalanceSet: boolean;
    readonly asBalanceSet: {
      readonly who: AccountId32;
      readonly free: u128;
      readonly reserved: u128;
    } & Struct;
    readonly isReserved: boolean;
    readonly asReserved: {
      readonly who: AccountId32;
      readonly amount: u128;
    } & Struct;
    readonly isUnreserved: boolean;
    readonly asUnreserved: {
      readonly who: AccountId32;
      readonly amount: u128;
    } & Struct;
    readonly isReserveRepatriated: boolean;
    readonly asReserveRepatriated: {
      readonly from: AccountId32;
      readonly to: AccountId32;
      readonly amount: u128;
      readonly destinationStatus: FrameSupportTokensMiscBalanceStatus;
    } & Struct;
    readonly isDeposit: boolean;
    readonly asDeposit: {
      readonly who: AccountId32;
      readonly amount: u128;
    } & Struct;
    readonly isWithdraw: boolean;
    readonly asWithdraw: {
      readonly who: AccountId32;
      readonly amount: u128;
    } & Struct;
    readonly isSlashed: boolean;
    readonly asSlashed: {
      readonly who: AccountId32;
      readonly amount: u128;
    } & Struct;
    readonly type: 'Endowed' | 'DustLost' | 'Transfer' | 'BalanceSet' | 'Reserved' | 'Unreserved' | 'ReserveRepatriated' | 'Deposit' | 'Withdraw' | 'Slashed';
  }

  /** @name FrameSupportTokensMiscBalanceStatus (35) */
  interface FrameSupportTokensMiscBalanceStatus extends Enum {
    readonly isFree: boolean;
    readonly isReserved: boolean;
    readonly type: 'Free' | 'Reserved';
  }

  /** @name PalletTransactionPaymentEvent (36) */
  interface PalletTransactionPaymentEvent extends Enum {
    readonly isTransactionFeePaid: boolean;
    readonly asTransactionFeePaid: {
      readonly who: AccountId32;
      readonly actualFee: u128;
      readonly tip: u128;
    } & Struct;
    readonly type: 'TransactionFeePaid';
  }

  /** @name PalletSudoEvent (37) */
  interface PalletSudoEvent extends Enum {
    readonly isSudid: boolean;
    readonly asSudid: {
      readonly sudoResult: Result<Null, SpRuntimeDispatchError>;
    } & Struct;
    readonly isKeyChanged: boolean;
    readonly asKeyChanged: {
      readonly oldSudoer: Option<AccountId32>;
    } & Struct;
    readonly isSudoAsDone: boolean;
    readonly asSudoAsDone: {
      readonly sudoResult: Result<Null, SpRuntimeDispatchError>;
    } & Struct;
    readonly type: 'Sudid' | 'KeyChanged' | 'SudoAsDone';
  }

  /** @name CtypeEvent (41) */
  interface CtypeEvent extends Enum {
    readonly isCTypeCreated: boolean;
    readonly asCTypeCreated: ITuple<[AccountId32, H256]>;
    readonly type: 'CTypeCreated';
  }

  /** @name AttestationEvent (42) */
  interface AttestationEvent extends Enum {
    readonly isAttestationCreated: boolean;
    readonly asAttestationCreated: ITuple<[AccountId32, H256, H256, Option<RuntimeCommonAuthorizationAuthorizationId>]>;
    readonly isAttestationRevoked: boolean;
    readonly asAttestationRevoked: ITuple<[AccountId32, H256]>;
    readonly isAttestationRemoved: boolean;
    readonly asAttestationRemoved: ITuple<[AccountId32, H256]>;
    readonly isDepositReclaimed: boolean;
    readonly asDepositReclaimed: ITuple<[AccountId32, H256]>;
    readonly type: 'AttestationCreated' | 'AttestationRevoked' | 'AttestationRemoved' | 'DepositReclaimed';
  }

  /** @name RuntimeCommonAuthorizationAuthorizationId (44) */
  interface RuntimeCommonAuthorizationAuthorizationId extends Enum {
    readonly isDelegation: boolean;
    readonly asDelegation: H256;
    readonly type: 'Delegation';
  }

  /** @name DelegationEvent (45) */
  interface DelegationEvent extends Enum {
    readonly isHierarchyCreated: boolean;
    readonly asHierarchyCreated: ITuple<[AccountId32, H256, H256]>;
    readonly isHierarchyRevoked: boolean;
    readonly asHierarchyRevoked: ITuple<[AccountId32, H256]>;
    readonly isHierarchyRemoved: boolean;
    readonly asHierarchyRemoved: ITuple<[AccountId32, H256]>;
    readonly isDelegationCreated: boolean;
    readonly asDelegationCreated: ITuple<[AccountId32, H256, H256, H256, AccountId32, DelegationDelegationHierarchyPermissions]>;
    readonly isDelegationRevoked: boolean;
    readonly asDelegationRevoked: ITuple<[AccountId32, H256]>;
    readonly isDelegationRemoved: boolean;
    readonly asDelegationRemoved: ITuple<[AccountId32, H256]>;
    readonly isDepositReclaimed: boolean;
    readonly asDepositReclaimed: ITuple<[AccountId32, H256]>;
    readonly type: 'HierarchyCreated' | 'HierarchyRevoked' | 'HierarchyRemoved' | 'DelegationCreated' | 'DelegationRevoked' | 'DelegationRemoved' | 'DepositReclaimed';
  }

  /** @name DelegationDelegationHierarchyPermissions (46) */
  interface DelegationDelegationHierarchyPermissions extends Struct {
    readonly bits: u32;
  }

  /** @name DidEvent (47) */
  interface DidEvent extends Enum {
    readonly isDidCreated: boolean;
    readonly asDidCreated: ITuple<[AccountId32, AccountId32]>;
    readonly isDidUpdated: boolean;
    readonly asDidUpdated: AccountId32;
    readonly isDidDeleted: boolean;
    readonly asDidDeleted: AccountId32;
    readonly isDidCallDispatched: boolean;
    readonly asDidCallDispatched: ITuple<[AccountId32, Result<Null, SpRuntimeDispatchError>]>;
    readonly type: 'DidCreated' | 'DidUpdated' | 'DidDeleted' | 'DidCallDispatched';
  }

  /** @name PalletDidLookupEvent (48) */
  interface PalletDidLookupEvent extends Enum {
    readonly isAssociationEstablished: boolean;
    readonly asAssociationEstablished: ITuple<[PalletDidLookupLinkableAccountLinkableAccountId, AccountId32]>;
    readonly isAssociationRemoved: boolean;
    readonly asAssociationRemoved: ITuple<[PalletDidLookupLinkableAccountLinkableAccountId, AccountId32]>;
    readonly type: 'AssociationEstablished' | 'AssociationRemoved';
  }

  /** @name PalletDidLookupLinkableAccountLinkableAccountId (49) */
  interface PalletDidLookupLinkableAccountLinkableAccountId extends Enum {
    readonly isAccountId20: boolean;
    readonly asAccountId20: PalletDidLookupAccountAccountId20;
    readonly isAccountId32: boolean;
    readonly asAccountId32: AccountId32;
    readonly type: 'AccountId20' | 'AccountId32';
  }

  /** @name PalletDidLookupAccountAccountId20 (50) */
  interface PalletDidLookupAccountAccountId20 extends U8aFixed {}

  /** @name PalletSessionEvent (52) */
  interface PalletSessionEvent extends Enum {
    readonly isNewSession: boolean;
    readonly asNewSession: {
      readonly sessionIndex: u32;
    } & Struct;
    readonly type: 'NewSession';
  }

  /** @name PalletUtilityEvent (53) */
  interface PalletUtilityEvent extends Enum {
    readonly isBatchInterrupted: boolean;
    readonly asBatchInterrupted: {
      readonly index: u32;
      readonly error: SpRuntimeDispatchError;
    } & Struct;
    readonly isBatchCompleted: boolean;
    readonly isBatchCompletedWithErrors: boolean;
    readonly isItemCompleted: boolean;
    readonly isItemFailed: boolean;
    readonly asItemFailed: {
      readonly error: SpRuntimeDispatchError;
    } & Struct;
    readonly isDispatchedAs: boolean;
    readonly asDispatchedAs: {
      readonly result: Result<Null, SpRuntimeDispatchError>;
    } & Struct;
    readonly type: 'BatchInterrupted' | 'BatchCompleted' | 'BatchCompletedWithErrors' | 'ItemCompleted' | 'ItemFailed' | 'DispatchedAs';
  }

  /** @name PalletProxyEvent (54) */
  interface PalletProxyEvent extends Enum {
    readonly isProxyExecuted: boolean;
    readonly asProxyExecuted: {
      readonly result: Result<Null, SpRuntimeDispatchError>;
    } & Struct;
    readonly isAnonymousCreated: boolean;
    readonly asAnonymousCreated: {
      readonly anonymous: AccountId32;
      readonly who: AccountId32;
      readonly proxyType: MashnetNodeRuntimeProxyType;
      readonly disambiguationIndex: u16;
    } & Struct;
    readonly isAnnounced: boolean;
    readonly asAnnounced: {
      readonly real: AccountId32;
      readonly proxy: AccountId32;
      readonly callHash: H256;
    } & Struct;
    readonly isProxyAdded: boolean;
    readonly asProxyAdded: {
      readonly delegator: AccountId32;
      readonly delegatee: AccountId32;
      readonly proxyType: MashnetNodeRuntimeProxyType;
      readonly delay: u64;
    } & Struct;
    readonly isProxyRemoved: boolean;
    readonly asProxyRemoved: {
      readonly delegator: AccountId32;
      readonly delegatee: AccountId32;
      readonly proxyType: MashnetNodeRuntimeProxyType;
      readonly delay: u64;
    } & Struct;
    readonly type: 'ProxyExecuted' | 'AnonymousCreated' | 'Announced' | 'ProxyAdded' | 'ProxyRemoved';
  }

  /** @name MashnetNodeRuntimeProxyType (55) */
  interface MashnetNodeRuntimeProxyType extends Enum {
    readonly isAny: boolean;
    readonly isNonTransfer: boolean;
    readonly isCancelProxy: boolean;
    readonly isNonDepositClaiming: boolean;
    readonly type: 'Any' | 'NonTransfer' | 'CancelProxy' | 'NonDepositClaiming';
  }

  /** @name PalletWeb3NamesEvent (57) */
  interface PalletWeb3NamesEvent extends Enum {
    readonly isWeb3NameClaimed: boolean;
    readonly asWeb3NameClaimed: {
      readonly owner: AccountId32;
      readonly name: Bytes;
    } & Struct;
    readonly isWeb3NameReleased: boolean;
    readonly asWeb3NameReleased: {
      readonly owner: AccountId32;
      readonly name: Bytes;
    } & Struct;
    readonly isWeb3NameBanned: boolean;
    readonly asWeb3NameBanned: {
      readonly name: Bytes;
    } & Struct;
    readonly isWeb3NameUnbanned: boolean;
    readonly asWeb3NameUnbanned: {
      readonly name: Bytes;
    } & Struct;
    readonly type: 'Web3NameClaimed' | 'Web3NameReleased' | 'Web3NameBanned' | 'Web3NameUnbanned';
  }

  /** @name PublicCredentialsEvent (60) */
  interface PublicCredentialsEvent extends Enum {
    readonly isCredentialStored: boolean;
    readonly asCredentialStored: {
      readonly subjectId: RuntimeCommonAssetsAssetDid;
      readonly credentialId: H256;
    } & Struct;
    readonly isCredentialRemoved: boolean;
    readonly asCredentialRemoved: {
      readonly subjectId: RuntimeCommonAssetsAssetDid;
      readonly credentialId: H256;
    } & Struct;
    readonly isCredentialRevoked: boolean;
    readonly asCredentialRevoked: {
      readonly credentialId: H256;
    } & Struct;
    readonly isCredentialUnrevoked: boolean;
    readonly asCredentialUnrevoked: {
      readonly credentialId: H256;
    } & Struct;
    readonly type: 'CredentialStored' | 'CredentialRemoved' | 'CredentialRevoked' | 'CredentialUnrevoked';
  }

  /** @name RuntimeCommonAssetsAssetDid (61) */
  interface RuntimeCommonAssetsAssetDid extends KiltAssetDidsV1AssetDid {}

  /** @name KiltAssetDidsV1AssetDid (62) */
  interface KiltAssetDidsV1AssetDid extends Struct {
    readonly chainId: KiltAssetDidsChainV1ChainId;
    readonly assetId: KiltAssetDidsAssetV1AssetId;
  }

  /** @name KiltAssetDidsChainV1ChainId (63) */
  interface KiltAssetDidsChainV1ChainId extends Enum {
    readonly isEip155: boolean;
    readonly asEip155: u128;
    readonly isBip122: boolean;
    readonly asBip122: KiltAssetDidsChainV1GenesisHexHash32Reference;
    readonly isDotsama: boolean;
    readonly asDotsama: KiltAssetDidsChainV1GenesisHexHash32Reference;
    readonly isSolana: boolean;
    readonly asSolana: Bytes;
    readonly isGeneric: boolean;
    readonly asGeneric: KiltAssetDidsChainV1GenericChainId;
    readonly type: 'Eip155' | 'Bip122' | 'Dotsama' | 'Solana' | 'Generic';
  }

  /** @name KiltAssetDidsChainV1GenesisHexHash32Reference (65) */
  interface KiltAssetDidsChainV1GenesisHexHash32Reference extends U8aFixed {}

  /** @name KiltAssetDidsChainV1GenericChainId (69) */
  interface KiltAssetDidsChainV1GenericChainId extends Struct {
    readonly namespace: Bytes;
    readonly reference: Bytes;
  }

  /** @name KiltAssetDidsAssetV1AssetId (73) */
  interface KiltAssetDidsAssetV1AssetId extends Enum {
    readonly isSlip44: boolean;
    readonly asSlip44: U256;
    readonly isErc20: boolean;
    readonly asErc20: KiltAssetDidsAssetV1EvmSmartContractFungibleReference;
    readonly isErc721: boolean;
    readonly asErc721: KiltAssetDidsAssetV1EvmSmartContractNonFungibleReference;
    readonly isErc1155: boolean;
    readonly asErc1155: KiltAssetDidsAssetV1EvmSmartContractNonFungibleReference;
    readonly isGeneric: boolean;
    readonly asGeneric: KiltAssetDidsAssetV1GenericAssetId;
    readonly type: 'Slip44' | 'Erc20' | 'Erc721' | 'Erc1155' | 'Generic';
  }

  /** @name KiltAssetDidsAssetV1EvmSmartContractFungibleReference (77) */
  interface KiltAssetDidsAssetV1EvmSmartContractFungibleReference extends U8aFixed {}

  /** @name KiltAssetDidsAssetV1EvmSmartContractNonFungibleReference (78) */
  interface KiltAssetDidsAssetV1EvmSmartContractNonFungibleReference extends ITuple<[KiltAssetDidsAssetV1EvmSmartContractFungibleReference, Option<Bytes>]> {}

  /** @name KiltAssetDidsAssetV1GenericAssetId (82) */
  interface KiltAssetDidsAssetV1GenericAssetId extends Struct {
    readonly namespace: Bytes;
    readonly reference: Bytes;
    readonly id: Option<Bytes>;
  }

  /** @name FrameSystemPhase (88) */
  interface FrameSystemPhase extends Enum {
    readonly isApplyExtrinsic: boolean;
    readonly asApplyExtrinsic: u32;
    readonly isFinalization: boolean;
    readonly isInitialization: boolean;
    readonly type: 'ApplyExtrinsic' | 'Finalization' | 'Initialization';
  }

  /** @name FrameSystemLastRuntimeUpgradeInfo (92) */
  interface FrameSystemLastRuntimeUpgradeInfo extends Struct {
    readonly specVersion: Compact<u32>;
    readonly specName: Text;
  }

  /** @name FrameSystemCall (96) */
  interface FrameSystemCall extends Enum {
    readonly isFillBlock: boolean;
    readonly asFillBlock: {
      readonly ratio: Perbill;
    } & Struct;
    readonly isRemark: boolean;
    readonly asRemark: {
      readonly remark: Bytes;
    } & Struct;
    readonly isSetHeapPages: boolean;
    readonly asSetHeapPages: {
      readonly pages: u64;
    } & Struct;
    readonly isSetCode: boolean;
    readonly asSetCode: {
      readonly code: Bytes;
    } & Struct;
    readonly isSetCodeWithoutChecks: boolean;
    readonly asSetCodeWithoutChecks: {
      readonly code: Bytes;
    } & Struct;
    readonly isSetStorage: boolean;
    readonly asSetStorage: {
      readonly items: Vec<ITuple<[Bytes, Bytes]>>;
    } & Struct;
    readonly isKillStorage: boolean;
    readonly asKillStorage: {
      readonly keys_: Vec<Bytes>;
    } & Struct;
    readonly isKillPrefix: boolean;
    readonly asKillPrefix: {
      readonly prefix: Bytes;
      readonly subkeys: u32;
    } & Struct;
    readonly isRemarkWithEvent: boolean;
    readonly asRemarkWithEvent: {
      readonly remark: Bytes;
    } & Struct;
    readonly type: 'FillBlock' | 'Remark' | 'SetHeapPages' | 'SetCode' | 'SetCodeWithoutChecks' | 'SetStorage' | 'KillStorage' | 'KillPrefix' | 'RemarkWithEvent';
  }

  /** @name FrameSystemLimitsBlockWeights (101) */
  interface FrameSystemLimitsBlockWeights extends Struct {
    readonly baseBlock: Weight;
    readonly maxBlock: Weight;
    readonly perClass: FrameSupportWeightsPerDispatchClassWeightsPerClass;
  }

  /** @name FrameSupportWeightsPerDispatchClassWeightsPerClass (102) */
  interface FrameSupportWeightsPerDispatchClassWeightsPerClass extends Struct {
    readonly normal: FrameSystemLimitsWeightsPerClass;
    readonly operational: FrameSystemLimitsWeightsPerClass;
    readonly mandatory: FrameSystemLimitsWeightsPerClass;
  }

  /** @name FrameSystemLimitsWeightsPerClass (103) */
  interface FrameSystemLimitsWeightsPerClass extends Struct {
    readonly baseExtrinsic: Weight;
    readonly maxExtrinsic: Option<Weight>;
    readonly maxTotal: Option<Weight>;
    readonly reserved: Option<Weight>;
  }

  /** @name FrameSystemLimitsBlockLength (105) */
  interface FrameSystemLimitsBlockLength extends Struct {
    readonly max: FrameSupportWeightsPerDispatchClassU32;
  }

  /** @name FrameSupportWeightsPerDispatchClassU32 (106) */
  interface FrameSupportWeightsPerDispatchClassU32 extends Struct {
    readonly normal: u32;
    readonly operational: u32;
    readonly mandatory: u32;
  }

  /** @name FrameSupportWeightsRuntimeDbWeight (107) */
  interface FrameSupportWeightsRuntimeDbWeight extends Struct {
    readonly read: u64;
    readonly write: u64;
  }

  /** @name SpVersionRuntimeVersion (108) */
  interface SpVersionRuntimeVersion extends Struct {
    readonly specName: Text;
    readonly implName: Text;
    readonly authoringVersion: u32;
    readonly specVersion: u32;
    readonly implVersion: u32;
    readonly apis: Vec<ITuple<[U8aFixed, u32]>>;
    readonly transactionVersion: u32;
    readonly stateVersion: u8;
  }

  /** @name FrameSystemError (113) */
  interface FrameSystemError extends Enum {
    readonly isInvalidSpecName: boolean;
    readonly isSpecVersionNeedsToIncrease: boolean;
    readonly isFailedToExtractRuntimeVersion: boolean;
    readonly isNonDefaultComposite: boolean;
    readonly isNonZeroRefCount: boolean;
    readonly isCallFiltered: boolean;
    readonly type: 'InvalidSpecName' | 'SpecVersionNeedsToIncrease' | 'FailedToExtractRuntimeVersion' | 'NonDefaultComposite' | 'NonZeroRefCount' | 'CallFiltered';
  }

  /** @name PalletTimestampCall (115) */
  interface PalletTimestampCall extends Enum {
    readonly isSet: boolean;
    readonly asSet: {
      readonly now: Compact<u64>;
    } & Struct;
    readonly type: 'Set';
  }

  /** @name SpConsensusAuraEd25519AppEd25519Public (118) */
  interface SpConsensusAuraEd25519AppEd25519Public extends SpCoreEd25519Public {}

  /** @name PalletGrandpaStoredState (121) */
  interface PalletGrandpaStoredState extends Enum {
    readonly isLive: boolean;
    readonly isPendingPause: boolean;
    readonly asPendingPause: {
      readonly scheduledAt: u64;
      readonly delay: u64;
    } & Struct;
    readonly isPaused: boolean;
    readonly isPendingResume: boolean;
    readonly asPendingResume: {
      readonly scheduledAt: u64;
      readonly delay: u64;
    } & Struct;
    readonly type: 'Live' | 'PendingPause' | 'Paused' | 'PendingResume';
  }

  /** @name PalletGrandpaStoredPendingChange (122) */
  interface PalletGrandpaStoredPendingChange extends Struct {
    readonly scheduledAt: u64;
    readonly delay: u64;
    readonly nextAuthorities: Vec<ITuple<[SpFinalityGrandpaAppPublic, u64]>>;
    readonly forced: Option<u64>;
  }

  /** @name PalletGrandpaCall (126) */
  interface PalletGrandpaCall extends Enum {
    readonly isReportEquivocation: boolean;
    readonly asReportEquivocation: {
      readonly equivocationProof: SpFinalityGrandpaEquivocationProof;
      readonly keyOwnerProof: SpCoreVoid;
    } & Struct;
    readonly isReportEquivocationUnsigned: boolean;
    readonly asReportEquivocationUnsigned: {
      readonly equivocationProof: SpFinalityGrandpaEquivocationProof;
      readonly keyOwnerProof: SpCoreVoid;
    } & Struct;
    readonly isNoteStalled: boolean;
    readonly asNoteStalled: {
      readonly delay: u64;
      readonly bestFinalizedBlockNumber: u64;
    } & Struct;
    readonly type: 'ReportEquivocation' | 'ReportEquivocationUnsigned' | 'NoteStalled';
  }

  /** @name SpFinalityGrandpaEquivocationProof (127) */
  interface SpFinalityGrandpaEquivocationProof extends Struct {
    readonly setId: u64;
    readonly equivocation: SpFinalityGrandpaEquivocation;
  }

  /** @name SpFinalityGrandpaEquivocation (128) */
  interface SpFinalityGrandpaEquivocation extends Enum {
    readonly isPrevote: boolean;
    readonly asPrevote: FinalityGrandpaEquivocationPrevote;
    readonly isPrecommit: boolean;
    readonly asPrecommit: FinalityGrandpaEquivocationPrecommit;
    readonly type: 'Prevote' | 'Precommit';
  }

  /** @name FinalityGrandpaEquivocationPrevote (129) */
  interface FinalityGrandpaEquivocationPrevote extends Struct {
    readonly roundNumber: u64;
    readonly identity: SpFinalityGrandpaAppPublic;
    readonly first: ITuple<[FinalityGrandpaPrevote, SpFinalityGrandpaAppSignature]>;
    readonly second: ITuple<[FinalityGrandpaPrevote, SpFinalityGrandpaAppSignature]>;
  }

  /** @name FinalityGrandpaPrevote (130) */
  interface FinalityGrandpaPrevote extends Struct {
    readonly targetHash: H256;
    readonly targetNumber: u64;
  }

  /** @name SpFinalityGrandpaAppSignature (131) */
  interface SpFinalityGrandpaAppSignature extends SpCoreEd25519Signature {}

  /** @name SpCoreEd25519Signature (132) */
  interface SpCoreEd25519Signature extends U8aFixed {}

  /** @name FinalityGrandpaEquivocationPrecommit (135) */
  interface FinalityGrandpaEquivocationPrecommit extends Struct {
    readonly roundNumber: u64;
    readonly identity: SpFinalityGrandpaAppPublic;
    readonly first: ITuple<[FinalityGrandpaPrecommit, SpFinalityGrandpaAppSignature]>;
    readonly second: ITuple<[FinalityGrandpaPrecommit, SpFinalityGrandpaAppSignature]>;
  }

  /** @name FinalityGrandpaPrecommit (136) */
  interface FinalityGrandpaPrecommit extends Struct {
    readonly targetHash: H256;
    readonly targetNumber: u64;
  }

  /** @name SpCoreVoid (138) */
  type SpCoreVoid = Null;

  /** @name PalletGrandpaError (139) */
  interface PalletGrandpaError extends Enum {
    readonly isPauseFailed: boolean;
    readonly isResumeFailed: boolean;
    readonly isChangePending: boolean;
    readonly isTooSoon: boolean;
    readonly isInvalidKeyOwnershipProof: boolean;
    readonly isInvalidEquivocationProof: boolean;
    readonly isDuplicateOffenceReport: boolean;
    readonly type: 'PauseFailed' | 'ResumeFailed' | 'ChangePending' | 'TooSoon' | 'InvalidKeyOwnershipProof' | 'InvalidEquivocationProof' | 'DuplicateOffenceReport';
  }

  /** @name PalletIndicesCall (141) */
  interface PalletIndicesCall extends Enum {
    readonly isClaim: boolean;
    readonly asClaim: {
      readonly index: u64;
    } & Struct;
    readonly isTransfer: boolean;
    readonly asTransfer: {
      readonly new_: MultiAddress;
      readonly index: u64;
    } & Struct;
    readonly isFree: boolean;
    readonly asFree: {
      readonly index: u64;
    } & Struct;
    readonly isForceTransfer: boolean;
    readonly asForceTransfer: {
      readonly new_: MultiAddress;
      readonly index: u64;
      readonly freeze: bool;
    } & Struct;
    readonly isFreeze: boolean;
    readonly asFreeze: {
      readonly index: u64;
    } & Struct;
    readonly type: 'Claim' | 'Transfer' | 'Free' | 'ForceTransfer' | 'Freeze';
  }

  /** @name PalletIndicesError (144) */
  interface PalletIndicesError extends Enum {
    readonly isNotAssigned: boolean;
    readonly isNotOwner: boolean;
    readonly isInUse: boolean;
    readonly isNotTransfer: boolean;
    readonly isPermanent: boolean;
    readonly type: 'NotAssigned' | 'NotOwner' | 'InUse' | 'NotTransfer' | 'Permanent';
  }

  /** @name PalletBalancesBalanceLock (146) */
  interface PalletBalancesBalanceLock extends Struct {
    readonly id: U8aFixed;
    readonly amount: u128;
    readonly reasons: PalletBalancesReasons;
  }

  /** @name PalletBalancesReasons (147) */
  interface PalletBalancesReasons extends Enum {
    readonly isFee: boolean;
    readonly isMisc: boolean;
    readonly isAll: boolean;
    readonly type: 'Fee' | 'Misc' | 'All';
  }

  /** @name PalletBalancesReserveData (150) */
  interface PalletBalancesReserveData extends Struct {
    readonly id: U8aFixed;
    readonly amount: u128;
  }

  /** @name PalletBalancesReleases (152) */
  interface PalletBalancesReleases extends Enum {
    readonly isV100: boolean;
    readonly isV200: boolean;
    readonly type: 'V100' | 'V200';
  }

  /** @name PalletBalancesCall (153) */
  interface PalletBalancesCall extends Enum {
    readonly isTransfer: boolean;
    readonly asTransfer: {
      readonly dest: MultiAddress;
      readonly value: Compact<u128>;
    } & Struct;
    readonly isSetBalance: boolean;
    readonly asSetBalance: {
      readonly who: MultiAddress;
      readonly newFree: Compact<u128>;
      readonly newReserved: Compact<u128>;
    } & Struct;
    readonly isForceTransfer: boolean;
    readonly asForceTransfer: {
      readonly source: MultiAddress;
      readonly dest: MultiAddress;
      readonly value: Compact<u128>;
    } & Struct;
    readonly isTransferKeepAlive: boolean;
    readonly asTransferKeepAlive: {
      readonly dest: MultiAddress;
      readonly value: Compact<u128>;
    } & Struct;
    readonly isTransferAll: boolean;
    readonly asTransferAll: {
      readonly dest: MultiAddress;
      readonly keepAlive: bool;
    } & Struct;
    readonly isForceUnreserve: boolean;
    readonly asForceUnreserve: {
      readonly who: MultiAddress;
      readonly amount: u128;
    } & Struct;
    readonly type: 'Transfer' | 'SetBalance' | 'ForceTransfer' | 'TransferKeepAlive' | 'TransferAll' | 'ForceUnreserve';
  }

  /** @name PalletBalancesError (155) */
  interface PalletBalancesError extends Enum {
    readonly isVestingBalance: boolean;
    readonly isLiquidityRestrictions: boolean;
    readonly isInsufficientBalance: boolean;
    readonly isExistentialDeposit: boolean;
    readonly isKeepAlive: boolean;
    readonly isExistingVestingSchedule: boolean;
    readonly isDeadAccount: boolean;
    readonly isTooManyReserves: boolean;
    readonly type: 'VestingBalance' | 'LiquidityRestrictions' | 'InsufficientBalance' | 'ExistentialDeposit' | 'KeepAlive' | 'ExistingVestingSchedule' | 'DeadAccount' | 'TooManyReserves';
  }

  /** @name PalletTransactionPaymentReleases (157) */
  interface PalletTransactionPaymentReleases extends Enum {
    readonly isV1Ancient: boolean;
    readonly isV2: boolean;
    readonly type: 'V1Ancient' | 'V2';
  }

  /** @name PalletSudoCall (158) */
  interface PalletSudoCall extends Enum {
    readonly isSudo: boolean;
    readonly asSudo: {
      readonly call: Call;
    } & Struct;
    readonly isSudoUncheckedWeight: boolean;
    readonly asSudoUncheckedWeight: {
      readonly call: Call;
      readonly weight: Weight;
    } & Struct;
    readonly isSetKey: boolean;
    readonly asSetKey: {
      readonly new_: MultiAddress;
    } & Struct;
    readonly isSudoAs: boolean;
    readonly asSudoAs: {
      readonly who: MultiAddress;
      readonly call: Call;
    } & Struct;
    readonly type: 'Sudo' | 'SudoUncheckedWeight' | 'SetKey' | 'SudoAs';
  }

  /** @name CtypeCall (160) */
  interface CtypeCall extends Enum {
    readonly isAdd: boolean;
    readonly asAdd: {
      readonly ctype: Bytes;
    } & Struct;
    readonly type: 'Add';
  }

  /** @name AttestationCall (161) */
  interface AttestationCall extends Enum {
    readonly isAdd: boolean;
    readonly asAdd: {
      readonly claimHash: H256;
      readonly ctypeHash: H256;
      readonly authorization: Option<RuntimeCommonAuthorizationPalletAuthorize>;
    } & Struct;
    readonly isRevoke: boolean;
    readonly asRevoke: {
      readonly claimHash: H256;
      readonly authorization: Option<RuntimeCommonAuthorizationPalletAuthorize>;
    } & Struct;
    readonly isRemove: boolean;
    readonly asRemove: {
      readonly claimHash: H256;
      readonly authorization: Option<RuntimeCommonAuthorizationPalletAuthorize>;
    } & Struct;
    readonly isReclaimDeposit: boolean;
    readonly asReclaimDeposit: {
      readonly claimHash: H256;
    } & Struct;
    readonly isTransferDeposit: boolean;
    readonly asTransferDeposit: {
      readonly claimHash: H256;
    } & Struct;
    readonly type: 'Add' | 'Revoke' | 'Remove' | 'ReclaimDeposit' | 'TransferDeposit';
  }

  /** @name RuntimeCommonAuthorizationPalletAuthorize (163) */
  interface RuntimeCommonAuthorizationPalletAuthorize extends Enum {
    readonly isDelegation: boolean;
    readonly asDelegation: DelegationAccessControlDelegationAc;
    readonly type: 'Delegation';
  }

  /** @name DelegationAccessControlDelegationAc (164) */
  interface DelegationAccessControlDelegationAc extends Struct {
    readonly subjectNodeId: H256;
    readonly maxChecks: u32;
  }

  /** @name MashnetNodeRuntimeRuntime (165) */
  type MashnetNodeRuntimeRuntime = Null;

  /** @name DelegationCall (166) */
  interface DelegationCall extends Enum {
    readonly isCreateHierarchy: boolean;
    readonly asCreateHierarchy: {
      readonly rootNodeId: H256;
      readonly ctypeHash: H256;
    } & Struct;
    readonly isAddDelegation: boolean;
    readonly asAddDelegation: {
      readonly delegationId: H256;
      readonly parentId: H256;
      readonly delegate: AccountId32;
      readonly permissions: DelegationDelegationHierarchyPermissions;
      readonly delegateSignature: DidDidDetailsDidSignature;
    } & Struct;
    readonly isRevokeDelegation: boolean;
    readonly asRevokeDelegation: {
      readonly delegationId: H256;
      readonly maxParentChecks: u32;
      readonly maxRevocations: u32;
    } & Struct;
    readonly isRemoveDelegation: boolean;
    readonly asRemoveDelegation: {
      readonly delegationId: H256;
      readonly maxRemovals: u32;
    } & Struct;
    readonly isReclaimDeposit: boolean;
    readonly asReclaimDeposit: {
      readonly delegationId: H256;
      readonly maxRemovals: u32;
    } & Struct;
    readonly isTransferDeposit: boolean;
    readonly asTransferDeposit: {
      readonly delegationId: H256;
    } & Struct;
    readonly type: 'CreateHierarchy' | 'AddDelegation' | 'RevokeDelegation' | 'RemoveDelegation' | 'ReclaimDeposit' | 'TransferDeposit';
  }

  /** @name DidDidDetailsDidSignature (167) */
  interface DidDidDetailsDidSignature extends Enum {
    readonly isEd25519: boolean;
    readonly asEd25519: SpCoreEd25519Signature;
    readonly isSr25519: boolean;
    readonly asSr25519: SpCoreSr25519Signature;
    readonly isEcdsa: boolean;
    readonly asEcdsa: SpCoreEcdsaSignature;
    readonly type: 'Ed25519' | 'Sr25519' | 'Ecdsa';
  }

  /** @name SpCoreSr25519Signature (168) */
  interface SpCoreSr25519Signature extends U8aFixed {}

  /** @name SpCoreEcdsaSignature (169) */
  interface SpCoreEcdsaSignature extends U8aFixed {}

  /** @name DidCall (171) */
  interface DidCall extends Enum {
    readonly isCreate: boolean;
    readonly asCreate: {
      readonly details: DidDidDetailsDidCreationDetails;
      readonly signature: DidDidDetailsDidSignature;
    } & Struct;
    readonly isSetAuthenticationKey: boolean;
    readonly asSetAuthenticationKey: {
      readonly newKey: DidDidDetailsDidVerificationKey;
    } & Struct;
    readonly isSetDelegationKey: boolean;
    readonly asSetDelegationKey: {
      readonly newKey: DidDidDetailsDidVerificationKey;
    } & Struct;
    readonly isRemoveDelegationKey: boolean;
    readonly isSetAttestationKey: boolean;
    readonly asSetAttestationKey: {
      readonly newKey: DidDidDetailsDidVerificationKey;
    } & Struct;
    readonly isRemoveAttestationKey: boolean;
    readonly isAddKeyAgreementKey: boolean;
    readonly asAddKeyAgreementKey: {
      readonly newKey: DidDidDetailsDidEncryptionKey;
    } & Struct;
    readonly isRemoveKeyAgreementKey: boolean;
    readonly asRemoveKeyAgreementKey: {
      readonly keyId: H256;
    } & Struct;
    readonly isAddServiceEndpoint: boolean;
    readonly asAddServiceEndpoint: {
      readonly serviceEndpoint: DidServiceEndpointsDidEndpoint;
    } & Struct;
    readonly isRemoveServiceEndpoint: boolean;
    readonly asRemoveServiceEndpoint: {
      readonly serviceId: Bytes;
    } & Struct;
    readonly isDelete: boolean;
    readonly asDelete: {
      readonly endpointsToRemove: u32;
    } & Struct;
    readonly isReclaimDeposit: boolean;
    readonly asReclaimDeposit: {
      readonly didSubject: AccountId32;
      readonly endpointsToRemove: u32;
    } & Struct;
    readonly isSubmitDidCall: boolean;
    readonly asSubmitDidCall: {
      readonly didCall: DidDidDetailsDidAuthorizedCallOperation;
      readonly signature: DidDidDetailsDidSignature;
    } & Struct;
    readonly isTransferDeposit: boolean;
    readonly type: 'Create' | 'SetAuthenticationKey' | 'SetDelegationKey' | 'RemoveDelegationKey' | 'SetAttestationKey' | 'RemoveAttestationKey' | 'AddKeyAgreementKey' | 'RemoveKeyAgreementKey' | 'AddServiceEndpoint' | 'RemoveServiceEndpoint' | 'Delete' | 'ReclaimDeposit' | 'SubmitDidCall' | 'TransferDeposit';
  }

  /** @name DidDidDetailsDidCreationDetails (172) */
  interface DidDidDetailsDidCreationDetails extends Struct {
    readonly did: AccountId32;
    readonly submitter: AccountId32;
    readonly newKeyAgreementKeys: BTreeSet<DidDidDetailsDidEncryptionKey>;
    readonly newAttestationKey: Option<DidDidDetailsDidVerificationKey>;
    readonly newDelegationKey: Option<DidDidDetailsDidVerificationKey>;
    readonly newServiceDetails: Vec<DidServiceEndpointsDidEndpoint>;
  }

  /** @name DidDidDetailsDidEncryptionKey (174) */
  interface DidDidDetailsDidEncryptionKey extends Enum {
    readonly isX25519: boolean;
    readonly asX25519: U8aFixed;
    readonly type: 'X25519';
  }

  /** @name DidDidDetailsDidVerificationKey (178) */
  interface DidDidDetailsDidVerificationKey extends Enum {
    readonly isEd25519: boolean;
    readonly asEd25519: SpCoreEd25519Public;
    readonly isSr25519: boolean;
    readonly asSr25519: SpCoreSr25519Public;
    readonly isEcdsa: boolean;
    readonly asEcdsa: SpCoreEcdsaPublic;
    readonly type: 'Ed25519' | 'Sr25519' | 'Ecdsa';
  }

  /** @name SpCoreSr25519Public (179) */
  interface SpCoreSr25519Public extends U8aFixed {}

  /** @name SpCoreEcdsaPublic (180) */
  interface SpCoreEcdsaPublic extends U8aFixed {}

  /** @name DidServiceEndpointsDidEndpoint (183) */
  interface DidServiceEndpointsDidEndpoint extends Struct {
    readonly id: Bytes;
    readonly serviceTypes: Vec<Bytes>;
    readonly urls: Vec<Bytes>;
  }

  /** @name DidDidDetailsDidAuthorizedCallOperation (191) */
  interface DidDidDetailsDidAuthorizedCallOperation extends Struct {
    readonly did: AccountId32;
    readonly txCounter: u64;
    readonly call: Call;
    readonly blockNumber: u64;
    readonly submitter: AccountId32;
  }

  /** @name PalletDidLookupCall (192) */
  interface PalletDidLookupCall extends Enum {
    readonly isAssociateAccount: boolean;
    readonly asAssociateAccount: {
      readonly req: PalletDidLookupAssociateAccountRequest;
      readonly expiration: u64;
    } & Struct;
    readonly isAssociateSender: boolean;
    readonly isRemoveSenderAssociation: boolean;
    readonly isRemoveAccountAssociation: boolean;
    readonly asRemoveAccountAssociation: {
      readonly account: PalletDidLookupLinkableAccountLinkableAccountId;
    } & Struct;
    readonly isReclaimDeposit: boolean;
    readonly asReclaimDeposit: {
      readonly account: PalletDidLookupLinkableAccountLinkableAccountId;
    } & Struct;
    readonly isTransferDeposit: boolean;
    readonly asTransferDeposit: {
      readonly account: PalletDidLookupLinkableAccountLinkableAccountId;
    } & Struct;
    readonly type: 'AssociateAccount' | 'AssociateSender' | 'RemoveSenderAssociation' | 'RemoveAccountAssociation' | 'ReclaimDeposit' | 'TransferDeposit';
  }

  /** @name PalletDidLookupAssociateAccountRequest (193) */
  interface PalletDidLookupAssociateAccountRequest extends Enum {
    readonly isDotsama: boolean;
    readonly asDotsama: ITuple<[AccountId32, SpRuntimeMultiSignature]>;
    readonly isEthereum: boolean;
    readonly asEthereum: ITuple<[PalletDidLookupAccountAccountId20, PalletDidLookupAccountEthereumSignature]>;
    readonly type: 'Dotsama' | 'Ethereum';
  }

  /** @name SpRuntimeMultiSignature (194) */
  interface SpRuntimeMultiSignature extends Enum {
    readonly isEd25519: boolean;
    readonly asEd25519: SpCoreEd25519Signature;
    readonly isSr25519: boolean;
    readonly asSr25519: SpCoreSr25519Signature;
    readonly isEcdsa: boolean;
    readonly asEcdsa: SpCoreEcdsaSignature;
    readonly type: 'Ed25519' | 'Sr25519' | 'Ecdsa';
  }

  /** @name PalletDidLookupAccountEthereumSignature (195) */
  interface PalletDidLookupAccountEthereumSignature extends SpCoreEcdsaSignature {}

  /** @name PalletSessionCall (196) */
  interface PalletSessionCall extends Enum {
    readonly isSetKeys: boolean;
    readonly asSetKeys: {
      readonly keys_: MashnetNodeRuntimeOpaqueSessionKeys;
      readonly proof: Bytes;
    } & Struct;
    readonly isPurgeKeys: boolean;
    readonly type: 'SetKeys' | 'PurgeKeys';
  }

  /** @name MashnetNodeRuntimeOpaqueSessionKeys (197) */
  interface MashnetNodeRuntimeOpaqueSessionKeys extends Struct {
    readonly aura: SpConsensusAuraEd25519AppEd25519Public;
    readonly grandpa: SpFinalityGrandpaAppPublic;
  }

  /** @name PalletAuthorshipCall (198) */
  interface PalletAuthorshipCall extends Enum {
    readonly isSetUncles: boolean;
    readonly asSetUncles: {
      readonly newUncles: Vec<SpRuntimeHeader>;
    } & Struct;
    readonly type: 'SetUncles';
  }

  /** @name SpRuntimeHeader (200) */
  interface SpRuntimeHeader extends Struct {
    readonly parentHash: H256;
    readonly number: Compact<u64>;
    readonly stateRoot: H256;
    readonly extrinsicsRoot: H256;
    readonly digest: SpRuntimeDigest;
  }

  /** @name SpRuntimeBlakeTwo256 (201) */
  type SpRuntimeBlakeTwo256 = Null;

  /** @name PalletUtilityCall (202) */
  interface PalletUtilityCall extends Enum {
    readonly isBatch: boolean;
    readonly asBatch: {
      readonly calls: Vec<Call>;
    } & Struct;
    readonly isAsDerivative: boolean;
    readonly asAsDerivative: {
      readonly index: u16;
      readonly call: Call;
    } & Struct;
    readonly isBatchAll: boolean;
    readonly asBatchAll: {
      readonly calls: Vec<Call>;
    } & Struct;
    readonly isDispatchAs: boolean;
    readonly asDispatchAs: {
      readonly asOrigin: MashnetNodeRuntimeOriginCaller;
      readonly call: Call;
    } & Struct;
    readonly isForceBatch: boolean;
    readonly asForceBatch: {
      readonly calls: Vec<Call>;
    } & Struct;
    readonly type: 'Batch' | 'AsDerivative' | 'BatchAll' | 'DispatchAs' | 'ForceBatch';
  }

  /** @name MashnetNodeRuntimeOriginCaller (204) */
  interface MashnetNodeRuntimeOriginCaller extends Enum {
    readonly isSystem: boolean;
    readonly asSystem: FrameSupportDispatchRawOrigin;
    readonly isVoid: boolean;
    readonly isDid: boolean;
    readonly asDid: DidOriginDidRawOrigin;
    readonly type: 'System' | 'Void' | 'Did';
  }

  /** @name FrameSupportDispatchRawOrigin (205) */
  interface FrameSupportDispatchRawOrigin extends Enum {
    readonly isRoot: boolean;
    readonly isSigned: boolean;
    readonly asSigned: AccountId32;
    readonly isNone: boolean;
    readonly type: 'Root' | 'Signed' | 'None';
  }

  /** @name DidOriginDidRawOrigin (206) */
  interface DidOriginDidRawOrigin extends Struct {
    readonly id: AccountId32;
    readonly submitter: AccountId32;
  }

  /** @name PalletProxyCall (207) */
  interface PalletProxyCall extends Enum {
    readonly isProxy: boolean;
    readonly asProxy: {
      readonly real: MultiAddress;
      readonly forceProxyType: Option<MashnetNodeRuntimeProxyType>;
      readonly call: Call;
    } & Struct;
    readonly isAddProxy: boolean;
    readonly asAddProxy: {
      readonly delegate: MultiAddress;
      readonly proxyType: MashnetNodeRuntimeProxyType;
      readonly delay: u64;
    } & Struct;
    readonly isRemoveProxy: boolean;
    readonly asRemoveProxy: {
      readonly delegate: MultiAddress;
      readonly proxyType: MashnetNodeRuntimeProxyType;
      readonly delay: u64;
    } & Struct;
    readonly isRemoveProxies: boolean;
    readonly isAnonymous: boolean;
    readonly asAnonymous: {
      readonly proxyType: MashnetNodeRuntimeProxyType;
      readonly delay: u64;
      readonly index: u16;
    } & Struct;
    readonly isKillAnonymous: boolean;
    readonly asKillAnonymous: {
      readonly spawner: MultiAddress;
      readonly proxyType: MashnetNodeRuntimeProxyType;
      readonly index: u16;
      readonly height: Compact<u64>;
      readonly extIndex: Compact<u32>;
    } & Struct;
    readonly isAnnounce: boolean;
    readonly asAnnounce: {
      readonly real: MultiAddress;
      readonly callHash: H256;
    } & Struct;
    readonly isRemoveAnnouncement: boolean;
    readonly asRemoveAnnouncement: {
      readonly real: MultiAddress;
      readonly callHash: H256;
    } & Struct;
    readonly isRejectAnnouncement: boolean;
    readonly asRejectAnnouncement: {
      readonly delegate: MultiAddress;
      readonly callHash: H256;
    } & Struct;
    readonly isProxyAnnounced: boolean;
    readonly asProxyAnnounced: {
      readonly delegate: MultiAddress;
      readonly real: MultiAddress;
      readonly forceProxyType: Option<MashnetNodeRuntimeProxyType>;
      readonly call: Call;
    } & Struct;
    readonly type: 'Proxy' | 'AddProxy' | 'RemoveProxy' | 'RemoveProxies' | 'Anonymous' | 'KillAnonymous' | 'Announce' | 'RemoveAnnouncement' | 'RejectAnnouncement' | 'ProxyAnnounced';
  }

  /** @name PalletWeb3NamesCall (209) */
  interface PalletWeb3NamesCall extends Enum {
    readonly isClaim: boolean;
    readonly asClaim: {
      readonly name: Bytes;
    } & Struct;
    readonly isReleaseByOwner: boolean;
    readonly isReclaimDeposit: boolean;
    readonly asReclaimDeposit: {
      readonly name: Bytes;
    } & Struct;
    readonly isBan: boolean;
    readonly asBan: {
      readonly name: Bytes;
    } & Struct;
    readonly isUnban: boolean;
    readonly asUnban: {
      readonly name: Bytes;
    } & Struct;
    readonly isTransferDeposit: boolean;
    readonly type: 'Claim' | 'ReleaseByOwner' | 'ReclaimDeposit' | 'Ban' | 'Unban' | 'TransferDeposit';
  }

  /** @name PublicCredentialsCall (210) */
  interface PublicCredentialsCall extends Enum {
    readonly isAdd: boolean;
    readonly asAdd: {
      readonly credential: PublicCredentialsCredentialsCredential;
    } & Struct;
    readonly isRevoke: boolean;
    readonly asRevoke: {
      readonly credentialId: H256;
      readonly authorization: Option<RuntimeCommonAuthorizationPalletAuthorize>;
    } & Struct;
    readonly isUnrevoke: boolean;
    readonly asUnrevoke: {
      readonly credentialId: H256;
      readonly authorization: Option<RuntimeCommonAuthorizationPalletAuthorize>;
    } & Struct;
    readonly isRemove: boolean;
    readonly asRemove: {
      readonly credentialId: H256;
      readonly authorization: Option<RuntimeCommonAuthorizationPalletAuthorize>;
    } & Struct;
    readonly isReclaimDeposit: boolean;
    readonly asReclaimDeposit: {
      readonly credentialId: H256;
    } & Struct;
    readonly type: 'Add' | 'Revoke' | 'Unrevoke' | 'Remove' | 'ReclaimDeposit';
  }

  /** @name PublicCredentialsCredentialsCredential (211) */
  interface PublicCredentialsCredentialsCredential extends Struct {
    readonly ctypeHash: H256;
    readonly subject: Bytes;
    readonly claims: Bytes;
    readonly authorization: Option<RuntimeCommonAuthorizationPalletAuthorize>;
  }

  /** @name PalletSudoError (214) */
  interface PalletSudoError extends Enum {
    readonly isRequireSudo: boolean;
    readonly type: 'RequireSudo';
  }

  /** @name CtypeError (215) */
  interface CtypeError extends Enum {
    readonly isCTypeNotFound: boolean;
    readonly isCTypeAlreadyExists: boolean;
    readonly isUnableToPayFees: boolean;
    readonly type: 'CTypeNotFound' | 'CTypeAlreadyExists' | 'UnableToPayFees';
  }

  /** @name AttestationAttestationsAttestationDetails (216) */
  interface AttestationAttestationsAttestationDetails extends Struct {
    readonly ctypeHash: H256;
    readonly attester: AccountId32;
    readonly authorizationId: Option<RuntimeCommonAuthorizationAuthorizationId>;
    readonly revoked: bool;
    readonly deposit: KiltSupportDeposit;
  }

  /** @name KiltSupportDeposit (217) */
  interface KiltSupportDeposit extends Struct {
    readonly owner: AccountId32;
    readonly amount: u128;
  }

  /** @name AttestationError (219) */
  interface AttestationError extends Enum {
    readonly isAlreadyAttested: boolean;
    readonly isAlreadyRevoked: boolean;
    readonly isAttestationNotFound: boolean;
    readonly isCTypeMismatch: boolean;
    readonly isUnauthorized: boolean;
    readonly isMaxDelegatedAttestationsExceeded: boolean;
    readonly type: 'AlreadyAttested' | 'AlreadyRevoked' | 'AttestationNotFound' | 'CTypeMismatch' | 'Unauthorized' | 'MaxDelegatedAttestationsExceeded';
  }

  /** @name DelegationDelegationHierarchyDelegationNode (220) */
  interface DelegationDelegationHierarchyDelegationNode extends Struct {
    readonly hierarchyRootId: H256;
    readonly parent: Option<H256>;
    readonly children: BTreeSet<H256>;
    readonly details: DelegationDelegationHierarchyDelegationDetails;
    readonly deposit: KiltSupportDeposit;
  }

  /** @name DelegationDelegationHierarchyDelegationDetails (224) */
  interface DelegationDelegationHierarchyDelegationDetails extends Struct {
    readonly owner: AccountId32;
    readonly revoked: bool;
    readonly permissions: DelegationDelegationHierarchyPermissions;
  }

  /** @name DelegationDelegationHierarchyDelegationHierarchyDetails (225) */
  interface DelegationDelegationHierarchyDelegationHierarchyDetails extends Struct {
    readonly ctypeHash: H256;
  }

  /** @name DelegationError (226) */
  interface DelegationError extends Enum {
    readonly isDelegationAlreadyExists: boolean;
    readonly isInvalidDelegateSignature: boolean;
    readonly isDelegationNotFound: boolean;
    readonly isDelegateNotFound: boolean;
    readonly isHierarchyAlreadyExists: boolean;
    readonly isHierarchyNotFound: boolean;
    readonly isMaxSearchDepthReached: boolean;
    readonly isNotOwnerOfParentDelegation: boolean;
    readonly isNotOwnerOfDelegationHierarchy: boolean;
    readonly isParentDelegationNotFound: boolean;
    readonly isParentDelegationRevoked: boolean;
    readonly isUnauthorizedRevocation: boolean;
    readonly isUnauthorizedRemoval: boolean;
    readonly isUnauthorizedDelegation: boolean;
    readonly isAccessDenied: boolean;
    readonly isExceededRevocationBounds: boolean;
    readonly isExceededRemovalBounds: boolean;
    readonly isMaxRevocationsTooLarge: boolean;
    readonly isMaxRemovalsTooLarge: boolean;
    readonly isMaxParentChecksTooLarge: boolean;
    readonly isInternalError: boolean;
    readonly isMaxChildrenExceeded: boolean;
    readonly type: 'DelegationAlreadyExists' | 'InvalidDelegateSignature' | 'DelegationNotFound' | 'DelegateNotFound' | 'HierarchyAlreadyExists' | 'HierarchyNotFound' | 'MaxSearchDepthReached' | 'NotOwnerOfParentDelegation' | 'NotOwnerOfDelegationHierarchy' | 'ParentDelegationNotFound' | 'ParentDelegationRevoked' | 'UnauthorizedRevocation' | 'UnauthorizedRemoval' | 'UnauthorizedDelegation' | 'AccessDenied' | 'ExceededRevocationBounds' | 'ExceededRemovalBounds' | 'MaxRevocationsTooLarge' | 'MaxRemovalsTooLarge' | 'MaxParentChecksTooLarge' | 'InternalError' | 'MaxChildrenExceeded';
  }

  /** @name DidDidDetails (227) */
  interface DidDidDetails extends Struct {
    readonly authenticationKey: H256;
    readonly keyAgreementKeys: BTreeSet<H256>;
    readonly delegationKey: Option<H256>;
    readonly attestationKey: Option<H256>;
    readonly publicKeys: BTreeMap<H256, DidDidDetailsDidPublicKeyDetails>;
    readonly lastTxCounter: u64;
    readonly deposit: KiltSupportDeposit;
  }

  /** @name DidDidDetailsDidPublicKeyDetails (230) */
  interface DidDidDetailsDidPublicKeyDetails extends Struct {
    readonly key: DidDidDetailsDidPublicKey;
    readonly blockNumber: u64;
  }

  /** @name DidDidDetailsDidPublicKey (231) */
  interface DidDidDetailsDidPublicKey extends Enum {
    readonly isPublicVerificationKey: boolean;
    readonly asPublicVerificationKey: DidDidDetailsDidVerificationKey;
    readonly isPublicEncryptionKey: boolean;
    readonly asPublicEncryptionKey: DidDidDetailsDidEncryptionKey;
    readonly type: 'PublicVerificationKey' | 'PublicEncryptionKey';
  }

  /** @name DidError (236) */
  interface DidError extends Enum {
    readonly isInvalidSignatureFormat: boolean;
    readonly isInvalidSignature: boolean;
    readonly isDidAlreadyPresent: boolean;
    readonly isDidNotPresent: boolean;
    readonly isVerificationKeyNotPresent: boolean;
    readonly isInvalidNonce: boolean;
    readonly isUnsupportedDidAuthorizationCall: boolean;
    readonly isInvalidDidAuthorizationCall: boolean;
    readonly isMaxKeyAgreementKeysLimitExceeded: boolean;
    readonly isMaxPublicKeysPerDidExceeded: boolean;
    readonly isMaxTotalKeyAgreementKeysExceeded: boolean;
    readonly isBadDidOrigin: boolean;
    readonly isTransactionExpired: boolean;
    readonly isDidAlreadyDeleted: boolean;
    readonly isNotOwnerOfDeposit: boolean;
    readonly isUnableToPayFees: boolean;
    readonly isMaxNumberOfServicesPerDidExceeded: boolean;
    readonly isMaxServiceIdLengthExceeded: boolean;
    readonly isMaxServiceTypeLengthExceeded: boolean;
    readonly isMaxNumberOfTypesPerServiceExceeded: boolean;
    readonly isMaxServiceUrlLengthExceeded: boolean;
    readonly isMaxNumberOfUrlsPerServiceExceeded: boolean;
    readonly isServiceAlreadyPresent: boolean;
    readonly isServiceNotPresent: boolean;
    readonly isInvalidServiceEncoding: boolean;
    readonly isStoredEndpointsCountTooLarge: boolean;
    readonly isInternalError: boolean;
    readonly type: 'InvalidSignatureFormat' | 'InvalidSignature' | 'DidAlreadyPresent' | 'DidNotPresent' | 'VerificationKeyNotPresent' | 'InvalidNonce' | 'UnsupportedDidAuthorizationCall' | 'InvalidDidAuthorizationCall' | 'MaxKeyAgreementKeysLimitExceeded' | 'MaxPublicKeysPerDidExceeded' | 'MaxTotalKeyAgreementKeysExceeded' | 'BadDidOrigin' | 'TransactionExpired' | 'DidAlreadyDeleted' | 'NotOwnerOfDeposit' | 'UnableToPayFees' | 'MaxNumberOfServicesPerDidExceeded' | 'MaxServiceIdLengthExceeded' | 'MaxServiceTypeLengthExceeded' | 'MaxNumberOfTypesPerServiceExceeded' | 'MaxServiceUrlLengthExceeded' | 'MaxNumberOfUrlsPerServiceExceeded' | 'ServiceAlreadyPresent' | 'ServiceNotPresent' | 'InvalidServiceEncoding' | 'StoredEndpointsCountTooLarge' | 'InternalError';
  }

  /** @name PalletDidLookupConnectionRecord (237) */
  interface PalletDidLookupConnectionRecord extends Struct {
    readonly did: AccountId32;
    readonly deposit: KiltSupportDeposit;
  }

  /** @name PalletDidLookupError (239) */
  interface PalletDidLookupError extends Enum {
    readonly isAssociationNotFound: boolean;
    readonly isNotAuthorized: boolean;
    readonly isOutdatedProof: boolean;
    readonly isInsufficientFunds: boolean;
    readonly type: 'AssociationNotFound' | 'NotAuthorized' | 'OutdatedProof' | 'InsufficientFunds';
  }

  /** @name SpCoreCryptoKeyTypeId (245) */
  interface SpCoreCryptoKeyTypeId extends U8aFixed {}

  /** @name PalletSessionError (246) */
  interface PalletSessionError extends Enum {
    readonly isInvalidProof: boolean;
    readonly isNoAssociatedValidatorId: boolean;
    readonly isDuplicatedKey: boolean;
    readonly isNoKeys: boolean;
    readonly isNoAccount: boolean;
    readonly type: 'InvalidProof' | 'NoAssociatedValidatorId' | 'DuplicatedKey' | 'NoKeys' | 'NoAccount';
  }

  /** @name PalletAuthorshipUncleEntryItem (248) */
  interface PalletAuthorshipUncleEntryItem extends Enum {
    readonly isInclusionHeight: boolean;
    readonly asInclusionHeight: u64;
    readonly isUncle: boolean;
    readonly asUncle: ITuple<[H256, Option<AccountId32>]>;
    readonly type: 'InclusionHeight' | 'Uncle';
  }

  /** @name PalletAuthorshipError (250) */
  interface PalletAuthorshipError extends Enum {
    readonly isInvalidUncleParent: boolean;
    readonly isUnclesAlreadySet: boolean;
    readonly isTooManyUncles: boolean;
    readonly isGenesisUncle: boolean;
    readonly isTooHighUncle: boolean;
    readonly isUncleAlreadyIncluded: boolean;
    readonly isOldUncle: boolean;
    readonly type: 'InvalidUncleParent' | 'UnclesAlreadySet' | 'TooManyUncles' | 'GenesisUncle' | 'TooHighUncle' | 'UncleAlreadyIncluded' | 'OldUncle';
  }

  /** @name PalletUtilityError (251) */
  interface PalletUtilityError extends Enum {
    readonly isTooManyCalls: boolean;
    readonly type: 'TooManyCalls';
  }

  /** @name PalletProxyProxyDefinition (254) */
  interface PalletProxyProxyDefinition extends Struct {
    readonly delegate: AccountId32;
    readonly proxyType: MashnetNodeRuntimeProxyType;
    readonly delay: u64;
  }

  /** @name PalletProxyAnnouncement (258) */
  interface PalletProxyAnnouncement extends Struct {
    readonly real: AccountId32;
    readonly callHash: H256;
    readonly height: u64;
  }

  /** @name PalletProxyError (260) */
  interface PalletProxyError extends Enum {
    readonly isTooMany: boolean;
    readonly isNotFound: boolean;
    readonly isNotProxy: boolean;
    readonly isUnproxyable: boolean;
    readonly isDuplicate: boolean;
    readonly isNoPermission: boolean;
    readonly isUnannounced: boolean;
    readonly isNoSelfProxy: boolean;
    readonly type: 'TooMany' | 'NotFound' | 'NotProxy' | 'Unproxyable' | 'Duplicate' | 'NoPermission' | 'Unannounced' | 'NoSelfProxy';
  }

  /** @name PalletWeb3NamesWeb3NameWeb3NameOwnership (261) */
  interface PalletWeb3NamesWeb3NameWeb3NameOwnership extends Struct {
    readonly owner: AccountId32;
    readonly claimedAt: u64;
    readonly deposit: KiltSupportDeposit;
  }

  /** @name PalletWeb3NamesError (262) */
  interface PalletWeb3NamesError extends Enum {
    readonly isInsufficientFunds: boolean;
    readonly isWeb3NameAlreadyClaimed: boolean;
    readonly isWeb3NameNotFound: boolean;
    readonly isOwnerAlreadyExists: boolean;
    readonly isOwnerNotFound: boolean;
    readonly isWeb3NameBanned: boolean;
    readonly isWeb3NameNotBanned: boolean;
    readonly isWeb3NameAlreadyBanned: boolean;
    readonly isNotAuthorized: boolean;
    readonly isWeb3NameTooShort: boolean;
    readonly isWeb3NameTooLong: boolean;
    readonly isInvalidWeb3NameCharacter: boolean;
    readonly type: 'InsufficientFunds' | 'Web3NameAlreadyClaimed' | 'Web3NameNotFound' | 'OwnerAlreadyExists' | 'OwnerNotFound' | 'Web3NameBanned' | 'Web3NameNotBanned' | 'Web3NameAlreadyBanned' | 'NotAuthorized' | 'Web3NameTooShort' | 'Web3NameTooLong' | 'InvalidWeb3NameCharacter';
  }

  /** @name PublicCredentialsCredentialsCredentialEntry (264) */
  interface PublicCredentialsCredentialsCredentialEntry extends Struct {
    readonly ctypeHash: H256;
    readonly attester: AccountId32;
    readonly revoked: bool;
    readonly blockNumber: u64;
    readonly deposit: KiltSupportDeposit;
    readonly authorizationId: Option<RuntimeCommonAuthorizationAuthorizationId>;
  }

  /** @name PublicCredentialsError (265) */
  interface PublicCredentialsError extends Enum {
    readonly isCredentialAlreadyIssued: boolean;
    readonly isCredentialNotFound: boolean;
    readonly isUnableToPayFees: boolean;
    readonly isInvalidInput: boolean;
    readonly isUnauthorized: boolean;
    readonly isInternalError: boolean;
    readonly type: 'CredentialAlreadyIssued' | 'CredentialNotFound' | 'UnableToPayFees' | 'InvalidInput' | 'Unauthorized' | 'InternalError';
  }

  /** @name FrameSystemExtensionsCheckNonZeroSender (268) */
  type FrameSystemExtensionsCheckNonZeroSender = Null;

  /** @name FrameSystemExtensionsCheckSpecVersion (269) */
  type FrameSystemExtensionsCheckSpecVersion = Null;

  /** @name FrameSystemExtensionsCheckTxVersion (270) */
  type FrameSystemExtensionsCheckTxVersion = Null;

  /** @name FrameSystemExtensionsCheckGenesis (271) */
  type FrameSystemExtensionsCheckGenesis = Null;

  /** @name FrameSystemExtensionsCheckNonce (274) */
  interface FrameSystemExtensionsCheckNonce extends Compact<u64> {}

  /** @name FrameSystemExtensionsCheckWeight (275) */
  type FrameSystemExtensionsCheckWeight = Null;

  /** @name PalletTransactionPaymentChargeTransactionPayment (276) */
  interface PalletTransactionPaymentChargeTransactionPayment extends Compact<u128> {}

} // declare module
