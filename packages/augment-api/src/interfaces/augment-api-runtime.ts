// Auto-generated via `yarn polkadot-types-from-chain`, do not edit
/* eslint-disable */

// import type lookup before we augment - in some environments
// this is required to allow for ambient/previous definitions
import '@polkadot/api-base/types/calls';

import type { RawDidLinkedInfo } from '@kiltprotocol/augment-api/extraDefs';
import type { ApiTypes, AugmentedCall, DecoratedCallBase } from '@polkadot/api-base/types';
import type { Bytes, Null, Option, Text, Vec, u32 } from '@polkadot/types-codec';
import type { AnyNumber, ITuple } from '@polkadot/types-codec/types';
import type { OpaqueKeyOwnershipProof } from '@polkadot/types/interfaces/babe';
import type { CheckInherentsResult, InherentData } from '@polkadot/types/interfaces/blockbuilder';
import type { BlockHash } from '@polkadot/types/interfaces/chain';
import type { AuthorityId } from '@polkadot/types/interfaces/consensus';
import type { Extrinsic } from '@polkadot/types/interfaces/extrinsics';
import type { AuthorityList, GrandpaEquivocationProof, SetId } from '@polkadot/types/interfaces/grandpa';
import type { OpaqueMetadata } from '@polkadot/types/interfaces/metadata';
import type { FeeDetails, RuntimeDispatchInfo } from '@polkadot/types/interfaces/payment';
import type { AccountId, AccountId32, Block, Hash, Header, Index, KeyTypeId, SlotDuration } from '@polkadot/types/interfaces/runtime';
import type { RuntimeVersion } from '@polkadot/types/interfaces/state';
import type { ApplyExtrinsicResult } from '@polkadot/types/interfaces/system';
import type { TransactionSource, TransactionValidity } from '@polkadot/types/interfaces/txqueue';
import type { PalletDidLookupLinkableAccountLinkableAccountId, PublicCredentialsCredentialsCredentialEntry, RuntimeCommonAssetsAssetDid } from '@polkadot/types/lookup';
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
    /** 0xa02708c798d60bce/1 */
    didApi: {
      /**
       * Return the information relative to the owner of the provided DID, if present.
       **/
      queryDid: AugmentedCall<ApiType, (did: AccountId32 | string | Uint8Array) => Observable<Option<RawDidLinkedInfo>>>;
      /**
       * Return the information relative to the DID to which the provided account is linked, if any.
       **/
      queryDidByAccountId: AugmentedCall<ApiType, (name: PalletDidLookupLinkableAccountLinkableAccountId | { AccountId20: any } | { AccountId32: any } | string | Uint8Array) => Observable<Option<RawDidLinkedInfo>>>;
      /**
       * Return the information relative to the owner of the provided web3name, if any.
       **/
      queryDidByW3n: AugmentedCall<ApiType, (name: Text | string) => Observable<Option<RawDidLinkedInfo>>>;
    };
    /** 0xed99c5acb25eedf5/3 */
    grandpaApi: {
      /**
       * Get current GRANDPA authority set id.
       **/
      currentSetId: AugmentedCall<ApiType, () => Observable<SetId>>;
      /**
       * Generates a proof of key ownership for the given authority in the given set.
       **/
      generateKeyOwnershipProof: AugmentedCall<ApiType, (setId: SetId | AnyNumber | Uint8Array, authorityId: AuthorityId | string | Uint8Array) => Observable<Option<OpaqueKeyOwnershipProof>>>;
      /**
       * Get the current GRANDPA authorities and weights. This should not change except for when changes are scheduled and the corresponding delay has passed.
       **/
      grandpaAuthorities: AugmentedCall<ApiType, () => Observable<AuthorityList>>;
      /**
       * Submits an unsigned extrinsic to report an equivocation.
       **/
      submitReportEquivocationUnsignedExtrinsic: AugmentedCall<ApiType, (equivocationProof: GrandpaEquivocationProof | { setId?: any; equivocation?: any } | string | Uint8Array, keyOwnerProof: OpaqueKeyOwnershipProof | string | Uint8Array) => Observable<Option<Null>>>;
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
    /** 0xd0ec702fbb0122f3/1 */
    publicCredentialsApi: {
      /**
       * Return the credential details for the provided credential ID, if found.
       **/
      getCredential: AugmentedCall<ApiType, (credentialId: Hash | string | Uint8Array) => Observable<Option<PublicCredentialsCredentialsCredentialEntry>>>;
      /**
       * Return all the credentials issued to the provided subject, optionally filtering with the provided logic.
       **/
      getCredentials: AugmentedCall<ApiType, (subject: RuntimeCommonAssetsAssetDid | { chainId?: any; assetId?: any } | string | Uint8Array) => Observable<Vec<ITuple<[Hash, PublicCredentialsCredentialsCredentialEntry]>>>>;
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
    /** 0xd2bc9897eed08f15/3 */
    taggedTransactionQueue: {
      /**
       * Validate the transaction.
       **/
      validateTransaction: AugmentedCall<ApiType, (source: TransactionSource | 'InBlock' | 'Local' | 'External' | number | Uint8Array, tx: Extrinsic | IExtrinsic | string | Uint8Array, blockHash: BlockHash | string | Uint8Array) => Observable<TransactionValidity>>;
    };
    /** 0x37c8bb1350a9a2a8/1 */
    transactionPaymentApi: {
      /**
       * The transaction fee details
       **/
      queryFeeDetails: AugmentedCall<ApiType, (uxt: Extrinsic | IExtrinsic | string | Uint8Array, len: u32 | AnyNumber | Uint8Array) => Observable<FeeDetails>>;
      /**
       * The transaction info
       **/
      queryInfo: AugmentedCall<ApiType, (uxt: Extrinsic | IExtrinsic | string | Uint8Array, len: u32 | AnyNumber | Uint8Array) => Observable<RuntimeDispatchInfo>>;
    };
  } // AugmentedCalls
} // declare module
