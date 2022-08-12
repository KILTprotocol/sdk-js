// Auto-generated via `yarn polkadot-types-from-chain`, do not edit
/* eslint-disable */

// import type lookup before we augment - in some environments
// this is required to allow for ambient/previous definitions
import '@polkadot/api-base/types/storage';

import type { ApiTypes, AugmentedQuery, QueryableStorageEntry } from '@polkadot/api-base/types';
import type { Bytes, Null, Option, Vec, bool, u128, u32, u64 } from '@polkadot/types-codec';
import type { AnyNumber, ITuple } from '@polkadot/types-codec/types';
import type { AccountId32, H256 } from '@polkadot/types/interfaces/runtime';
import type { AttestationAttestationsAttestationDetails, DelegationDelegationHierarchyDelegationHierarchyDetails, DelegationDelegationHierarchyDelegationNode, DidDidDetails, DidServiceEndpointsDidEndpoint, FrameSupportWeightsPerDispatchClassU64, FrameSystemAccountInfo, FrameSystemEventRecord, FrameSystemLastRuntimeUpgradeInfo, FrameSystemPhase, KiltAssetDidsV1AssetDid, MashnetNodeRuntimeOpaqueSessionKeys, PalletAuthorshipUncleEntryItem, PalletBalancesAccountData, PalletBalancesBalanceLock, PalletBalancesReleases, PalletBalancesReserveData, PalletDidLookupConnectionRecord, PalletDidLookupLinkableAccountLinkableAccountId, PalletGrandpaStoredPendingChange, PalletGrandpaStoredState, PalletProxyAnnouncement, PalletProxyProxyDefinition, PalletTransactionPaymentReleases, PalletWeb3NamesWeb3NameWeb3NameOwnership, PublicCredentialsCredentialsCredentialEntry, RuntimeCommonAssetsAssetDid, RuntimeCommonAuthorizationAuthorizationId, SpConsensusAuraEd25519AppEd25519Public, SpCoreCryptoKeyTypeId, SpRuntimeDigest } from '@polkadot/types/lookup';
import type { Observable } from '@polkadot/types/types';

export type __AugmentedQuery<ApiType extends ApiTypes> = AugmentedQuery<ApiType, () => unknown>;
export type __QueryableStorageEntry<ApiType extends ApiTypes> = QueryableStorageEntry<ApiType>;

