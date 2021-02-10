// Auto-generated via `yarn polkadot-types-from-chain`, do not edit
/* eslint-disable */

import type { Bytes, Option, u64 } from '@polkadot/types';
import type { DelegationNodeId, ErrorCode, Permissions } from '@kiltprotocol/types/chainTypes/Kilt';
import type { BalanceStatus } from '@polkadot/types/interfaces/balances';
import type { AuthorityList } from '@polkadot/types/interfaces/grandpa';
import type { AccountId, AccountIndex, Balance, Hash } from '@polkadot/types/interfaces/runtime';
import type { SessionIndex } from '@polkadot/types/interfaces/session';
import type { DispatchError, DispatchInfo, DispatchResult } from '@polkadot/types/interfaces/system';
import type { ApiTypes } from '@polkadot/api/types';

declare module '@polkadot/api/types/events' {
  export interface AugmentedEvents<ApiType> {
    attestation: {
      [key: string]: AugmentedEvent<ApiType>;
      /**
       * An attestation has been added
       **/
      AttestationCreated: AugmentedEvent<ApiType, [AccountId, Hash, Hash, Option<DelegationNodeId>]>;
      /**
       * An attestation has been revoked
       **/
      AttestationRevoked: AugmentedEvent<ApiType, [AccountId, Hash]>;
    };
    balances: {
      [key: string]: AugmentedEvent<ApiType>;
      /**
       * A balance was set by root. \[who, free, reserved\]
       **/
      BalanceSet: AugmentedEvent<ApiType, [AccountId, Balance, Balance]>;
      /**
       * Some amount was deposited (e.g. for transaction fees). \[who, deposit\]
       **/
      Deposit: AugmentedEvent<ApiType, [AccountId, Balance]>;
      /**
       * An account was removed whose balance was non-zero but below ExistentialDeposit,
       * resulting in an outright loss. \[account, balance\]
       **/
      DustLost: AugmentedEvent<ApiType, [AccountId, Balance]>;
      /**
       * An account was created with some free balance. \[account, free_balance\]
       **/
      Endowed: AugmentedEvent<ApiType, [AccountId, Balance]>;
      /**
       * Some balance was reserved (moved from free to reserved). \[who, value\]
       **/
      Reserved: AugmentedEvent<ApiType, [AccountId, Balance]>;
      /**
       * Some balance was moved from the reserve of the first account to the second account.
       * Final argument indicates the destination balance type.
       * \[from, to, balance, destination_status\]
       **/
      ReserveRepatriated: AugmentedEvent<ApiType, [AccountId, AccountId, Balance, BalanceStatus]>;
      /**
       * Transfer succeeded. \[from, to, value\]
       **/
      Transfer: AugmentedEvent<ApiType, [AccountId, AccountId, Balance]>;
      /**
       * Some balance was unreserved (moved from reserved to free). \[who, value\]
       **/
      Unreserved: AugmentedEvent<ApiType, [AccountId, Balance]>;
    };
    ctype: {
      [key: string]: AugmentedEvent<ApiType>;
      /**
       * A CTYPE has been added
       **/
      CTypeCreated: AugmentedEvent<ApiType, [AccountId, Hash]>;
    };
    delegation: {
      [key: string]: AugmentedEvent<ApiType>;
      /**
       * A new delegation has been created
       **/
      DelegationCreated: AugmentedEvent<ApiType, [AccountId, DelegationNodeId, DelegationNodeId, Option<DelegationNodeId>, AccountId, Permissions]>;
      /**
       * A delegation has been revoked
       **/
      DelegationRevoked: AugmentedEvent<ApiType, [AccountId, DelegationNodeId]>;
      /**
       * A new root has been created
       **/
      RootCreated: AugmentedEvent<ApiType, [AccountId, DelegationNodeId, Hash]>;
      /**
       * A root has been revoked
       **/
      RootRevoked: AugmentedEvent<ApiType, [AccountId, DelegationNodeId]>;
    };
    did: {
      [key: string]: AugmentedEvent<ApiType>;
      /**
       * A did has been created
       **/
      DidCreated: AugmentedEvent<ApiType, [AccountId]>;
      /**
       * A did has been removed
       **/
      DidRemoved: AugmentedEvent<ApiType, [AccountId]>;
    };
    error: {
      [key: string]: AugmentedEvent<ApiType>;
      ErrorOccurred: AugmentedEvent<ApiType, [ErrorCode]>;
    };
    grandpa: {
      [key: string]: AugmentedEvent<ApiType>;
      /**
       * New authority set has been applied. \[authority_set\]
       **/
      NewAuthorities: AugmentedEvent<ApiType, [AuthorityList]>;
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
      [key: string]: AugmentedEvent<ApiType>;
      /**
       * A account index was assigned. \[index, who\]
       **/
      IndexAssigned: AugmentedEvent<ApiType, [AccountId, AccountIndex]>;
      /**
       * A account index has been freed up (unassigned). \[index\]
       **/
      IndexFreed: AugmentedEvent<ApiType, [AccountIndex]>;
      /**
       * A account index has been frozen to its current account ID. \[index, who\]
       **/
      IndexFrozen: AugmentedEvent<ApiType, [AccountIndex, AccountId]>;
    };
    portablegabi: {
      [key: string]: AugmentedEvent<ApiType>;
      /**
       * An accumulator has been updated. Therefore an attestation has be revoked
       **/
      Updated: AugmentedEvent<ApiType, [AccountId, u64, Bytes]>;
    };
    session: {
      [key: string]: AugmentedEvent<ApiType>;
      /**
       * New session has happened. Note that the argument is the \[session_index\], not the block
       * number as the type might suggest.
       **/
      NewSession: AugmentedEvent<ApiType, [SessionIndex]>;
    };
    sudo: {
      [key: string]: AugmentedEvent<ApiType>;
      /**
       * The \[sudoer\] just switched identity; the old key is supplied.
       **/
      KeyChanged: AugmentedEvent<ApiType, [AccountId]>;
      /**
       * A sudo just took place. \[result\]
       **/
      Sudid: AugmentedEvent<ApiType, [DispatchResult]>;
      /**
       * A sudo just took place. \[result\]
       **/
      SudoAsDone: AugmentedEvent<ApiType, [DispatchResult]>;
    };
    system: {
      [key: string]: AugmentedEvent<ApiType>;
      /**
       * `:code` was updated.
       **/
      CodeUpdated: AugmentedEvent<ApiType, []>;
      /**
       * An extrinsic failed. \[error, info\]
       **/
      ExtrinsicFailed: AugmentedEvent<ApiType, [DispatchError, DispatchInfo]>;
      /**
       * An extrinsic completed successfully. \[info\]
       **/
      ExtrinsicSuccess: AugmentedEvent<ApiType, [DispatchInfo]>;
      /**
       * An \[account\] was reaped.
       **/
      KilledAccount: AugmentedEvent<ApiType, [AccountId]>;
      /**
       * A new \[account\] was created.
       **/
      NewAccount: AugmentedEvent<ApiType, [AccountId]>;
    };
  }

  export interface DecoratedEvents<ApiType extends ApiTypes> extends AugmentedEvents<ApiType> {
    [key: string]: ModuleEvents<ApiType>;
  }
}
