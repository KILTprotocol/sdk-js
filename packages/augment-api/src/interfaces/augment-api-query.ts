// Auto-generated via `yarn polkadot-types-from-chain`, do not edit
/* eslint-disable */

import type { ApiTypes } from '@polkadot/api-base/types';
import type { BTreeMap, Bytes, Null, Option, Vec, bool, u128, u32, u64 } from '@polkadot/types-codec';
import type { AnyNumber, ITuple } from '@polkadot/types-codec/types';
import type { AccountId32, Call, H256 } from '@polkadot/types/interfaces/runtime';
import type { AttestationAttestationsAttestationDetails, CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot, DelegationDelegationHierarchyDelegationHierarchyDetails, DelegationDelegationHierarchyDelegationNode, DidDidDetails, DidServiceEndpointsDidEndpoint, FrameSupportWeightsPerDispatchClassU64, FrameSystemAccountInfo, FrameSystemEventRecord, FrameSystemLastRuntimeUpgradeInfo, FrameSystemPhase, KiltLaunchLockedBalance, PalletAuthorshipUncleEntryItem, PalletBalancesAccountData, PalletBalancesBalanceLock, PalletBalancesReleases, PalletBalancesReserveData, PalletCollectiveVotes, PalletDemocracyPreimageStatus, PalletDemocracyReferendumInfo, PalletDemocracyReleases, PalletDemocracyVoteThreshold, PalletDemocracyVoteVoting, PalletDidLookupConnectionRecord, PalletPreimageRequestStatus, PalletProxyAnnouncement, PalletProxyProxyDefinition, PalletSchedulerScheduledV3, PalletTransactionPaymentReleases, PalletTreasuryProposal, PalletVestingReleases, PalletVestingVestingInfo, PalletWeb3NamesWeb3NameWeb3NameOwnership, ParachainStakingCandidate, ParachainStakingDelegationCounter, ParachainStakingDelegator, ParachainStakingInflationInflationInfo, ParachainStakingRoundInfo, ParachainStakingSetOrderedSet, ParachainStakingStake, ParachainStakingTotalStake, PolkadotCorePrimitivesOutboundHrmpMessage, PolkadotPrimitivesV1AbridgedHostConfiguration, PolkadotPrimitivesV1PersistedValidationData, PolkadotPrimitivesV1UpgradeRestriction, SpConsensusAuraSr25519AppSr25519Public, SpCoreCryptoKeyTypeId, SpRuntimeDigest, SpiritnetRuntimeSessionKeys } from '@polkadot/types/lookup';
import type { Observable } from '@polkadot/types/types';