declare module '@polkadot/api-base/types/storage' {
  interface AugmentedQueries<ApiType extends ApiTypes> {
    attestation: {
      /**
       * Attestations stored on chain.
       * 
       * It maps from a claim hash to the full attestation.
       **/
      attestations: AugmentedQuery<ApiType, (arg: H256 | string | Uint8Array) => Observable<Option<AttestationAttestationsAttestationDetails>>, [H256]>;
      /**
       * Delegated attestations stored on chain.
       * 
       * It maps from a delegation ID to a vector of claim hashes.
       **/
      externalAttestations: AugmentedQuery<ApiType, (arg1: RuntimeCommonAuthorizationAuthorizationId | { Delegation: any } | string | Uint8Array, arg2: H256 | string | Uint8Array) => Observable<bool>, [RuntimeCommonAuthorizationAuthorizationId, H256]>;
    };
    aura: {
      /**
       * The current authority set.
       **/
      authorities: AugmentedQuery<ApiType, () => Observable<Vec<SpConsensusAuraEd25519AppEd25519Public>>, []>;
      /**
       * The current slot of this block.
       * 
       * This will be set in `on_initialize`.
       **/
      currentSlot: AugmentedQuery<ApiType, () => Observable<u64>, []>;
    };
    authorship: {
      /**
       * Author of current block.
       **/
      author: AugmentedQuery<ApiType, () => Observable<Option<AccountId32>>, []>;
      /**
       * Whether uncles were already set in this block.
       **/
      didSetUncles: AugmentedQuery<ApiType, () => Observable<bool>, []>;
      /**
       * Uncles
       **/
      uncles: AugmentedQuery<ApiType, () => Observable<Vec<PalletAuthorshipUncleEntryItem>>, []>;
    };
    balances: {
      /**
       * The Balances pallet example of storing the balance of an account.
       * 
       * # Example
       * 
       * ```nocompile
       * impl pallet_balances::Config for Runtime {
       * type AccountStore = StorageMapShim<Self::Account<Runtime>, frame_system::Provider<Runtime>, AccountId, Self::AccountData<Balance>>
       * }
       * ```
       * 
       * You can also store the balance of an account in the `System` pallet.
       * 
       * # Example
       * 
       * ```nocompile
       * impl pallet_balances::Config for Runtime {
       * type AccountStore = System
       * }
       * ```
       * 
       * But this comes with tradeoffs, storing account balances in the system pallet stores
       * `frame_system` data alongside the account data contrary to storing account balances in the
       * `Balances` pallet, which uses a `StorageMap` to store balances data only.
       * NOTE: This is only used in the case that this pallet is used to store balances.
       **/
      account: AugmentedQuery<ApiType, (arg: AccountId32 | string | Uint8Array) => Observable<PalletBalancesAccountData>, [AccountId32]>;
      /**
       * Any liquidity locks on some account balances.
       * NOTE: Should only be accessed when setting, changing and freeing a lock.
       **/
      locks: AugmentedQuery<ApiType, (arg: AccountId32 | string | Uint8Array) => Observable<Vec<PalletBalancesBalanceLock>>, [AccountId32]>;
      /**
       * Named reserves on some account balances.
       **/
      reserves: AugmentedQuery<ApiType, (arg: AccountId32 | string | Uint8Array) => Observable<Vec<PalletBalancesReserveData>>, [AccountId32]>;
      /**
       * Storage version of the pallet.
       * 
       * This is set to v2.0.0 for new networks.
       **/
      storageVersion: AugmentedQuery<ApiType, () => Observable<PalletBalancesReleases>, []>;
      /**
       * The total units issued in the system.
       **/
      totalIssuance: AugmentedQuery<ApiType, () => Observable<u128>, []>;
    };
    ctype: {
      /**
       * CTypes stored on chain.
       * 
       * It maps from a CType hash to its creator.
       **/
      ctypes: AugmentedQuery<ApiType, (arg: H256 | string | Uint8Array) => Observable<Option<AccountId32>>, [H256]>;
    };
    delegation: {
      /**
       * Delegation hierarchies stored on chain.
       * 
       * It maps for a (root) node ID to the hierarchy details.
       **/
      delegationHierarchies: AugmentedQuery<ApiType, (arg: H256 | string | Uint8Array) => Observable<Option<DelegationDelegationHierarchyDelegationHierarchyDetails>>, [H256]>;
      /**
       * Delegation nodes stored on chain.
       * 
       * It maps from a node ID to the node details.
       **/
      delegationNodes: AugmentedQuery<ApiType, (arg: H256 | string | Uint8Array) => Observable<Option<DelegationDelegationHierarchyDelegationNode>>, [H256]>;
    };
    did: {
      /**
       * DIDs stored on chain.
       * 
       * It maps from a DID identifier to the DID details.
       **/
      did: AugmentedQuery<ApiType, (arg: AccountId32 | string | Uint8Array) => Observable<Option<DidDidDetails>>, [AccountId32]>;
      /**
       * The set of DIDs that have been deleted and cannot therefore be created
       * again for security reasons.
       * 
       * It maps from a DID identifier to a unit tuple, for the sake of tracking
       * DID identifiers.
       **/
      didBlacklist: AugmentedQuery<ApiType, (arg: AccountId32 | string | Uint8Array) => Observable<Option<Null>>, [AccountId32]>;
      /**
       * Counter of service endpoints for each DID.
       * 
       * It maps from (DID identifier) to a 32-bit counter.
       **/
      didEndpointsCount: AugmentedQuery<ApiType, (arg: AccountId32 | string | Uint8Array) => Observable<u32>, [AccountId32]>;
      /**
       * Service endpoints associated with DIDs.
       * 
       * It maps from (DID identifier, service ID) to the service details.
       **/
      serviceEndpoints: AugmentedQuery<ApiType, (arg1: AccountId32 | string | Uint8Array, arg2: Bytes | string | Uint8Array) => Observable<Option<DidServiceEndpointsDidEndpoint>>, [AccountId32, Bytes]>;
    };
    didLookup: {
      /**
       * Mapping from (DID + account identifier) -> ().
       * The empty tuple is used as a sentinel value to simply indicate the
       * presence of a given tuple in the map.
       **/
      connectedAccounts: AugmentedQuery<ApiType, (arg1: AccountId32 | string | Uint8Array, arg2: PalletDidLookupLinkableAccountLinkableAccountId | { AccountId20: any } | { AccountId32: any } | string | Uint8Array) => Observable<Option<Null>>, [AccountId32, PalletDidLookupLinkableAccountLinkableAccountId]>;
      /**
       * Mapping from account identifiers to DIDs.
       **/
      connectedDids: AugmentedQuery<ApiType, (arg: PalletDidLookupLinkableAccountLinkableAccountId | { AccountId20: any } | { AccountId32: any } | string | Uint8Array) => Observable<Option<PalletDidLookupConnectionRecord>>, [PalletDidLookupLinkableAccountLinkableAccountId]>;
    };
    grandpa: {
      /**
       * The number of changes (both in terms of keys and underlying economic responsibilities)
       * in the "set" of Grandpa validators from genesis.
       **/
      currentSetId: AugmentedQuery<ApiType, () => Observable<u64>, []>;
      /**
       * next block number where we can force a change.
       **/
      nextForced: AugmentedQuery<ApiType, () => Observable<Option<u64>>, []>;
      /**
       * Pending change: (signaled at, scheduled change).
       **/
      pendingChange: AugmentedQuery<ApiType, () => Observable<Option<PalletGrandpaStoredPendingChange>>, []>;
      /**
       * A mapping from grandpa set ID to the index of the *most recent* session for which its
       * members were responsible.
       * 
       * TWOX-NOTE: `SetId` is not under user control.
       **/
      setIdSession: AugmentedQuery<ApiType, (arg: u64 | AnyNumber | Uint8Array) => Observable<Option<u32>>, [u64]>;
      /**
       * `true` if we are currently stalled.
       **/
      stalled: AugmentedQuery<ApiType, () => Observable<Option<ITuple<[u64, u64]>>>, []>;
      /**
       * State of the current authority set.
       **/
      state: AugmentedQuery<ApiType, () => Observable<PalletGrandpaStoredState>, []>;
    };
    indices: {
      /**
       * The lookup from index to account.
       **/
      accounts: AugmentedQuery<ApiType, (arg: u64 | AnyNumber | Uint8Array) => Observable<Option<ITuple<[AccountId32, u128, bool]>>>, [u64]>;
    };
    proxy: {
      /**
       * The announcements made by the proxy (key).
       **/
      announcements: AugmentedQuery<ApiType, (arg: AccountId32 | string | Uint8Array) => Observable<ITuple<[Vec<PalletProxyAnnouncement>, u128]>>, [AccountId32]>;
      /**
       * The set of account proxies. Maps the account which has delegated to the accounts
       * which are being delegated to, together with the amount held on deposit.
       **/
      proxies: AugmentedQuery<ApiType, (arg: AccountId32 | string | Uint8Array) => Observable<ITuple<[Vec<PalletProxyProxyDefinition>, u128]>>, [AccountId32]>;
    };
    publicCredentials: {
      /**
       * The map of public credentials already attested.
       * It maps from a (subject id + credential id) -> the creation
       * details of the credential.
       **/
      credentials: AugmentedQuery<ApiType, (arg1: RuntimeCommonAssetsAssetDid | { chainId?: any; assetId?: any } | string | Uint8Array, arg2: H256 | string | Uint8Array) => Observable<Option<PublicCredentialsCredentialsCredentialEntry>>, [RuntimeCommonAssetsAssetDid, H256]>;
      /**
       * A reverse index mapping from credential ID to the subject the credential
       * was issued to.
       * 
       * It it used to perform efficient lookup of credentials given their ID.
       **/
      credentialSubjects: AugmentedQuery<ApiType, (arg: H256 | string | Uint8Array) => Observable<Option<KiltAssetDidsV1AssetDid>>, [H256]>;
    };
    randomnessCollectiveFlip: {
      /**
       * Series of block headers from the last 81 blocks that acts as random seed material. This
       * is arranged as a ring buffer with `block_number % 81` being the index into the `Vec` of
       * the oldest hash.
       **/
      randomMaterial: AugmentedQuery<ApiType, () => Observable<Vec<H256>>, []>;
    };
    session: {
      /**
       * Current index of the session.
       **/
      currentIndex: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * Indices of disabled validators.
       * 
       * The vec is always kept sorted so that we can find whether a given validator is
       * disabled using binary search. It gets cleared when `on_session_ending` returns
       * a new set of identities.
       **/
      disabledValidators: AugmentedQuery<ApiType, () => Observable<Vec<u32>>, []>;
      /**
       * The owner of a key. The key is the `KeyTypeId` + the encoded key.
       **/
      keyOwner: AugmentedQuery<ApiType, (arg: ITuple<[SpCoreCryptoKeyTypeId, Bytes]> | [SpCoreCryptoKeyTypeId | string | Uint8Array, Bytes | string | Uint8Array]) => Observable<Option<AccountId32>>, [ITuple<[SpCoreCryptoKeyTypeId, Bytes]>]>;
      /**
       * The next session keys for a validator.
       **/
      nextKeys: AugmentedQuery<ApiType, (arg: AccountId32 | string | Uint8Array) => Observable<Option<MashnetNodeRuntimeOpaqueSessionKeys>>, [AccountId32]>;
      /**
       * True if the underlying economic identities or weighting behind the validators
       * has changed in the queued validator set.
       **/
      queuedChanged: AugmentedQuery<ApiType, () => Observable<bool>, []>;
      /**
       * The queued keys for the next session. When the next session begins, these keys
       * will be used to determine the validator's session keys.
       **/
      queuedKeys: AugmentedQuery<ApiType, () => Observable<Vec<ITuple<[AccountId32, MashnetNodeRuntimeOpaqueSessionKeys]>>>, []>;
      /**
       * The current set of validators.
       **/
      validators: AugmentedQuery<ApiType, () => Observable<Vec<AccountId32>>, []>;
    };
    sudo: {
      /**
       * The `AccountId` of the sudo key.
       **/
      key: AugmentedQuery<ApiType, () => Observable<Option<AccountId32>>, []>;
    };
    system: {
      /**
       * The full account information for a particular account ID.
       **/
      account: AugmentedQuery<ApiType, (arg: AccountId32 | string | Uint8Array) => Observable<FrameSystemAccountInfo>, [AccountId32]>;
      /**
       * Total length (in bytes) for all extrinsics put together, for the current block.
       **/
      allExtrinsicsLen: AugmentedQuery<ApiType, () => Observable<Option<u32>>, []>;
      /**
       * Map of block numbers to block hashes.
       **/
      blockHash: AugmentedQuery<ApiType, (arg: u64 | AnyNumber | Uint8Array) => Observable<H256>, [u64]>;
      /**
       * The current weight for the block.
       **/
      blockWeight: AugmentedQuery<ApiType, () => Observable<FrameSupportWeightsPerDispatchClassU64>, []>;
      /**
       * Digest of the current block, also part of the block header.
       **/
      digest: AugmentedQuery<ApiType, () => Observable<SpRuntimeDigest>, []>;
      /**
       * The number of events in the `Events<T>` list.
       **/
      eventCount: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * Events deposited for the current block.
       * 
       * NOTE: The item is unbound and should therefore never be read on chain.
       * It could otherwise inflate the PoV size of a block.
       * 
       * Events have a large in-memory size. Box the events to not go out-of-memory
       * just in case someone still reads them from within the runtime.
       **/
      events: AugmentedQuery<ApiType, () => Observable<Vec<FrameSystemEventRecord>>, []>;
      /**
       * Mapping between a topic (represented by T::Hash) and a vector of indexes
       * of events in the `<Events<T>>` list.
       * 
       * All topic vectors have deterministic storage locations depending on the topic. This
       * allows light-clients to leverage the changes trie storage tracking mechanism and
       * in case of changes fetch the list of events of interest.
       * 
       * The value has the type `(T::BlockNumber, EventIndex)` because if we used only just
       * the `EventIndex` then in case if the topic has the same contents on the next block
       * no notification will be triggered thus the event might be lost.
       **/
      eventTopics: AugmentedQuery<ApiType, (arg: H256 | string | Uint8Array) => Observable<Vec<ITuple<[u64, u32]>>>, [H256]>;
      /**
       * The execution phase of the block.
       **/
      executionPhase: AugmentedQuery<ApiType, () => Observable<Option<FrameSystemPhase>>, []>;
      /**
       * Total extrinsics count for the current block.
       **/
      extrinsicCount: AugmentedQuery<ApiType, () => Observable<Option<u32>>, []>;
      /**
       * Extrinsics data for the current block (maps an extrinsic's index to its data).
       **/
      extrinsicData: AugmentedQuery<ApiType, (arg: u32 | AnyNumber | Uint8Array) => Observable<Bytes>, [u32]>;
      /**
       * Stores the `spec_version` and `spec_name` of when the last runtime upgrade happened.
       **/
      lastRuntimeUpgrade: AugmentedQuery<ApiType, () => Observable<Option<FrameSystemLastRuntimeUpgradeInfo>>, []>;
      /**
       * The current block number being processed. Set by `execute_block`.
       **/
      number: AugmentedQuery<ApiType, () => Observable<u64>, []>;
      /**
       * Hash of the previous block.
       **/
      parentHash: AugmentedQuery<ApiType, () => Observable<H256>, []>;
      /**
       * True if we have upgraded so that AccountInfo contains three types of `RefCount`. False
       * (default) if not.
       **/
      upgradedToTripleRefCount: AugmentedQuery<ApiType, () => Observable<bool>, []>;
      /**
       * True if we have upgraded so that `type RefCount` is `u32`. False (default) if not.
       **/
      upgradedToU32RefCount: AugmentedQuery<ApiType, () => Observable<bool>, []>;
    };
    timestamp: {
      /**
       * Did the timestamp get updated in this block?
       **/
      didUpdate: AugmentedQuery<ApiType, () => Observable<bool>, []>;
      /**
       * Current time for the current block.
       **/
      now: AugmentedQuery<ApiType, () => Observable<u64>, []>;
    };
    transactionPayment: {
      nextFeeMultiplier: AugmentedQuery<ApiType, () => Observable<u128>, []>;
      storageVersion: AugmentedQuery<ApiType, () => Observable<PalletTransactionPaymentReleases>, []>;
    };
    web3Names: {
      /**
       * Map of name -> ().
       * 
       * If a name key is present, the name is currently banned.
       **/
      banned: AugmentedQuery<ApiType, (arg: Bytes | string | Uint8Array) => Observable<Option<Null>>, [Bytes]>;
      /**
       * Map of owner -> name.
       **/
      names: AugmentedQuery<ApiType, (arg: AccountId32 | string | Uint8Array) => Observable<Option<Bytes>>, [AccountId32]>;
      /**
       * Map of name -> ownership details.
       **/
      owner: AugmentedQuery<ApiType, (arg: Bytes | string | Uint8Array) => Observable<Option<PalletWeb3NamesWeb3NameWeb3NameOwnership>>, [Bytes]>;
    };
  } // AugmentedQueries
} // declare module
