// Auto-generated via `yarn polkadot-types-from-chain`, do not edit
/* eslint-disable */

// import type lookup before we augment - in some environments
// this is required to allow for ambient/previous definitions
import '@polkadot/api-base/types/events';

import type { ApiTypes, AugmentedEvent } from '@polkadot/api-base/types';
import type { Bytes, Null, Option, Result, Vec, u128, u16, u32, u64 } from '@polkadot/types-codec';
import type { ITuple } from '@polkadot/types-codec/types';
import type { AccountId32, H256 } from '@polkadot/types/interfaces/runtime';
import type { DelegationDelegationHierarchyPermissions, FrameSupportTokensMiscBalanceStatus, FrameSupportWeightsDispatchInfo, MashnetNodeRuntimeProxyType, PalletDidLookupLinkableAccountLinkableAccountId, RuntimeCommonAssetsAssetDid, RuntimeCommonAuthorizationAuthorizationId, SpFinalityGrandpaAppPublic, SpRuntimeDispatchError } from '@polkadot/types/lookup';

export type __AugmentedEvent<ApiType extends ApiTypes> = AugmentedEvent<ApiType>;

declare module '@polkadot/api-base/types/events' {
  interface AugmentedEvents<ApiType extends ApiTypes> {
    attestation: {
      /**
       * A new attestation has been created.
       * \[attester ID, claim hash, CType hash, (optional) delegation ID\]
       **/
      AttestationCreated: AugmentedEvent<ApiType, [AccountId32, H256, H256, Option<RuntimeCommonAuthorizationAuthorizationId>]>;
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
      BalanceSet: AugmentedEvent<ApiType, [who: AccountId32, free: u128, reserved: u128], { who: AccountId32, free: u128, reserved: u128 }>;
      /**
       * Some amount was deposited (e.g. for transaction fees).
       **/
      Deposit: AugmentedEvent<ApiType, [who: AccountId32, amount: u128], { who: AccountId32, amount: u128 }>;
      /**
       * An account was removed whose balance was non-zero but below ExistentialDeposit,
       * resulting in an outright loss.
       **/
      DustLost: AugmentedEvent<ApiType, [account: AccountId32, amount: u128], { account: AccountId32, amount: u128 }>;
      /**
       * An account was created with some free balance.
       **/
      Endowed: AugmentedEvent<ApiType, [account: AccountId32, freeBalance: u128], { account: AccountId32, freeBalance: u128 }>;
      /**
       * Some balance was reserved (moved from free to reserved).
       **/
      Reserved: AugmentedEvent<ApiType, [who: AccountId32, amount: u128], { who: AccountId32, amount: u128 }>;
      /**
       * Some balance was moved from the reserve of the first account to the second account.
       * Final argument indicates the destination balance type.
       **/
      ReserveRepatriated: AugmentedEvent<ApiType, [from: AccountId32, to: AccountId32, amount: u128, destinationStatus: FrameSupportTokensMiscBalanceStatus], { from: AccountId32, to: AccountId32, amount: u128, destinationStatus: FrameSupportTokensMiscBalanceStatus }>;
      /**
       * Some amount was removed from the account (e.g. for misbehavior).
       **/
      Slashed: AugmentedEvent<ApiType, [who: AccountId32, amount: u128], { who: AccountId32, amount: u128 }>;
      /**
       * Transfer succeeded.
       **/
      Transfer: AugmentedEvent<ApiType, [from: AccountId32, to: AccountId32, amount: u128], { from: AccountId32, to: AccountId32, amount: u128 }>;
      /**
       * Some balance was unreserved (moved from reserved to free).
       **/
      Unreserved: AugmentedEvent<ApiType, [who: AccountId32, amount: u128], { who: AccountId32, amount: u128 }>;
      /**
       * Some amount was withdrawn from the account (e.g. for transaction fees).
       **/
      Withdraw: AugmentedEvent<ApiType, [who: AccountId32, amount: u128], { who: AccountId32, amount: u128 }>;
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
      AssociationEstablished: AugmentedEvent<ApiType, [PalletDidLookupLinkableAccountLinkableAccountId, AccountId32]>;
      /**
       * An association between a DID and an account ID was removed.
       **/
      AssociationRemoved: AugmentedEvent<ApiType, [PalletDidLookupLinkableAccountLinkableAccountId, AccountId32]>;
    };
    grandpa: {
      /**
       * New authority set has been applied.
       **/
      NewAuthorities: AugmentedEvent<ApiType, [authoritySet: Vec<ITuple<[SpFinalityGrandpaAppPublic, u64]>>], { authoritySet: Vec<ITuple<[SpFinalityGrandpaAppPublic, u64]>> }>;
      /**
       * Current authority set has been paused.
       **/
      Paused: AugmentedEvent<ApiType, []>;
      /**
       * Current authority set has been resumed.
       **/
      Resumed: AugmentedEvent<ApiType, []>;
    };
    indices: {
      /**
       * A account index was assigned.
       **/
      IndexAssigned: AugmentedEvent<ApiType, [who: AccountId32, index: u64], { who: AccountId32, index: u64 }>;
      /**
       * A account index has been freed up (unassigned).
       **/
      IndexFreed: AugmentedEvent<ApiType, [index: u64], { index: u64 }>;
      /**
       * A account index has been frozen to its current account ID.
       **/
      IndexFrozen: AugmentedEvent<ApiType, [index: u64, who: AccountId32], { index: u64, who: AccountId32 }>;
    };
    proxy: {
      /**
       * An announcement was placed to make a call in the future.
       **/
      Announced: AugmentedEvent<ApiType, [real: AccountId32, proxy: AccountId32, callHash: H256], { real: AccountId32, proxy: AccountId32, callHash: H256 }>;
      /**
       * Anonymous account has been created by new proxy with given
       * disambiguation index and proxy type.
       **/
      AnonymousCreated: AugmentedEvent<ApiType, [anonymous: AccountId32, who: AccountId32, proxyType: MashnetNodeRuntimeProxyType, disambiguationIndex: u16], { anonymous: AccountId32, who: AccountId32, proxyType: MashnetNodeRuntimeProxyType, disambiguationIndex: u16 }>;
      /**
       * A proxy was added.
       **/
      ProxyAdded: AugmentedEvent<ApiType, [delegator: AccountId32, delegatee: AccountId32, proxyType: MashnetNodeRuntimeProxyType, delay: u64], { delegator: AccountId32, delegatee: AccountId32, proxyType: MashnetNodeRuntimeProxyType, delay: u64 }>;
      /**
       * A proxy was executed correctly, with the given.
       **/
      ProxyExecuted: AugmentedEvent<ApiType, [result: Result<Null, SpRuntimeDispatchError>], { result: Result<Null, SpRuntimeDispatchError> }>;
      /**
       * A proxy was removed.
       **/
      ProxyRemoved: AugmentedEvent<ApiType, [delegator: AccountId32, delegatee: AccountId32, proxyType: MashnetNodeRuntimeProxyType, delay: u64], { delegator: AccountId32, delegatee: AccountId32, proxyType: MashnetNodeRuntimeProxyType, delay: u64 }>;
    };
    publicCredentials: {
      /**
       * A public credentials has been removed.
       **/
      CredentialRemoved: AugmentedEvent<ApiType, [subjectId: RuntimeCommonAssetsAssetDid, credentialId: H256], { subjectId: RuntimeCommonAssetsAssetDid, credentialId: H256 }>;
      /**
       * A public credential has been revoked.
       **/
      CredentialRevoked: AugmentedEvent<ApiType, [credentialId: H256], { credentialId: H256 }>;
      /**
       * A new public credential has been issued.
       **/
      CredentialStored: AugmentedEvent<ApiType, [subjectId: RuntimeCommonAssetsAssetDid, credentialId: H256], { subjectId: RuntimeCommonAssetsAssetDid, credentialId: H256 }>;
      /**
       * A public credential has been unrevoked.
       **/
      CredentialUnrevoked: AugmentedEvent<ApiType, [credentialId: H256], { credentialId: H256 }>;
    };
    session: {
      /**
       * New session has happened. Note that the argument is the session index, not the
       * block number as the type might suggest.
       **/
      NewSession: AugmentedEvent<ApiType, [sessionIndex: u32], { sessionIndex: u32 }>;
    };
    sudo: {
      /**
       * The \[sudoer\] just switched identity; the old key is supplied if one existed.
       **/
      KeyChanged: AugmentedEvent<ApiType, [oldSudoer: Option<AccountId32>], { oldSudoer: Option<AccountId32> }>;
      /**
       * A sudo just took place. \[result\]
       **/
      Sudid: AugmentedEvent<ApiType, [sudoResult: Result<Null, SpRuntimeDispatchError>], { sudoResult: Result<Null, SpRuntimeDispatchError> }>;
      /**
       * A sudo just took place. \[result\]
       **/
      SudoAsDone: AugmentedEvent<ApiType, [sudoResult: Result<Null, SpRuntimeDispatchError>], { sudoResult: Result<Null, SpRuntimeDispatchError> }>;
    };
    system: {
      /**
       * `:code` was updated.
       **/
      CodeUpdated: AugmentedEvent<ApiType, []>;
      /**
       * An extrinsic failed.
       **/
      ExtrinsicFailed: AugmentedEvent<ApiType, [dispatchError: SpRuntimeDispatchError, dispatchInfo: FrameSupportWeightsDispatchInfo], { dispatchError: SpRuntimeDispatchError, dispatchInfo: FrameSupportWeightsDispatchInfo }>;
      /**
       * An extrinsic completed successfully.
       **/
      ExtrinsicSuccess: AugmentedEvent<ApiType, [dispatchInfo: FrameSupportWeightsDispatchInfo], { dispatchInfo: FrameSupportWeightsDispatchInfo }>;
      /**
       * An account was reaped.
       **/
      KilledAccount: AugmentedEvent<ApiType, [account: AccountId32], { account: AccountId32 }>;
      /**
       * A new account was created.
       **/
      NewAccount: AugmentedEvent<ApiType, [account: AccountId32], { account: AccountId32 }>;
      /**
       * On on-chain remark happened.
       **/
      Remarked: AugmentedEvent<ApiType, [sender: AccountId32, hash_: H256], { sender: AccountId32, hash_: H256 }>;
    };
    transactionPayment: {
      /**
       * A transaction fee `actual_fee`, of which `tip` was added to the minimum inclusion fee,
       * has been paid by `who`.
       **/
      TransactionFeePaid: AugmentedEvent<ApiType, [who: AccountId32, actualFee: u128, tip: u128], { who: AccountId32, actualFee: u128, tip: u128 }>;
    };
    utility: {
      /**
       * Batch of dispatches completed fully with no error.
       **/
      BatchCompleted: AugmentedEvent<ApiType, []>;
      /**
       * Batch of dispatches completed but has errors.
       **/
      BatchCompletedWithErrors: AugmentedEvent<ApiType, []>;
      /**
       * Batch of dispatches did not complete fully. Index of first failing dispatch given, as
       * well as the error.
       **/
      BatchInterrupted: AugmentedEvent<ApiType, [index: u32, error: SpRuntimeDispatchError], { index: u32, error: SpRuntimeDispatchError }>;
      /**
       * A call was dispatched.
       **/
      DispatchedAs: AugmentedEvent<ApiType, [result: Result<Null, SpRuntimeDispatchError>], { result: Result<Null, SpRuntimeDispatchError> }>;
      /**
       * A single item within a Batch of dispatches has completed with no error.
       **/
      ItemCompleted: AugmentedEvent<ApiType, []>;
      /**
       * A single item within a Batch of dispatches has completed with error.
       **/
      ItemFailed: AugmentedEvent<ApiType, [error: SpRuntimeDispatchError], { error: SpRuntimeDispatchError }>;
    };
    web3Names: {
      /**
       * A name has been banned.
       **/
      Web3NameBanned: AugmentedEvent<ApiType, [name: Bytes], { name: Bytes }>;
      /**
       * A new name has been claimed.
       **/
      Web3NameClaimed: AugmentedEvent<ApiType, [owner: AccountId32, name: Bytes], { owner: AccountId32, name: Bytes }>;
      /**
       * A name has been released.
       **/
      Web3NameReleased: AugmentedEvent<ApiType, [owner: AccountId32, name: Bytes], { owner: AccountId32, name: Bytes }>;
      /**
       * A name has been unbanned.
       **/
      Web3NameUnbanned: AugmentedEvent<ApiType, [name: Bytes], { name: Bytes }>;
    };
  } // AugmentedEvents
} // declare module