declare module '@polkadot/api-base/types/storage' {
  export interface AugmentedQueries<ApiType extends ApiTypes> {
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
      delegatedAttestations: AugmentedQuery<ApiType, (arg: H256 | string | Uint8Array) => Observable<Option<Vec<H256>>>, [H256]>;
    };
    aura: {
      /**
       * The current authority set.
       **/
      authorities: AugmentedQuery<ApiType, () => Observable<Vec<SpConsensusAuraSr25519AppSr25519Public>>, []>;
      /**
       * The current slot of this block.
       * 
       * This will be set in `on_initialize`.
       **/
      currentSlot: AugmentedQuery<ApiType, () => Observable<u64>, []>;
    };
    auraExt: {
      /**
       * Serves as cache for the authorities.
       * 
       * The authorities in AuRa are overwritten in `on_initialize` when we switch to a new session,
       * but we require the old authorities to verify the seal when validating a PoV. This will always
       * be updated to the latest AuRa authorities in `on_finalize`.
       **/
      authorities: AugmentedQuery<ApiType, () => Observable<Vec<SpConsensusAuraSr25519AppSr25519Public>>, []>;
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
    council: {
      /**
       * The current members of the collective. This is stored sorted (just by value).
       **/
      members: AugmentedQuery<ApiType, () => Observable<Vec<AccountId32>>, []>;
      /**
       * The prime member that helps determine the default vote behavior in case of absentations.
       **/
      prime: AugmentedQuery<ApiType, () => Observable<Option<AccountId32>>, []>;
      /**
       * Proposals so far.
       **/
      proposalCount: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * Actual proposal for a given hash, if it's current.
       **/
      proposalOf: AugmentedQuery<ApiType, (arg: H256 | string | Uint8Array) => Observable<Option<Call>>, [H256]>;
      /**
       * The hashes of the active proposals.
       **/
      proposals: AugmentedQuery<ApiType, () => Observable<Vec<H256>>, []>;
      /**
       * Votes on a given proposal, if it is ongoing.
       **/
      voting: AugmentedQuery<ApiType, (arg: H256 | string | Uint8Array) => Observable<Option<PalletCollectiveVotes>>, [H256]>;
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
    democracy: {
      /**
       * A record of who vetoed what. Maps proposal hash to a possible existent block number
       * (until when it may not be resubmitted) and who vetoed it.
       **/
      blacklist: AugmentedQuery<ApiType, (arg: H256 | string | Uint8Array) => Observable<Option<ITuple<[u64, Vec<AccountId32>]>>>, [H256]>;
      /**
       * Record of all proposals that have been subject to emergency cancellation.
       **/
      cancellations: AugmentedQuery<ApiType, (arg: H256 | string | Uint8Array) => Observable<bool>, [H256]>;
      /**
       * Those who have locked a deposit.
       * 
       * TWOX-NOTE: Safe, as increasing integer keys are safe.
       **/
      depositOf: AugmentedQuery<ApiType, (arg: u32 | AnyNumber | Uint8Array) => Observable<Option<ITuple<[Vec<AccountId32>, u128]>>>, [u32]>;
      /**
       * True if the last referendum tabled was submitted externally. False if it was a public
       * proposal.
       **/
      lastTabledWasExternal: AugmentedQuery<ApiType, () => Observable<bool>, []>;
      /**
       * The lowest referendum index representing an unbaked referendum. Equal to
       * `ReferendumCount` if there isn't a unbaked referendum.
       **/
      lowestUnbaked: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * The referendum to be tabled whenever it would be valid to table an external proposal.
       * This happens when a referendum needs to be tabled and one of two conditions are met:
       * - `LastTabledWasExternal` is `false`; or
       * - `PublicProps` is empty.
       **/
      nextExternal: AugmentedQuery<ApiType, () => Observable<Option<ITuple<[H256, PalletDemocracyVoteThreshold]>>>, []>;
      /**
       * Map of hashes to the proposal preimage, along with who registered it and their deposit.
       * The block number is the block at which it was deposited.
       **/
      preimages: AugmentedQuery<ApiType, (arg: H256 | string | Uint8Array) => Observable<Option<PalletDemocracyPreimageStatus>>, [H256]>;
      /**
       * The number of (public) proposals that have been made so far.
       **/
      publicPropCount: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * The public proposals. Unsorted. The second item is the proposal's hash.
       **/
      publicProps: AugmentedQuery<ApiType, () => Observable<Vec<ITuple<[u32, H256, AccountId32]>>>, []>;
      /**
       * The next free referendum index, aka the number of referenda started so far.
       **/
      referendumCount: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * Information concerning any given referendum.
       * 
       * TWOX-NOTE: SAFE as indexes are not under an attacker’s control.
       **/
      referendumInfoOf: AugmentedQuery<ApiType, (arg: u32 | AnyNumber | Uint8Array) => Observable<Option<PalletDemocracyReferendumInfo>>, [u32]>;
      /**
       * Storage version of the pallet.
       * 
       * New networks start with last version.
       **/
      storageVersion: AugmentedQuery<ApiType, () => Observable<Option<PalletDemocracyReleases>>, []>;
      /**
       * All votes for a particular voter. We store the balance for the number of votes that we
       * have recorded. The second item is the total amount of delegations, that will be added.
       * 
       * TWOX-NOTE: SAFE as `AccountId`s are crypto hashes anyway.
       **/
      votingOf: AugmentedQuery<ApiType, (arg: AccountId32 | string | Uint8Array) => Observable<PalletDemocracyVoteVoting>, [AccountId32]>;
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
      connectedAccounts: AugmentedQuery<ApiType, (arg1: AccountId32 | string | Uint8Array, arg2: AccountId32 | string | Uint8Array) => Observable<Option<Null>>, [AccountId32, AccountId32]>;
      /**
       * Mapping from account identifiers to DIDs.
       **/
      connectedDids: AugmentedQuery<ApiType, (arg: AccountId32 | string | Uint8Array) => Observable<Option<PalletDidLookupConnectionRecord>>, [AccountId32]>;
    };
    indices: {
      /**
       * The lookup from index to account.
       **/
      accounts: AugmentedQuery<ApiType, (arg: u64 | AnyNumber | Uint8Array) => Observable<Option<ITuple<[AccountId32, u128, bool]>>>, [u64]>;
    };
    kiltLaunch: {
      /**
       * Maps an account id to the (block, balance) pair in which the latter can
       * be unlocked.
       * 
       * Required for the claiming process.
       **/
      balanceLocks: AugmentedQuery<ApiType, (arg: AccountId32 | string | Uint8Array) => Observable<Option<KiltLaunchLockedBalance>>, [AccountId32]>;
      /**
       * Account which is permitted to do token transfers in PoA phase.
       * 
       * Required for the claiming process.
       **/
      transferAccount: AugmentedQuery<ApiType, () => Observable<Option<AccountId32>>, []>;
      /**
       * Maps a block to account ids which have their balance locked.
       * 
       * Required for automatic unlocking once the block number is reached in
       * `on_initialize`.
       **/
      unlockingAt: AugmentedQuery<ApiType, (arg: u64 | AnyNumber | Uint8Array) => Observable<Option<Vec<AccountId32>>>, [u64]>;
      /**
       * Maps an unowned account id to an empty value which reflects whether it
       * is a genesis account which should be migrated, if it exists.
       * 
       * Required for the claiming process.
       **/
      unownedAccount: AugmentedQuery<ApiType, (arg: AccountId32 | string | Uint8Array) => Observable<Option<Null>>, [AccountId32]>;
    };
    parachainInfo: {
      parachainId: AugmentedQuery<ApiType, () => Observable<u32>, []>;
    };
    parachainStaking: {
      /**
       * The staking information for a candidate.
       * 
       * It maps from an account to its information.
       * Moreover, it counts the number of candidates.
       **/
      candidatePool: AugmentedQuery<ApiType, (arg: AccountId32 | string | Uint8Array) => Observable<Option<ParachainStakingCandidate>>, [AccountId32]>;
      /**
       * Counter for the related counted storage map
       **/
      counterForCandidatePool: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * Delegation staking information.
       * 
       * It maps from an account to its delegation details.
       **/
      delegatorState: AugmentedQuery<ApiType, (arg: AccountId32 | string | Uint8Array) => Observable<Option<ParachainStakingDelegator>>, [AccountId32]>;
      forceNewRound: AugmentedQuery<ApiType, () => Observable<bool>, []>;
      /**
       * Inflation configuration.
       **/
      inflationConfig: AugmentedQuery<ApiType, () => Observable<ParachainStakingInflationInflationInfo>, []>;
      /**
       * Delegation information for the latest session in which a delegator
       * delegated.
       * 
       * It maps from an account to the number of delegations in the last
       * session in which they (re-)delegated.
       **/
      lastDelegation: AugmentedQuery<ApiType, (arg: AccountId32 | string | Uint8Array) => Observable<ParachainStakingDelegationCounter>, [AccountId32]>;
      /**
       * The year in which the last automatic reduction of the reward rates
       * occurred.
       * 
       * It starts at zero at genesis and increments by one every BLOCKS_PER_YEAR
       * many blocks.
       **/
      lastRewardReduction: AugmentedQuery<ApiType, () => Observable<u64>, []>;
      /**
       * The maximum amount a collator candidate can stake.
       **/
      maxCollatorCandidateStake: AugmentedQuery<ApiType, () => Observable<u128>, []>;
      /**
       * The maximum number of collator candidates selected at each round.
       **/
      maxSelectedCandidates: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * Current round number and next round scheduled transition.
       **/
      round: AugmentedQuery<ApiType, () => Observable<ParachainStakingRoundInfo>, []>;
      /**
       * The collator candidates with the highest amount of stake.
       * 
       * Each time the stake of a collator is increased, it is checked whether
       * this pushes another candidate out of the list. When the stake is
       * reduced however, it is not checked if another candidate has more stake,
       * since this would require iterating over the entire [CandidatePool].
       * 
       * There must always be more candidates than [MaxSelectedCandidates] so
       * that a collator can drop out of the collator set by reducing their
       * stake.
       **/
      topCandidates: AugmentedQuery<ApiType, () => Observable<Vec<ParachainStakingStake>>, []>;
      /**
       * Total funds locked to back the currently selected collators.
       * The sum of all collator and their delegator stakes.
       * 
       * Note: There are more funds locked by this pallet, since the backing for
       * non collating candidates is not included in [TotalCollatorStake].
       **/
      totalCollatorStake: AugmentedQuery<ApiType, () => Observable<ParachainStakingTotalStake>, []>;
      /**
       * The funds waiting to be unstaked.
       * 
       * It maps from accounts to all the funds addressed to them in the future
       * blocks.
       **/
      unstaking: AugmentedQuery<ApiType, (arg: AccountId32 | string | Uint8Array) => Observable<BTreeMap<u64, u128>>, [AccountId32]>;
    };
    parachainSystem: {
      /**
       * The number of HRMP messages we observed in `on_initialize` and thus used that number for
       * announcing the weight of `on_initialize` and `on_finalize`.
       **/
      announcedHrmpMessagesPerCandidate: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * The next authorized upgrade, if there is one.
       **/
      authorizedUpgrade: AugmentedQuery<ApiType, () => Observable<Option<H256>>, []>;
      /**
       * A custom head data that should be returned as result of `validate_block`.
       * 
       * See [`Pallet::set_custom_validation_head_data`] for more information.
       **/
      customValidationHeadData: AugmentedQuery<ApiType, () => Observable<Option<Bytes>>, []>;
      /**
       * Were the validation data set to notify the relay chain?
       **/
      didSetValidationCode: AugmentedQuery<ApiType, () => Observable<bool>, []>;
      /**
       * The parachain host configuration that was obtained from the relay parent.
       * 
       * This field is meant to be updated each block with the validation data inherent. Therefore,
       * before processing of the inherent, e.g. in `on_initialize` this data may be stale.
       * 
       * This data is also absent from the genesis.
       **/
      hostConfiguration: AugmentedQuery<ApiType, () => Observable<Option<PolkadotPrimitivesV1AbridgedHostConfiguration>>, []>;
      /**
       * HRMP messages that were sent in a block.
       * 
       * This will be cleared in `on_initialize` of each new block.
       **/
      hrmpOutboundMessages: AugmentedQuery<ApiType, () => Observable<Vec<PolkadotCorePrimitivesOutboundHrmpMessage>>, []>;
      /**
       * HRMP watermark that was set in a block.
       * 
       * This will be cleared in `on_initialize` of each new block.
       **/
      hrmpWatermark: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * The last downward message queue chain head we have observed.
       * 
       * This value is loaded before and saved after processing inbound downward messages carried
       * by the system inherent.
       **/
      lastDmqMqcHead: AugmentedQuery<ApiType, () => Observable<H256>, []>;
      /**
       * The message queue chain heads we have observed per each channel incoming channel.
       * 
       * This value is loaded before and saved after processing inbound downward messages carried
       * by the system inherent.
       **/
      lastHrmpMqcHeads: AugmentedQuery<ApiType, () => Observable<BTreeMap<u32, H256>>, []>;
      /**
       * Validation code that is set by the parachain and is to be communicated to collator and
       * consequently the relay-chain.
       * 
       * This will be cleared in `on_initialize` of each new block if no other pallet already set
       * the value.
       **/
      newValidationCode: AugmentedQuery<ApiType, () => Observable<Option<Bytes>>, []>;
      /**
       * Upward messages that are still pending and not yet send to the relay chain.
       **/
      pendingUpwardMessages: AugmentedQuery<ApiType, () => Observable<Vec<Bytes>>, []>;
      /**
       * In case of a scheduled upgrade, this storage field contains the validation code to be applied.
       * 
       * As soon as the relay chain gives us the go-ahead signal, we will overwrite the [`:code`][well_known_keys::CODE]
       * which will result the next block process with the new validation code. This concludes the upgrade process.
       * 
       * [well_known_keys::CODE]: sp_core::storage::well_known_keys::CODE
       **/
      pendingValidationCode: AugmentedQuery<ApiType, () => Observable<Bytes>, []>;
      /**
       * Number of downward messages processed in a block.
       * 
       * This will be cleared in `on_initialize` of each new block.
       **/
      processedDownwardMessages: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * The snapshot of some state related to messaging relevant to the current parachain as per
       * the relay parent.
       * 
       * This field is meant to be updated each block with the validation data inherent. Therefore,
       * before processing of the inherent, e.g. in `on_initialize` this data may be stale.
       * 
       * This data is also absent from the genesis.
       **/
      relevantMessagingState: AugmentedQuery<ApiType, () => Observable<Option<CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot>>, []>;
      /**
       * The weight we reserve at the beginning of the block for processing DMP messages. This
       * overrides the amount set in the Config trait.
       **/
      reservedDmpWeightOverride: AugmentedQuery<ApiType, () => Observable<Option<u64>>, []>;
      /**
       * The weight we reserve at the beginning of the block for processing XCMP messages. This
       * overrides the amount set in the Config trait.
       **/
      reservedXcmpWeightOverride: AugmentedQuery<ApiType, () => Observable<Option<u64>>, []>;
      /**
       * An option which indicates if the relay-chain restricts signalling a validation code upgrade.
       * In other words, if this is `Some` and [`NewValidationCode`] is `Some` then the produced
       * candidate will be invalid.
       * 
       * This storage item is a mirror of the corresponding value for the current parachain from the
       * relay-chain. This value is ephemeral which means it doesn't hit the storage. This value is
       * set after the inherent.
       **/
      upgradeRestrictionSignal: AugmentedQuery<ApiType, () => Observable<Option<PolkadotPrimitivesV1UpgradeRestriction>>, []>;
      /**
       * Upward messages that were sent in a block.
       * 
       * This will be cleared in `on_initialize` of each new block.
       **/
      upwardMessages: AugmentedQuery<ApiType, () => Observable<Vec<Bytes>>, []>;
      /**
       * The [`PersistedValidationData`] set for this block.
       * This value is expected to be set only once per block and it's never stored
       * in the trie.
       **/
      validationData: AugmentedQuery<ApiType, () => Observable<Option<PolkadotPrimitivesV1PersistedValidationData>>, []>;
    };
    preimage: {
      /**
       * The preimages stored by this pallet.
       **/
      preimageFor: AugmentedQuery<ApiType, (arg: H256 | string | Uint8Array) => Observable<Option<Bytes>>, [H256]>;
      /**
       * The request status of a given hash.
       **/
      statusFor: AugmentedQuery<ApiType, (arg: H256 | string | Uint8Array) => Observable<Option<PalletPreimageRequestStatus>>, [H256]>;
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
    randomnessCollectiveFlip: {
      /**
       * Series of block headers from the last 81 blocks that acts as random seed material. This
       * is arranged as a ring buffer with `block_number % 81` being the index into the `Vec` of
       * the oldest hash.
       **/
      randomMaterial: AugmentedQuery<ApiType, () => Observable<Vec<H256>>, []>;
    };
    scheduler: {
      /**
       * Items to be executed, indexed by the block number that they should be executed on.
       **/
      agenda: AugmentedQuery<ApiType, (arg: u64 | AnyNumber | Uint8Array) => Observable<Vec<Option<PalletSchedulerScheduledV3>>>, [u64]>;
      /**
       * Lookup from identity to the block number and index of the task.
       **/
      lookup: AugmentedQuery<ApiType, (arg: Bytes | string | Uint8Array) => Observable<Option<ITuple<[u64, u32]>>>, [Bytes]>;
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
      nextKeys: AugmentedQuery<ApiType, (arg: AccountId32 | string | Uint8Array) => Observable<Option<SpiritnetRuntimeSessionKeys>>, [AccountId32]>;
      /**
       * True if the underlying economic identities or weighting behind the validators
       * has changed in the queued validator set.
       **/
      queuedChanged: AugmentedQuery<ApiType, () => Observable<bool>, []>;
      /**
       * The queued keys for the next session. When the next session begins, these keys
       * will be used to determine the validator's session keys.
       **/
      queuedKeys: AugmentedQuery<ApiType, () => Observable<Vec<ITuple<[AccountId32, SpiritnetRuntimeSessionKeys]>>>, []>;
      /**
       * The current set of validators.
       **/
      validators: AugmentedQuery<ApiType, () => Observable<Vec<AccountId32>>, []>;
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
       * NOTE: This storage item is explicitly unbounded since it is never intended to be read
       * from within the runtime.
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
    technicalCommittee: {
      /**
       * The current members of the collective. This is stored sorted (just by value).
       **/
      members: AugmentedQuery<ApiType, () => Observable<Vec<AccountId32>>, []>;
      /**
       * The prime member that helps determine the default vote behavior in case of absentations.
       **/
      prime: AugmentedQuery<ApiType, () => Observable<Option<AccountId32>>, []>;
      /**
       * Proposals so far.
       **/
      proposalCount: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * Actual proposal for a given hash, if it's current.
       **/
      proposalOf: AugmentedQuery<ApiType, (arg: H256 | string | Uint8Array) => Observable<Option<Call>>, [H256]>;
      /**
       * The hashes of the active proposals.
       **/
      proposals: AugmentedQuery<ApiType, () => Observable<Vec<H256>>, []>;
      /**
       * Votes on a given proposal, if it is ongoing.
       **/
      voting: AugmentedQuery<ApiType, (arg: H256 | string | Uint8Array) => Observable<Option<PalletCollectiveVotes>>, [H256]>;
    };
    technicalMembership: {
      /**
       * The current membership, stored as an ordered Vec.
       **/
      members: AugmentedQuery<ApiType, () => Observable<Vec<AccountId32>>, []>;
      /**
       * The current prime member, if one exists.
       **/
      prime: AugmentedQuery<ApiType, () => Observable<Option<AccountId32>>, []>;
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
    treasury: {
      /**
       * Proposal indices that have been approved but not yet awarded.
       **/
      approvals: AugmentedQuery<ApiType, () => Observable<Vec<u32>>, []>;
      /**
       * Number of proposals that have been made.
       **/
      proposalCount: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * Proposals that have been made.
       **/
      proposals: AugmentedQuery<ApiType, (arg: u32 | AnyNumber | Uint8Array) => Observable<Option<PalletTreasuryProposal>>, [u32]>;
    };
    vesting: {
      /**
       * Storage version of the pallet.
       * 
       * New networks start with latest version, as determined by the genesis build.
       **/
      storageVersion: AugmentedQuery<ApiType, () => Observable<PalletVestingReleases>, []>;
      /**
       * Information regarding the vesting of a given account.
       **/
      vesting: AugmentedQuery<ApiType, (arg: AccountId32 | string | Uint8Array) => Observable<Option<Vec<PalletVestingVestingInfo>>>, [AccountId32]>;
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