// Auto-generated via `yarn polkadot-types-from-chain`, do not edit
/* eslint-disable */

// import type lookup before we augment - in some environments
// this is required to allow for ambient/previous definitions
import '@polkadot/api-base/types/calls';

import type { DidApiAccountId, PublicCredentialError, PublicCredentialFilter, RawDidLinkedInfo, StakingRates } from '@kiltprotocol/augment-api/extraDefs';
import type { ApiTypes, AugmentedCall, DecoratedCallBase } from '@polkadot/api-base/types';
import type { Bytes, Null, Option, Result, Text, Vec, u32 } from '@polkadot/types-codec';
import type { AnyNumber, IMethod, ITuple } from '@polkadot/types-codec/types';
import type { CheckInherentsResult, InherentData } from '@polkadot/types/interfaces/blockbuilder';
import type { BlockHash } from '@polkadot/types/interfaces/chain';
import type { AuthorityId } from '@polkadot/types/interfaces/consensus';
import type { CollationInfo } from '@polkadot/types/interfaces/cumulus';
import type { Extrinsic } from '@polkadot/types/interfaces/extrinsics';
import type { OpaqueMetadata } from '@polkadot/types/interfaces/metadata';
import type { FeeDetails, RuntimeDispatchInfo } from '@polkadot/types/interfaces/payment';
import type { AccountId, AccountId32, Balance, Block, Call, Hash, Header, Index, KeyTypeId, SlotDuration, Weight } from '@polkadot/types/interfaces/runtime';
import type { RuntimeVersion } from '@polkadot/types/interfaces/state';
import type { ApplyExtrinsicResult } from '@polkadot/types/interfaces/system';
import type { TransactionSource, TransactionValidity } from '@polkadot/types/interfaces/txqueue';
import type { PublicCredentialsCredentialsCredentialEntry } from '@polkadot/types/lookup';
import type { IExtrinsic, Observable } from '@polkadot/types/types';

export type __AugmentedCall<ApiType extends ApiTypes> = AugmentedCall<ApiType>;
export type __DecoratedCallBase<ApiType extends ApiTypes> = DecoratedCallBase<ApiType>;

