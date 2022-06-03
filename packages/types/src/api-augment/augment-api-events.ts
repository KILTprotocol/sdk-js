// Auto-generated via `yarn polkadot-types-from-chain`, do not edit
/* eslint-disable */

import type { ApiTypes } from '@polkadot/api-base/types';
import type { Bytes, Null, Option, Result, Vec, bool, u128, u16, u32, u64 } from '@polkadot/types-codec';
import type { ITuple } from '@polkadot/types-codec/types';
import type { AccountId32, H256, Perquintill } from '@polkadot/types/interfaces/runtime';
import type { DelegationDelegationHierarchyPermissions, FrameSupportScheduleLookupError, FrameSupportTokensMiscBalanceStatus, FrameSupportWeightsDispatchInfo, PalletDemocracyVoteAccountVote, PalletDemocracyVoteThreshold, SpRuntimeDispatchError, SpiritnetRuntimeProxyType } from '@polkadot/types/lookup';

declare module '@polkadot/api-base/types/events' {
  export interface AugmentedEvents<ApiType extends ApiTypes> {
    attestation: {
      /**
       * A new attestation has been created.
       * \[attester ID, claim hash, CType hash, (optional) delegation ID\]
       **/
      AttestationCreated: AugmentedEvent<ApiType, [AccountId32, H256, H256, Option<H256>]>;
      /**
       * An attestation has been removed.
       * \[account id, claim hash\]
       **/
      AttestationRemoved: AugmentedEvent<ApiType, [AccountId32, H256]>;
      /**
       * An attestation has been revoked.
       * \[account id, claim hash\]
       **/
      AttestationRevoked: AugmentedEvent<ApiType, [AccountId32, H256]>;
      /**
       * The deposit owner reclaimed a deposit by removing an attestation.
       * \[account id, claim hash\]
       **/
      DepositReclaimed: AugmentedEvent<ApiType, [AccountId32, H256]>;
    };
    balances: {
      /**
       * A balance was set by root.
       **/
      BalanceSet: AugmentedEvent<ApiType, [AccountId32, u128, u128]>;
      /**
       * Some amount was deposited (e.g. for transaction fees).
       **/
      Deposit: AugmentedEvent<ApiType, [AccountId32, u128]>;
      /**
       * An account was removed whose balance was non-zero but below ExistentialDeposit,
       * resulting in an outright loss.
       **/
      DustLost: AugmentedEvent<ApiType, [AccountId32, u128]>;
      /**
       * An account was created with some free balance.
       **/
      Endowed: AugmentedEvent<ApiType, [AccountId32, u128]>;
      /**
       * Some balance was reserved (moved from free to reserved).
       **/
      Reserved: AugmentedEvent<ApiType, [AccountId32, u128]>;
      /**
       * Some balance was moved from the reserve of the first account to the second account.
       * Final argument indicates the destination balance type.
       **/
      ReserveRepatriated: AugmentedEvent<ApiType, [AccountId32, AccountId32, u128, FrameSupportTokensMiscBalanceStatus]>;
      /**
       * Some amount was removed from the account (e.g. for misbehavior).
       **/
      Slashed: AugmentedEvent<ApiType, [AccountId32, u128]>;
      /**
       * Transfer succeeded.
       **/
      Transfer: AugmentedEvent<ApiType, [AccountId32, AccountId32, u128]>;
      /**
       * Some balance was unreserved (moved from reserved to free).
       **/
      Unreserved: AugmentedEvent<ApiType, [AccountId32, u128]>;
      /**
       * Some amount was withdrawn from the account (e.g. for transaction fees).
       **/
      Withdraw: AugmentedEvent<ApiType, [AccountId32, u128]>;
    };
    council: {
      /**
       * A motion was approved by the required threshold.
       **/
      Approved: AugmentedEvent<ApiType, [H256]>;
      /**
       * A proposal was closed because its threshold was reached or after its duration was up.
       **/
      Closed: AugmentedEvent<ApiType, [H256, u32, u32]>;
      /**
       * A motion was not approved by the required threshold.
       **/
      Disapproved: AugmentedEvent<ApiType, [H256]>;
      /**
       * A motion was executed; result will be `Ok` if it returned without error.
       **/
      Executed: AugmentedEvent<ApiType, [H256, Result<Null, SpRuntimeDispatchError>]>;
      /**
       * A single member did some action; result will be `Ok` if it returned without error.
       **/
      MemberExecuted: AugmentedEvent<ApiType, [H256, Result<Null, SpRuntimeDispatchError>]>;
      /**
       * A motion (given hash) has been proposed (by given account) with a threshold (given
       * `MemberCount`).
       **/
      Proposed: AugmentedEvent<ApiType, [AccountId32, u32, H256, u32]>;
      /**
       * A motion (given hash) has been voted on by given account, leaving
       * a tally (yes votes and no votes given respectively as `MemberCount`).
       **/
      Voted: AugmentedEvent<ApiType, [AccountId32, H256, bool, u32, u32]>;
    };
    ctype: {
      /**
       * A new CType has been created.
       * \[creator identifier, CType hash\]
       **/
      CTypeCreated: AugmentedEvent<ApiType, [AccountId32, H256]>;
    };
    delegation: {
      /**
       * A new delegation has been created.
       * \[creator ID, root node ID, delegation node ID, parent node ID,
       * delegate ID, permissions\]
       **/
      DelegationCreated: AugmentedEvent<ApiType, [AccountId32, H256, H256, H256, AccountId32, DelegationDelegationHierarchyPermissions]>;
      /**
       * A delegation has been removed.
       * \[remover ID, delegation node ID\]
       **/
      DelegationRemoved: AugmentedEvent<ApiType, [AccountId32, H256]>;
      /**
       * A delegation has been revoked.
       * \[revoker ID, delegation node ID\]
       **/
      DelegationRevoked: AugmentedEvent<ApiType, [AccountId32, H256]>;
      /**
       * The deposit owner reclaimed a deposit by removing a delegation
       * subtree. \[revoker ID, delegation node ID\]
       **/
      DepositReclaimed: AugmentedEvent<ApiType, [AccountId32, H256]>;
      /**
       * A new hierarchy has been created.
       * \[creator ID, root node ID, CTYPE hash\]
       **/
      HierarchyCreated: AugmentedEvent<ApiType, [AccountId32, H256, H256]>;
      /**
       * A hierarchy has been removed from the storage on chain.
       * \[remover ID, root node ID\]
       **/
      HierarchyRemoved: AugmentedEvent<ApiType, [AccountId32, H256]>;
      /**
       * A hierarchy has been revoked.
       * \[revoker ID, root node ID\]
       **/
      HierarchyRevoked: AugmentedEvent<ApiType, [AccountId32, H256]>;
    };
    democracy: {
      /**
       * A proposal_hash has been blacklisted permanently.
       **/
      Blacklisted: AugmentedEvent<ApiType, [H256]>;
      /**
       * A referendum has been cancelled.
       **/
      Cancelled: AugmentedEvent<ApiType, [u32]>;
      /**
       * An account has delegated their vote to another account.
       **/
      Delegated: AugmentedEvent<ApiType, [AccountId32, AccountId32]>;
      /**
       * A proposal has been enacted.
       **/
      Executed: AugmentedEvent<ApiType, [u32, Result<Null, SpRuntimeDispatchError>]>;
      /**
       * An external proposal has been tabled.
       **/
      ExternalTabled: AugmentedEvent<ApiType, []>;
      /**
       * A proposal has been rejected by referendum.
       **/
      NotPassed: AugmentedEvent<ApiType, [u32]>;
      /**
       * A proposal has been approved by referendum.
       **/
      Passed: AugmentedEvent<ApiType, [u32]>;
      /**
       * A proposal could not be executed because its preimage was invalid.
       **/
      PreimageInvalid: AugmentedEvent<ApiType, [H256, u32]>;
      /**
       * A proposal could not be executed because its preimage was missing.
       **/
      PreimageMissing: AugmentedEvent<ApiType, [H256, u32]>;
      /**
       * A proposal's preimage was noted, and the deposit taken.
       **/
      PreimageNoted: AugmentedEvent<ApiType, [H256, AccountId32, u128]>;
      /**
       * A registered preimage was removed and the deposit collected by the reaper.
       **/
      PreimageReaped: AugmentedEvent<ApiType, [H256, AccountId32, u128, AccountId32]>;
      /**
       * A proposal preimage was removed and used (the deposit was returned).
       **/
      PreimageUsed: AugmentedEvent<ApiType, [H256, AccountId32, u128]>;
      /**
       * A motion has been proposed by a public account.
       **/
      Proposed: AugmentedEvent<ApiType, [u32, u128]>;
      /**
       * An account has secconded a proposal
       **/
      Seconded: AugmentedEvent<ApiType, [AccountId32, u32]>;
      /**
       * A referendum has begun.
       **/
      Started: AugmentedEvent<ApiType, [u32, PalletDemocracyVoteThreshold]>;
      /**
       * A public proposal has been tabled for referendum vote.
       **/
      Tabled: AugmentedEvent<ApiType, [u32, u128, Vec<AccountId32>]>;
      /**
       * An account has cancelled a previous delegation operation.
       **/
      Undelegated: AugmentedEvent<ApiType, [AccountId32]>;
      /**
       * An external proposal has been vetoed.
       **/
      Vetoed: AugmentedEvent<ApiType, [AccountId32, H256, u64]>;
      /**
       * An account has voted in a referendum
       **/
      Voted: AugmentedEvent<ApiType, [AccountId32, u32, PalletDemocracyVoteAccountVote]>;
    };
    did: {
      /**
       * A DID-authorised call has been executed.
       * \[DID caller, dispatch result\]
       **/
      DidCallDispatched: AugmentedEvent<ApiType, [AccountId32, Result<Null, SpRuntimeDispatchError>]>;
      /**
       * A new DID has been created.
       * \[transaction signer, DID identifier\]
       **/
      DidCreated: AugmentedEvent<ApiType, [AccountId32, AccountId32]>;
      /**
       * A DID has been deleted.
       * \[DID identifier\]
       **/
      DidDeleted: AugmentedEvent<ApiType, [AccountId32]>;
      /**
       * A DID has been updated.
       * \[DID identifier\]
       **/
      DidUpdated: AugmentedEvent<ApiType, [AccountId32]>;
    };
    didLookup: {
      /**
       * A new association between a DID and an account ID was created.
       **/
      AssociationEstablished: AugmentedEvent<ApiType, [AccountId32, AccountId32]>;
      /**
       * An association between a DID and an account ID was removed.
       **/
      AssociationRemoved: AugmentedEvent<ApiType, [AccountId32, AccountId32]>;
    };
    indices: {
      /**
       * A account index was assigned.
       **/
      IndexAssigned: AugmentedEvent<ApiType, [AccountId32, u64]>;
      /**
       * A account index has been freed up (unassigned).
       **/
      IndexFreed: AugmentedEvent<ApiType, [u64]>;
      /**
       * A account index has been frozen to its current account ID.
       **/
      IndexFrozen: AugmentedEvent<ApiType, [u64, AccountId32]>;
    };
    kiltLaunch: {
      /**
       * A KILT balance lock has been set. \[who, value, until\]
       **/
      AddedKiltLock: AugmentedEvent<ApiType, [AccountId32, u128, u64]>;
      /**
       * Vesting has been added to an account. \[who, per_block, total\]
       **/
      AddedVesting: AugmentedEvent<ApiType, [AccountId32, u128, u128]>;
      /**
       * An account transferred their locked balance to another account.
       * \[from, value, target\]
       **/
      LockedTransfer: AugmentedEvent<ApiType, [AccountId32, u128, AccountId32]>;
      /**
       * A KILT balance lock has been removed in the corresponding block.
       * \[block, len\]
       **/
      Unlocked: AugmentedEvent<ApiType, [u64, u32]>;
    };
    parachainStaking: {
      /**
       * The length in blocks for future validation rounds has changed.
       * \[round number, first block in the current round, old value, new
       * value\]
       **/
      BlocksPerRoundSet: AugmentedEvent<ApiType, [u32, u64, u64, u64]>;
      /**
       * An account has left the set of collator candidates.
       * \[account, amount of funds un-staked\]
       **/
      CandidateLeft: AugmentedEvent<ApiType, [AccountId32, u128]>;
      /**
       * A collator candidate has canceled the process to leave the set of
       * candidates and was added back to the candidate pool. \[collator's
       * account\]
       **/
      CollatorCanceledExit: AugmentedEvent<ApiType, [AccountId32]>;
      /**
       * An account was forcedly removed from the  set of collator
       * candidates. \[account, amount of funds un-staked\]
       **/
      CollatorRemoved: AugmentedEvent<ApiType, [AccountId32, u128]>;
      /**
       * A collator candidate has started the process to leave the set of
       * candidates. \[round number, collator's account, round number when
       * the collator will be effectively removed from the set of
       * candidates\]
       **/
      CollatorScheduledExit: AugmentedEvent<ApiType, [u32, AccountId32, u32]>;
      /**
       * A collator candidate has decreased the amount of funds at stake.
       * \[collator's account, previous stake, new stake\]
       **/
      CollatorStakedLess: AugmentedEvent<ApiType, [AccountId32, u128, u128]>;
      /**
       * A collator candidate has increased the amount of funds at stake.
       * \[collator's account, previous stake, new stake\]
       **/
      CollatorStakedMore: AugmentedEvent<ApiType, [AccountId32, u128, u128]>;
      /**
       * An account has delegated a new collator candidate.
       * \[account, amount of funds staked, total amount of delegators' funds
       * staked for the collator candidate\]
       **/
      Delegation: AugmentedEvent<ApiType, [AccountId32, u128, AccountId32, u128]>;
      /**
       * A new delegation has replaced an existing one in the set of ongoing
       * delegations for a collator candidate. \[new delegator's account,
       * amount of funds staked in the new delegation, replaced delegator's
       * account, amount of funds staked in the replace delegation, collator
       * candidate's account, new total amount of delegators' funds staked
       * for the collator candidate\]
       **/
      DelegationReplaced: AugmentedEvent<ApiType, [AccountId32, u128, AccountId32, u128, AccountId32, u128]>;
      /**
       * An account has left the set of delegators.
       * \[account, amount of funds un-staked\]
       **/
      DelegatorLeft: AugmentedEvent<ApiType, [AccountId32, u128]>;
      /**
       * An account has stopped delegating a collator candidate.
       * \[account, collator candidate's account, old amount of delegators'
       * funds staked, new amount of delegators' funds staked\]
       **/
      DelegatorLeftCollator: AugmentedEvent<ApiType, [AccountId32, AccountId32, u128, u128]>;
      /**
       * A delegator has decreased the amount of funds at stake for a
       * collator. \[delegator's account, collator's account, previous
       * delegation stake, new delegation stake\]
       **/
      DelegatorStakedLess: AugmentedEvent<ApiType, [AccountId32, AccountId32, u128, u128]>;
      /**
       * A delegator has increased the amount of funds at stake for a
       * collator. \[delegator's account, collator's account, previous
       * delegation stake, new delegation stake\]
       **/
      DelegatorStakedMore: AugmentedEvent<ApiType, [AccountId32, AccountId32, u128, u128]>;
      /**
       * A new account has joined the set of top candidates.
       * \[account\]
       **/
      EnteredTopCandidates: AugmentedEvent<ApiType, [AccountId32]>;
      /**
       * A new account has joined the set of collator candidates.
       * \[account, amount staked by the new candidate\]
       **/
      JoinedCollatorCandidates: AugmentedEvent<ApiType, [AccountId32, u128]>;
      /**
       * An account was removed from the set of top candidates.
       * \[account\]
       **/
      LeftTopCandidates: AugmentedEvent<ApiType, [AccountId32]>;
      /**
       * The maximum candidate stake has been changed.
       * \[new max amount\]
       **/
      MaxCandidateStakeChanged: AugmentedEvent<ApiType, [u128]>;
      /**
       * The maximum number of collator candidates selected in future
       * validation rounds has changed. \[old value, new value\]
       **/
      MaxSelectedCandidatesSet: AugmentedEvent<ApiType, [u32, u32]>;
      /**
       * A new staking round has started.
       * \[block number, round number\]
       **/
      NewRound: AugmentedEvent<ApiType, [u64, u32]>;
      /**
       * A collator or a delegator has received a reward.
       * \[account, amount of reward\]
       **/
      Rewarded: AugmentedEvent<ApiType, [AccountId32, u128]>;
      /**
       * Inflation configuration for future validation rounds has changed.
       * \[maximum collator's staking rate, maximum collator's reward rate,
       * maximum delegator's staking rate, maximum delegator's reward rate\]
       **/
      RoundInflationSet: AugmentedEvent<ApiType, [Perquintill, Perquintill, Perquintill, Perquintill]>;
    };
    parachainSystem: {
      /**
       * Downward messages were processed using the given weight.
       * \[ weight_used, result_mqc_head \]
       **/
      DownwardMessagesProcessed: AugmentedEvent<ApiType, [u64, H256]>;
      /**
       * Some downward messages have been received and will be processed.
       * \[ count \]
       **/
      DownwardMessagesReceived: AugmentedEvent<ApiType, [u32]>;
      /**
       * An upgrade has been authorized.
       **/
      UpgradeAuthorized: AugmentedEvent<ApiType, [H256]>;
      /**
       * The validation function was applied as of the contained relay chain block number.
       **/
      ValidationFunctionApplied: AugmentedEvent<ApiType, [u32]>;
      /**
       * The relay-chain aborted the upgrade process.
       **/
      ValidationFunctionDiscarded: AugmentedEvent<ApiType, []>;
      /**
       * The validation function has been scheduled to apply.
       **/
      ValidationFunctionStored: AugmentedEvent<ApiType, []>;
    };
    preimage: {
      /**
       * A preimage has ben cleared.
       **/
      Cleared: AugmentedEvent<ApiType, [H256]>;
      /**
       * A preimage has been noted.
       **/
      Noted: AugmentedEvent<ApiType, [H256]>;
      /**
       * A preimage has been requested.
       **/
      Requested: AugmentedEvent<ApiType, [H256]>;
    };
    proxy: {
      /**
       * An announcement was placed to make a call in the future.
       **/
      Announced: AugmentedEvent<ApiType, [AccountId32, AccountId32, H256]>;
      /**
       * Anonymous account has been created by new proxy with given
       * disambiguation index and proxy type.
       **/
      AnonymousCreated: AugmentedEvent<ApiType, [AccountId32, AccountId32, SpiritnetRuntimeProxyType, u16]>;
      /**
       * A proxy was added.
       **/
      ProxyAdded: AugmentedEvent<ApiType, [AccountId32, AccountId32, SpiritnetRuntimeProxyType, u64]>;
      /**
       * A proxy was executed correctly, with the given.
       **/
      ProxyExecuted: AugmentedEvent<ApiType, [Result<Null, SpRuntimeDispatchError>]>;
    };
    scheduler: {
      /**
       * The call for the provided hash was not found so the task has been aborted.
       **/
      CallLookupFailed: AugmentedEvent<ApiType, [ITuple<[u64, u32]>, Option<Bytes>, FrameSupportScheduleLookupError]>;
      /**
       * Canceled some task.
       **/
      Canceled: AugmentedEvent<ApiType, [u64, u32]>;
      /**
       * Dispatched some task.
       **/
      Dispatched: AugmentedEvent<ApiType, [ITuple<[u64, u32]>, Option<Bytes>, Result<Null, SpRuntimeDispatchError>]>;
      /**
       * Scheduled some task.
       **/
      Scheduled: AugmentedEvent<ApiType, [u64, u32]>;
    };
    session: {
      /**
       * New session has happened. Note that the argument is the session index, not the
       * block number as the type might suggest.
       **/
      NewSession: AugmentedEvent<ApiType, [u32]>;
    };
    system: {
      /**
       * `:code` was updated.
       **/
      CodeUpdated: AugmentedEvent<ApiType, []>;
      /**
       * An extrinsic failed.
       **/
      ExtrinsicFailed: AugmentedEvent<ApiType, [SpRuntimeDispatchError, FrameSupportWeightsDispatchInfo]>;
      /**
       * An extrinsic completed successfully.
       **/
      ExtrinsicSuccess: AugmentedEvent<ApiType, [FrameSupportWeightsDispatchInfo]>;
      /**
       * An account was reaped.
       **/
      KilledAccount: AugmentedEvent<ApiType, [AccountId32]>;
      /**
       * A new account was created.
       **/
      NewAccount: AugmentedEvent<ApiType, [AccountId32]>;
      /**
       * On on-chain remark happened.
       **/
      Remarked: AugmentedEvent<ApiType, [AccountId32, H256]>;
    };
    technicalCommittee: {
      /**
       * A motion was approved by the required threshold.
       **/
      Approved: AugmentedEvent<ApiType, [H256]>;
      /**
       * A proposal was closed because its threshold was reached or after its duration was up.
       **/
      Closed: AugmentedEvent<ApiType, [H256, u32, u32]>;
      /**
       * A motion was not approved by the required threshold.
       **/
      Disapproved: AugmentedEvent<ApiType, [H256]>;
      /**
       * A motion was executed; result will be `Ok` if it returned without error.
       **/
      Executed: AugmentedEvent<ApiType, [H256, Result<Null, SpRuntimeDispatchError>]>;
      /**
       * A single member did some action; result will be `Ok` if it returned without error.
       **/
      MemberExecuted: AugmentedEvent<ApiType, [H256, Result<Null, SpRuntimeDispatchError>]>;
      /**
       * A motion (given hash) has been proposed (by given account) with a threshold (given
       * `MemberCount`).
       **/
      Proposed: AugmentedEvent<ApiType, [AccountId32, u32, H256, u32]>;
      /**
       * A motion (given hash) has been voted on by given account, leaving
       * a tally (yes votes and no votes given respectively as `MemberCount`).
       **/
      Voted: AugmentedEvent<ApiType, [AccountId32, H256, bool, u32, u32]>;
    };
    technicalMembership: {
      /**
       * Phantom member, never used.
       **/
      Dummy: AugmentedEvent<ApiType, []>;
      /**
       * One of the members' keys changed.
       **/
      KeyChanged: AugmentedEvent<ApiType, []>;
      /**
       * The given member was added; see the transaction for who.
       **/
      MemberAdded: AugmentedEvent<ApiType, []>;
      /**
       * The given member was removed; see the transaction for who.
       **/
      MemberRemoved: AugmentedEvent<ApiType, []>;
      /**
       * The membership was reset; see the transaction for who the new set is.
       **/
      MembersReset: AugmentedEvent<ApiType, []>;
      /**
       * Two members were swapped; see the transaction for who.
       **/
      MembersSwapped: AugmentedEvent<ApiType, []>;
    };
    treasury: {
      /**
       * Some funds have been allocated.
       **/
      Awarded: AugmentedEvent<ApiType, [u32, u128, AccountId32]>;
      /**
       * Some of our funds have been burnt.
       **/
      Burnt: AugmentedEvent<ApiType, [u128]>;
      /**
       * Some funds have been deposited.
       **/
      Deposit: AugmentedEvent<ApiType, [u128]>;
      /**
       * New proposal.
       **/
      Proposed: AugmentedEvent<ApiType, [u32]>;
      /**
       * A proposal was rejected; funds were slashed.
       **/
      Rejected: AugmentedEvent<ApiType, [u32, u128]>;
      /**
       * Spending has finished; this is the amount that rolls over until next spend.
       **/
      Rollover: AugmentedEvent<ApiType, [u128]>;
      /**
       * We have ended a spend period and will now allocate funds.
       **/
      Spending: AugmentedEvent<ApiType, [u128]>;
    };
    utility: {
      /**
       * Batch of dispatches completed fully with no error.
       **/
      BatchCompleted: AugmentedEvent<ApiType, []>;
      /**
       * Batch of dispatches did not complete fully. Index of first failing dispatch given, as
       * well as the error.
       **/
      BatchInterrupted: AugmentedEvent<ApiType, [u32, SpRuntimeDispatchError]>;
      /**
       * A call was dispatched.
       **/
      DispatchedAs: AugmentedEvent<ApiType, [Result<Null, SpRuntimeDispatchError>]>;
      /**
       * A single item within a Batch of dispatches has completed with no error.
       **/
      ItemCompleted: AugmentedEvent<ApiType, []>;
    };
    vesting: {
      /**
       * An \[account\] has become fully vested.
       **/
      VestingCompleted: AugmentedEvent<ApiType, [AccountId32]>;
      /**
       * The amount vested has been updated. This could indicate a change in funds available.
       * The balance given is the amount which is left unvested (and thus locked).
       **/
      VestingUpdated: AugmentedEvent<ApiType, [AccountId32, u128]>;
    };
    web3Names: {
      /**
       * A name has been banned.
       **/
      Web3NameBanned: AugmentedEvent<ApiType, [Bytes]>;
      /**
       * A new name has been claimed.
       **/
      Web3NameClaimed: AugmentedEvent<ApiType, [AccountId32, Bytes]>;
      /**
       * A name has been released.
       **/
      Web3NameReleased: AugmentedEvent<ApiType, [AccountId32, Bytes]>;
      /**
       * A name has been unbanned.
       **/
      Web3NameUnbanned: AugmentedEvent<ApiType, [Bytes]>;
    };
  } // AugmentedEvents
} // declare module