declare module '@polkadot/api-base/types/calls' {
  interface AugmentedCalls<ApiType extends ApiTypes> {
    /** 0xbc9d89904f5b923f/1 */
    accountNonceApi: {
      /**
       * The API to query account nonce (aka transaction index)
       **/
      accountNonce: AugmentedCall<ApiType, (accountId: AccountId | string | Uint8Array) => Observable<Index>>;
    };
    /** 0xdd718d5cc53262d4/1 */
    auraApi: {
      /**
       * Return the current set of authorities.
       **/
      authorities: AugmentedCall<ApiType, () => Observable<Vec<AuthorityId>>>;
      /**
       * Returns the slot duration for Aura.
       **/
      slotDuration: AugmentedCall<ApiType, () => Observable<SlotDuration>>;
    };
    /** 0x40fe3ad401f8959a/6 */
    blockBuilder: {
      /**
       * Apply the given extrinsic.
       **/
      applyExtrinsic: AugmentedCall<ApiType, (extrinsic: Extrinsic | IExtrinsic | string | Uint8Array) => Observable<ApplyExtrinsicResult>>;
      /**
       * Check that the inherents are valid.
       **/
      checkInherents: AugmentedCall<ApiType, (block: Block | { header?: any; extrinsics?: any } | string | Uint8Array, data: InherentData | { data?: any } | string | Uint8Array) => Observable<CheckInherentsResult>>;
      /**
       * Finish the current block.
       **/
      finalizeBlock: AugmentedCall<ApiType, () => Observable<Header>>;
      /**
       * Generate inherent extrinsics.
       **/
      inherentExtrinsics: AugmentedCall<ApiType, (inherent: InherentData | { data?: any } | string | Uint8Array) => Observable<Vec<Extrinsic>>>;
    };
    /** 0xea93e3f16f3d6962/2 */
    collectCollationInfo: {
      /**
       * Collect information about a collation.
       **/
      collectCollationInfo: AugmentedCall<ApiType, (header: Header | { parentHash?: any; number?: any; stateRoot?: any; extrinsicsRoot?: any; digest?: any } | string | Uint8Array) => Observable<CollationInfo>>;
    };
    /** 0xdf6acb689907609b/4 */
    core: {
      /**
       * Execute the given block.
       **/
      executeBlock: AugmentedCall<ApiType, (block: Block | { header?: any; extrinsics?: any } | string | Uint8Array) => Observable<Null>>;
      /**
       * Initialize a block with the given header.
       **/
      initializeBlock: AugmentedCall<ApiType, (header: Header | { parentHash?: any; number?: any; stateRoot?: any; extrinsicsRoot?: any; digest?: any } | string | Uint8Array) => Observable<Null>>;
      /**
       * Returns the version of the runtime.
       **/
      version: AugmentedCall<ApiType, () => Observable<RuntimeVersion>>;
    };
    /** 0x26609555c0656603/2 */
    did: {
      /**
       * Return the information relative to the owner of the provided DID, if present.
       **/
      query: AugmentedCall<ApiType, (did: AccountId32 | string | Uint8Array) => Observable<Option<RawDidLinkedInfo>>>;
      /**
       * Return the information relative to the DID to which the provided account is linked, if any.
       **/
      queryByAccount: AugmentedCall<ApiType, (account: DidApiAccountId | { AccountId20: any } | { AccountId32: any } | string | Uint8Array) => Observable<Option<RawDidLinkedInfo>>>;
      /**
       * Return the information relative to the owner of the provided web3name, if any.
       **/
      queryByWeb3Name: AugmentedCall<ApiType, (name: Text | string) => Observable<Option<RawDidLinkedInfo>>>;
    };
    /** 0x37e397fc7c91f5e4/1 */
    metadata: {
      /**
       * Returns the metadata of a runtime
       **/
      metadata: AugmentedCall<ApiType, () => Observable<OpaqueMetadata>>;
    };
    /** 0xf78b278be53f454c/2 */
    offchainWorkerApi: {
      /**
       * Starts the off-chain task for given block header.
       **/
      offchainWorker: AugmentedCall<ApiType, (header: Header | { parentHash?: any; number?: any; stateRoot?: any; extrinsicsRoot?: any; digest?: any } | string | Uint8Array) => Observable<Null>>;
    };
    /** 0xa47b7d544994c99b/1 */
    publicCredentials: {
      /**
       * Return the public credential with the specified ID, if found.
       **/
      getById: AugmentedCall<ApiType, (credential_id: Hash | string | Uint8Array) => Observable<Option<PublicCredentialsCredentialsCredentialEntry>>>;
      /**
       * Return all the public credentials linked to the specified subject.
                An optional filter can be passed to be applied to the result before being returned to the client.
                It returns an error if the provided specified subject ID is not valid.
       **/
      getBySubject: AugmentedCall<ApiType, (subject: Text | string, filter: Option<PublicCredentialFilter> | null | Uint8Array | PublicCredentialFilter | { ctypeHash: any } | { attester: any } | string) => Observable<Result<Vec<ITuple<[Hash, PublicCredentialsCredentialsCredentialEntry]>>, PublicCredentialError>>>;
    };
    /** 0xab3c0572291feb8b/1 */
    sessionKeys: {
      /**
       * Decode the given public session keys.
       **/
      decodeSessionKeys: AugmentedCall<ApiType, (encoded: Bytes | string | Uint8Array) => Observable<Option<Vec<ITuple<[Bytes, KeyTypeId]>>>>>;
      /**
       * Generate a set of session keys with optionally using the given seed.
       **/
      generateSessionKeys: AugmentedCall<ApiType, (seed: Option<Bytes> | null | Uint8Array | Bytes | string) => Observable<Bytes>>;
    };
    /** 0x45bfba51a310b223/1 */
    staking: {
      /**
       * Calculate the current staking and reward rates for collators and delegators
       **/
      getStakingRates: AugmentedCall<ApiType, () => Observable<StakingRates>>;
      /**
       * Calculate the claimable staking rewards for a given account address
       **/
      getUnclaimedStakingRewards: AugmentedCall<ApiType, (account: AccountId32 | string | Uint8Array) => Observable<Balance>>;
    };
    /** 0xd2bc9897eed08f15/3 */
    taggedTransactionQueue: {
      /**
       * Validate the transaction.
       **/
      validateTransaction: AugmentedCall<ApiType, (source: TransactionSource | 'InBlock' | 'Local' | 'External' | number | Uint8Array, tx: Extrinsic | IExtrinsic | string | Uint8Array, blockHash: BlockHash | string | Uint8Array) => Observable<TransactionValidity>>;
    };
    /** 0x37c8bb1350a9a2a8/3 */
    transactionPaymentApi: {
      /**
       * The transaction fee details
       **/
      queryFeeDetails: AugmentedCall<ApiType, (uxt: Extrinsic | IExtrinsic | string | Uint8Array, len: u32 | AnyNumber | Uint8Array) => Observable<FeeDetails>>;
      /**
       * The transaction info
       **/
      queryInfo: AugmentedCall<ApiType, (uxt: Extrinsic | IExtrinsic | string | Uint8Array, len: u32 | AnyNumber | Uint8Array) => Observable<RuntimeDispatchInfo>>;
      /**
       * Query the output of the current LengthToFee given some input
       **/
      queryLengthToFee: AugmentedCall<ApiType, (length: u32 | AnyNumber | Uint8Array) => Observable<Balance>>;
      /**
       * Query the output of the current WeightToFee given some input
       **/
      queryWeightToFee: AugmentedCall<ApiType, (weight: Weight | { refTime?: any; proofSize?: any } | string | Uint8Array) => Observable<Balance>>;
    };
    /** 0xf3ff14d5ab527059/3 */
    transactionPaymentCallApi: {
      /**
       * The call fee details
       **/
      queryCallFeeDetails: AugmentedCall<ApiType, (call: Call | IMethod | string | Uint8Array, len: u32 | AnyNumber | Uint8Array) => Observable<FeeDetails>>;
      /**
       * The call info
       **/
      queryCallInfo: AugmentedCall<ApiType, (call: Call | IMethod | string | Uint8Array, len: u32 | AnyNumber | Uint8Array) => Observable<RuntimeDispatchInfo>>;
      /**
       * Query the output of the current LengthToFee given some input
       **/
      queryLengthToFee: AugmentedCall<ApiType, (length: u32 | AnyNumber | Uint8Array) => Observable<Balance>>;
      /**
       * Query the output of the current WeightToFee given some input
       **/
      queryWeightToFee: AugmentedCall<ApiType, (weight: Weight | { refTime?: any; proofSize?: any } | string | Uint8Array) => Observable<Balance>>;
    };
  } // AugmentedCalls
} // declare module
