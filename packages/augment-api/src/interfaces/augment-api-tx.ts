// Auto-generated via `yarn polkadot-types-from-chain`, do not edit
/* eslint-disable */

// import type lookup before we augment - in some environments
// this is required to allow for ambient/previous definitions
import '@polkadot/api-base/types/submittable';

import type { ApiTypes, AugmentedSubmittable, SubmittableExtrinsic, SubmittableExtrinsicFunction } from '@polkadot/api-base/types';
import type { Bytes, Compact, Option, U8aFixed, Vec, bool, u128, u16, u32, u64, u8 } from '@polkadot/types-codec';
import type { AnyNumber, IMethod, ITuple } from '@polkadot/types-codec/types';
import type { AccountId32, Call, H256, MultiAddress, Perquintill } from '@polkadot/types/interfaces/runtime';
import type { CumulusPrimitivesParachainInherentParachainInherentData, DelegationDelegationHierarchyPermissions, DidDidDetailsDidAuthorizedCallOperation, DidDidDetailsDidCreationDetails, DidDidDetailsDidEncryptionKey, DidDidDetailsDidSignature, DidDidDetailsDidVerificationKey, DidServiceEndpointsDidEndpoint, FrameSupportPreimagesBounded, PalletDemocracyConviction, PalletDemocracyMetadataOwner, PalletDemocracyVoteAccountVote, PalletDidLookupAssociateAccountRequest, PalletDidLookupLinkableAccountLinkableAccountId, PalletMultisigTimepoint, PalletVestingVestingInfo, PublicCredentialsCredentialsCredential, RuntimeCommonAuthorizationPalletAuthorize, SpWeightsWeightV2Weight, SpiritnetRuntimeOriginCaller, SpiritnetRuntimeProxyType, SpiritnetRuntimeSessionKeys, XcmV3MultiLocation, XcmV3WeightLimit, XcmVersionedMultiAssets, XcmVersionedMultiLocation, XcmVersionedXcm } from '@polkadot/types/lookup';

export type __AugmentedSubmittable = AugmentedSubmittable<() => unknown>;
export type __SubmittableExtrinsic<ApiType extends ApiTypes> = SubmittableExtrinsic<ApiType>;
export type __SubmittableExtrinsicFunction<ApiType extends ApiTypes> = SubmittableExtrinsicFunction<ApiType>;

declare module '@polkadot/api-base/types/submittable' {
  interface AugmentedSubmittables<ApiType extends ApiTypes> {
    attestation: {
      /**
       * Create a new attestation.
       * 
       * The attester can optionally provide a reference to an existing
       * delegation that will be saved along with the attestation itself in
       * the form of an attested delegation.
       * 
       * The referenced CType hash must already be present on chain.
       * 
       * If an optional delegation id is provided, the dispatch origin must
       * be the owner of the delegation. Otherwise, it could be any
       * `DelegationEntityId`.
       * 
       * Emits `AttestationCreated`.
       * 
       * # <weight>
       * Weight: O(1)
       * - Reads: [Origin Account], Ctype, Attestations
       * - Reads if delegation id is provided: Delegations, Roots,
       * DelegatedAttestations
       * - Writes: Attestations, (DelegatedAttestations)
       * # </weight>
       **/
      add: AugmentedSubmittable<(claimHash: H256 | string | Uint8Array, ctypeHash: H256 | string | Uint8Array, authorization: Option<RuntimeCommonAuthorizationPalletAuthorize> | null | Uint8Array | RuntimeCommonAuthorizationPalletAuthorize | { Delegation: any } | string) => SubmittableExtrinsic<ApiType>, [H256, H256, Option<RuntimeCommonAuthorizationPalletAuthorize>]>;
      /**
       * Changes the deposit owner.
       * 
       * The balance that is reserved by the current deposit owner will be
       * freed and balance of the new deposit owner will get reserved.
       * 
       * The subject of the call must be the attester who issues the
       * attestation. The sender of the call will be the new deposit owner.
       **/
      changeDepositOwner: AugmentedSubmittable<(claimHash: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256]>;
      /**
       * Reclaim a storage deposit by removing an attestation
       * 
       * Emits `DepositReclaimed`.
       * 
       * # <weight>
       * Weight: O(1)
       * - Reads: [Origin Account], Attestations, DelegatedAttestations
       * - Writes: Attestations, DelegatedAttestations
       * # </weight>
       **/
      reclaimDeposit: AugmentedSubmittable<(claimHash: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256]>;
      /**
       * Remove an attestation.
       * 
       * The origin must be either the creator of the attestation or an
       * entity which is an ancestor of the attester in the delegation tree,
       * i.e., it was either the delegator of the attester or an ancestor
       * thereof.
       * 
       * Emits `AttestationRemoved`.
       * 
       * # <weight>
       * Weight: O(P) where P is the number of steps required to verify that
       * the dispatch Origin controls the delegation entitled to revoke the
       * attestation. It is bounded by `max_parent_checks`.
       * - Reads: [Origin Account], Attestations, delegation::Roots
       * - Reads per delegation step P: delegation::Delegations
       * - Writes: Attestations, DelegatedAttestations
       * # </weight>
       **/
      remove: AugmentedSubmittable<(claimHash: H256 | string | Uint8Array, authorization: Option<RuntimeCommonAuthorizationPalletAuthorize> | null | Uint8Array | RuntimeCommonAuthorizationPalletAuthorize | { Delegation: any } | string) => SubmittableExtrinsic<ApiType>, [H256, Option<RuntimeCommonAuthorizationPalletAuthorize>]>;
      /**
       * Revoke an existing attestation.
       * 
       * The revoker must be either the creator of the attestation being
       * revoked or an entity that in the delegation tree is an ancestor of
       * the attester, i.e., it was either the delegator of the attester or
       * an ancestor thereof.
       * 
       * Emits `AttestationRevoked`.
       * 
       * # <weight>
       * Weight: O(P) where P is the number of steps required to verify that
       * the dispatch Origin controls the delegation entitled to revoke the
       * attestation. It is bounded by `max_parent_checks`.
       * - Reads: [Origin Account], Attestations, delegation::Roots
       * - Reads per delegation step P: delegation::Delegations
       * - Writes: Attestations, DelegatedAttestations
       * # </weight>
       **/
      revoke: AugmentedSubmittable<(claimHash: H256 | string | Uint8Array, authorization: Option<RuntimeCommonAuthorizationPalletAuthorize> | null | Uint8Array | RuntimeCommonAuthorizationPalletAuthorize | { Delegation: any } | string) => SubmittableExtrinsic<ApiType>, [H256, Option<RuntimeCommonAuthorizationPalletAuthorize>]>;
      /**
       * Updates the deposit amount to the current deposit rate.
       * 
       * The sender must be the deposit owner.
       **/
      updateDeposit: AugmentedSubmittable<(claimHash: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256]>;
    };
    balances: {
      /**
       * Exactly as `transfer`, except the origin must be root and the source account may be
       * specified.
       * ## Complexity
       * - Same as transfer, but additional read and write because the source account is not
       * assumed to be in the overlay.
       **/
      forceTransfer: AugmentedSubmittable<(source: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, dest: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, value: Compact<u128> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, MultiAddress, Compact<u128>]>;
      /**
       * Unreserve some balance from a user by force.
       * 
       * Can only be called by ROOT.
       **/
      forceUnreserve: AugmentedSubmittable<(who: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, amount: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, u128]>;
      /**
       * Set the balances of a given account.
       * 
       * This will alter `FreeBalance` and `ReservedBalance` in storage. it will
       * also alter the total issuance of the system (`TotalIssuance`) appropriately.
       * If the new free or reserved balance is below the existential deposit,
       * it will reset the account nonce (`frame_system::AccountNonce`).
       * 
       * The dispatch origin for this call is `root`.
       **/
      setBalance: AugmentedSubmittable<(who: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, newFree: Compact<u128> | AnyNumber | Uint8Array, newReserved: Compact<u128> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, Compact<u128>, Compact<u128>]>;
      /**
       * Transfer some liquid free balance to another account.
       * 
       * `transfer` will set the `FreeBalance` of the sender and receiver.
       * If the sender's account is below the existential deposit as a result
       * of the transfer, the account will be reaped.
       * 
       * The dispatch origin for this call must be `Signed` by the transactor.
       * 
       * ## Complexity
       * - Dependent on arguments but not critical, given proper implementations for input config
       * types. See related functions below.
       * - It contains a limited number of reads and writes internally and no complex
       * computation.
       * 
       * Related functions:
       * 
       * - `ensure_can_withdraw` is always called internally but has a bounded complexity.
       * - Transferring balances to accounts that did not exist before will cause
       * `T::OnNewAccount::on_new_account` to be called.
       * - Removing enough funds from an account will trigger `T::DustRemoval::on_unbalanced`.
       * - `transfer_keep_alive` works the same way as `transfer`, but has an additional check
       * that the transfer will not kill the origin account.
       **/
      transfer: AugmentedSubmittable<(dest: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, value: Compact<u128> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, Compact<u128>]>;
      /**
       * Transfer the entire transferable balance from the caller account.
       * 
       * NOTE: This function only attempts to transfer _transferable_ balances. This means that
       * any locked, reserved, or existential deposits (when `keep_alive` is `true`), will not be
       * transferred by this function. To ensure that this function results in a killed account,
       * you might need to prepare the account by removing any reference counters, storage
       * deposits, etc...
       * 
       * The dispatch origin of this call must be Signed.
       * 
       * - `dest`: The recipient of the transfer.
       * - `keep_alive`: A boolean to determine if the `transfer_all` operation should send all
       * of the funds the account has, causing the sender account to be killed (false), or
       * transfer everything except at least the existential deposit, which will guarantee to
       * keep the sender account alive (true). ## Complexity
       * - O(1). Just like transfer, but reading the user's transferable balance first.
       **/
      transferAll: AugmentedSubmittable<(dest: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, keepAlive: bool | boolean | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, bool]>;
      /**
       * Same as the [`transfer`] call, but with a check that the transfer will not kill the
       * origin account.
       * 
       * 99% of the time you want [`transfer`] instead.
       * 
       * [`transfer`]: struct.Pallet.html#method.transfer
       **/
      transferKeepAlive: AugmentedSubmittable<(dest: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, value: Compact<u128> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, Compact<u128>]>;
    };
    council: {
      /**
       * Close a vote that is either approved, disapproved or whose voting period has ended.
       * 
       * May be called by any signed account in order to finish voting and close the proposal.
       * 
       * If called before the end of the voting period it will only close the vote if it is
       * has enough votes to be approved or disapproved.
       * 
       * If called after the end of the voting period abstentions are counted as rejections
       * unless there is a prime member set and the prime member cast an approval.
       * 
       * If the close operation completes successfully with disapproval, the transaction fee will
       * be waived. Otherwise execution of the approved operation will be charged to the caller.
       * 
       * + `proposal_weight_bound`: The maximum amount of weight consumed by executing the closed
       * proposal.
       * + `length_bound`: The upper bound for the length of the proposal in storage. Checked via
       * `storage::read` so it is `size_of::<u32>() == 4` larger than the pure length.
       * 
       * ## Complexity
       * - `O(B + M + P1 + P2)` where:
       * - `B` is `proposal` size in bytes (length-fee-bounded)
       * - `M` is members-count (code- and governance-bounded)
       * - `P1` is the complexity of `proposal` preimage.
       * - `P2` is proposal-count (code-bounded)
       **/
      close: AugmentedSubmittable<(proposalHash: H256 | string | Uint8Array, index: Compact<u32> | AnyNumber | Uint8Array, proposalWeightBound: SpWeightsWeightV2Weight | { refTime?: any; proofSize?: any } | string | Uint8Array, lengthBound: Compact<u32> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256, Compact<u32>, SpWeightsWeightV2Weight, Compact<u32>]>;
      /**
       * Close a vote that is either approved, disapproved or whose voting period has ended.
       * 
       * May be called by any signed account in order to finish voting and close the proposal.
       * 
       * If called before the end of the voting period it will only close the vote if it is
       * has enough votes to be approved or disapproved.
       * 
       * If called after the end of the voting period abstentions are counted as rejections
       * unless there is a prime member set and the prime member cast an approval.
       * 
       * If the close operation completes successfully with disapproval, the transaction fee will
       * be waived. Otherwise execution of the approved operation will be charged to the caller.
       * 
       * + `proposal_weight_bound`: The maximum amount of weight consumed by executing the closed
       * proposal.
       * + `length_bound`: The upper bound for the length of the proposal in storage. Checked via
       * `storage::read` so it is `size_of::<u32>() == 4` larger than the pure length.
       * 
       * ## Complexity
       * - `O(B + M + P1 + P2)` where:
       * - `B` is `proposal` size in bytes (length-fee-bounded)
       * - `M` is members-count (code- and governance-bounded)
       * - `P1` is the complexity of `proposal` preimage.
       * - `P2` is proposal-count (code-bounded)
       **/
      closeOldWeight: AugmentedSubmittable<(proposalHash: H256 | string | Uint8Array, index: Compact<u32> | AnyNumber | Uint8Array, proposalWeightBound: Compact<u64> | AnyNumber | Uint8Array, lengthBound: Compact<u32> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256, Compact<u32>, Compact<u64>, Compact<u32>]>;
      /**
       * Disapprove a proposal, close, and remove it from the system, regardless of its current
       * state.
       * 
       * Must be called by the Root origin.
       * 
       * Parameters:
       * * `proposal_hash`: The hash of the proposal that should be disapproved.
       * 
       * ## Complexity
       * O(P) where P is the number of max proposals
       **/
      disapproveProposal: AugmentedSubmittable<(proposalHash: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256]>;
      /**
       * Dispatch a proposal from a member using the `Member` origin.
       * 
       * Origin must be a member of the collective.
       * 
       * ## Complexity:
       * - `O(B + M + P)` where:
       * - `B` is `proposal` size in bytes (length-fee-bounded)
       * - `M` members-count (code-bounded)
       * - `P` complexity of dispatching `proposal`
       **/
      execute: AugmentedSubmittable<(proposal: Call | IMethod | string | Uint8Array, lengthBound: Compact<u32> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [Call, Compact<u32>]>;
      /**
       * Add a new proposal to either be voted on or executed directly.
       * 
       * Requires the sender to be member.
       * 
       * `threshold` determines whether `proposal` is executed directly (`threshold < 2`)
       * or put up for voting.
       * 
       * ## Complexity
       * - `O(B + M + P1)` or `O(B + M + P2)` where:
       * - `B` is `proposal` size in bytes (length-fee-bounded)
       * - `M` is members-count (code- and governance-bounded)
       * - branching is influenced by `threshold` where:
       * - `P1` is proposal execution complexity (`threshold < 2`)
       * - `P2` is proposals-count (code-bounded) (`threshold >= 2`)
       **/
      propose: AugmentedSubmittable<(threshold: Compact<u32> | AnyNumber | Uint8Array, proposal: Call | IMethod | string | Uint8Array, lengthBound: Compact<u32> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [Compact<u32>, Call, Compact<u32>]>;
      /**
       * Set the collective's membership.
       * 
       * - `new_members`: The new member list. Be nice to the chain and provide it sorted.
       * - `prime`: The prime member whose vote sets the default.
       * - `old_count`: The upper bound for the previous number of members in storage. Used for
       * weight estimation.
       * 
       * The dispatch of this call must be `SetMembersOrigin`.
       * 
       * NOTE: Does not enforce the expected `MaxMembers` limit on the amount of members, but
       * the weight estimations rely on it to estimate dispatchable weight.
       * 
       * # WARNING:
       * 
       * The `pallet-collective` can also be managed by logic outside of the pallet through the
       * implementation of the trait [`ChangeMembers`].
       * Any call to `set_members` must be careful that the member set doesn't get out of sync
       * with other logic managing the member set.
       * 
       * ## Complexity:
       * - `O(MP + N)` where:
       * - `M` old-members-count (code- and governance-bounded)
       * - `N` new-members-count (code- and governance-bounded)
       * - `P` proposals-count (code-bounded)
       **/
      setMembers: AugmentedSubmittable<(newMembers: Vec<AccountId32> | (AccountId32 | string | Uint8Array)[], prime: Option<AccountId32> | null | Uint8Array | AccountId32 | string, oldCount: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [Vec<AccountId32>, Option<AccountId32>, u32]>;
      /**
       * Add an aye or nay vote for the sender to the given proposal.
       * 
       * Requires the sender to be a member.
       * 
       * Transaction fees will be waived if the member is voting on any particular proposal
       * for the first time and the call is successful. Subsequent vote changes will charge a
       * fee.
       * ## Complexity
       * - `O(M)` where `M` is members-count (code- and governance-bounded)
       **/
      vote: AugmentedSubmittable<(proposal: H256 | string | Uint8Array, index: Compact<u32> | AnyNumber | Uint8Array, approve: bool | boolean | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256, Compact<u32>, bool]>;
    };
    ctype: {
      /**
       * Create a new CType from the given unique CType hash and associates
       * it with its creator.
       * 
       * A CType with the same hash must not be stored on chain.
       * 
       * Emits `CTypeCreated`.
       * 
       * # <weight>
       * Weight: O(1)
       * - Reads: Ctypes, Balance
       * - Writes: Ctypes, Balance
       * # </weight>
       **/
      add: AugmentedSubmittable<(ctype: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Bytes]>;
      /**
       * Set the creation block number for a given CType, if found.
       * 
       * Emits `CTypeUpdated`.
       **/
      setBlockNumber: AugmentedSubmittable<(ctypeHash: H256 | string | Uint8Array, blockNumber: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256, u64]>;
    };
    delegation: {
      /**
       * Create a new delegation node.
       * 
       * The new delegation node represents a new trust hierarchy that
       * considers the new node as its root. The owner of this node has full
       * control over any of its direct and indirect descendants.
       * 
       * For the creation to succeed, the delegatee must provide a valid
       * signature over the (blake256) hash of the creation operation details
       * which include (in order) delegation id, root node id, parent id, and
       * permissions of the new node.
       * 
       * There must be no delegation with the same id stored on chain.
       * Furthermore, the referenced root and parent nodes must already be
       * present on chain and contain the valid permissions and revocation
       * status (i.e., not revoked).
       * 
       * The dispatch origin must be split into
       * * a submitter of type `AccountId` who is responsible for paying the
       * transaction fee and
       * * a DID subject of type `DelegationEntityId` who creates, owns and
       * can revoke the delegation.
       * 
       * Requires the sender of the transaction to have a reservable balance
       * of at least `Deposit` many tokens.
       * 
       * Emits `DelegationCreated`.
       * 
       * # <weight>
       * Weight: O(1)
       * - Reads: [Origin Account], Roots, Delegations
       * - Writes: Delegations
       * # </weight>
       **/
      addDelegation: AugmentedSubmittable<(delegationId: H256 | string | Uint8Array, parentId: H256 | string | Uint8Array, delegate: AccountId32 | string | Uint8Array, permissions: DelegationDelegationHierarchyPermissions | { bits?: any } | string | Uint8Array, delegateSignature: DidDidDetailsDidSignature | { ed25519: any } | { sr25519: any } | { ecdsa: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256, H256, AccountId32, DelegationDelegationHierarchyPermissions, DidDidDetailsDidSignature]>;
      /**
       * Changes the deposit owner.
       * 
       * The balance that is reserved by the current deposit owner will be
       * freed and balance of the new deposit owner will get reserved.
       * 
       * The subject of the call must be the owner of the delegation node.
       * The sender of the call will be the new deposit owner.
       **/
      changeDepositOwner: AugmentedSubmittable<(delegationId: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256]>;
      /**
       * Create a new delegation root associated with a given CType hash.
       * 
       * The new root will allow a new trust hierarchy to be created by
       * adding children delegations to the root.
       * 
       * There must be no delegation with the same ID stored on chain, while
       * there must be already a CType with the given hash stored in the
       * CType pallet.
       * 
       * The dispatch origin must be split into
       * * a submitter of type `AccountId` who is responsible for paying the
       * transaction fee and
       * * a DID subject of type `DelegationEntityId` who creates, owns and
       * can revoke the delegation.
       * 
       * Requires the sender of the transaction to have a reservable balance
       * of at least `Deposit` many tokens.
       * 
       * Emits `RootCreated`.
       * 
       * # <weight>
       * Weight: O(1)
       * - Reads: [Origin Account], Roots, CTypes
       * - Writes: Roots
       * # </weight>
       **/
      createHierarchy: AugmentedSubmittable<(rootNodeId: H256 | string | Uint8Array, ctypeHash: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256, H256]>;
      /**
       * Reclaim the deposit for a delegation node (potentially a root
       * node), removing the node and all its children.
       * 
       * Returns the delegation deposit to the deposit owner for each
       * removed DelegationNode by unreserving it.
       * 
       * Removing a delegation node results in the trust hierarchy starting
       * from the given node being removed. Nevertheless, removal starts
       * from the leave nodes upwards, so if the operation ends prematurely
       * because it runs out of gas, the delegation state would be consistent
       * as no child would "survive" its parent. As a consequence, if the
       * given node is removed, the trust hierarchy with the node as root is
       * to be considered removed.
       * 
       * The dispatch origin must be signed by the delegation deposit owner.
       * 
       * `DepositReclaimed`.
       * 
       * # <weight>
       * Weight: O(C) where C is the number of children of the delegation
       * node which is bounded by `max_removals`.
       * - Reads: [Origin Account], Roots, C * Delegations, C * Children.
       * - Writes: Roots, 2 * C * Delegations
       * # </weight>
       **/
      reclaimDeposit: AugmentedSubmittable<(delegationId: H256 | string | Uint8Array, maxRemovals: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256, u32]>;
      /**
       * Remove a delegation node (potentially a root node) and all its
       * children.
       * 
       * Returns the delegation deposit to the deposit owner for each
       * removed DelegationNode by unreserving it.
       * 
       * Removing a delegation node results in the trust hierarchy starting
       * from the given node being removed. Nevertheless, removal starts
       * from the leave nodes upwards, so if the operation ends prematurely
       * because it runs out of gas, the delegation state would be consistent
       * as no child would "survive" its parent. As a consequence, if the
       * given node is removed, the trust hierarchy with the node as root is
       * to be considered removed.
       * 
       * The dispatch origin must be split into
       * * a submitter of type `AccountId` who is responsible for paying the
       * transaction fee and
       * * a DID subject of type `DelegationEntityId` who creates, owns and
       * can revoke the delegation.
       * 
       * Emits C * `DelegationRemoved`.
       * 
       * # <weight>
       * Weight: O(C) where C is the number of children of the delegation
       * node which is bounded by `max_children`.
       * - Reads: [Origin Account], Roots, C * Delegations, C * Children.
       * - Writes: Roots, 2 * C * Delegations
       * # </weight>
       **/
      removeDelegation: AugmentedSubmittable<(delegationId: H256 | string | Uint8Array, maxRemovals: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256, u32]>;
      /**
       * Revoke a delegation node (potentially a root node) and all its
       * children.
       * 
       * Does not refund the delegation back to the deposit owner as the
       * node is still stored on chain. Requires to additionally call
       * `remove_delegation` to unreserve the deposit.
       * 
       * Revoking a delegation node results in the trust hierarchy starting
       * from the given node being revoked. Nevertheless, revocation starts
       * from the leave nodes upwards, so if the operation ends prematurely
       * because it runs out of gas, the delegation state would be consistent
       * as no child would "survive" its parent. As a consequence, if the
       * given node is revoked, the trust hierarchy with the node as root is
       * to be considered revoked.
       * 
       * The dispatch origin must be split into
       * * a submitter of type `AccountId` who is responsible for paying the
       * transaction fee and
       * * a DID subject of type `DelegationEntityId` who creates, owns and
       * can revoke the delegation.
       * 
       * Emits C * `DelegationRevoked`.
       * 
       * # <weight>
       * Weight: O(C) where C is the number of children of the delegation
       * node which is bounded by `max_children`.
       * - Reads: [Origin Account], Roots, C * Delegations, C * Children.
       * - Writes: Roots, C * Delegations
       * # </weight>
       **/
      revokeDelegation: AugmentedSubmittable<(delegationId: H256 | string | Uint8Array, maxParentChecks: u32 | AnyNumber | Uint8Array, maxRevocations: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256, u32, u32]>;
      /**
       * Updates the deposit amount to the current deposit rate.
       * 
       * The sender must be the deposit owner.
       **/
      updateDeposit: AugmentedSubmittable<(delegationId: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256]>;
    };
    democracy: {
      /**
       * Permanently place a proposal into the blacklist. This prevents it from ever being
       * proposed again.
       * 
       * If called on a queued public or external proposal, then this will result in it being
       * removed. If the `ref_index` supplied is an active referendum with the proposal hash,
       * then it will be cancelled.
       * 
       * The dispatch origin of this call must be `BlacklistOrigin`.
       * 
       * - `proposal_hash`: The proposal hash to blacklist permanently.
       * - `ref_index`: An ongoing referendum whose hash is `proposal_hash`, which will be
       * cancelled.
       * 
       * Weight: `O(p)` (though as this is an high-privilege dispatch, we assume it has a
       * reasonable value).
       **/
      blacklist: AugmentedSubmittable<(proposalHash: H256 | string | Uint8Array, maybeRefIndex: Option<u32> | null | Uint8Array | u32 | AnyNumber) => SubmittableExtrinsic<ApiType>, [H256, Option<u32>]>;
      /**
       * Remove a proposal.
       * 
       * The dispatch origin of this call must be `CancelProposalOrigin`.
       * 
       * - `prop_index`: The index of the proposal to cancel.
       * 
       * Weight: `O(p)` where `p = PublicProps::<T>::decode_len()`
       **/
      cancelProposal: AugmentedSubmittable<(propIndex: Compact<u32> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [Compact<u32>]>;
      /**
       * Remove a referendum.
       * 
       * The dispatch origin of this call must be _Root_.
       * 
       * - `ref_index`: The index of the referendum to cancel.
       * 
       * # Weight: `O(1)`.
       **/
      cancelReferendum: AugmentedSubmittable<(refIndex: Compact<u32> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [Compact<u32>]>;
      /**
       * Clears all public proposals.
       * 
       * The dispatch origin of this call must be _Root_.
       * 
       * Weight: `O(1)`.
       **/
      clearPublicProposals: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Delegate the voting power (with some given conviction) of the sending account.
       * 
       * The balance delegated is locked for as long as it's delegated, and thereafter for the
       * time appropriate for the conviction's lock period.
       * 
       * The dispatch origin of this call must be _Signed_, and the signing account must either:
       * - be delegating already; or
       * - have no voting activity (if there is, then it will need to be removed/consolidated
       * through `reap_vote` or `unvote`).
       * 
       * - `to`: The account whose voting the `target` account's voting power will follow.
       * - `conviction`: The conviction that will be attached to the delegated votes. When the
       * account is undelegated, the funds will be locked for the corresponding period.
       * - `balance`: The amount of the account's balance to be used in delegating. This must not
       * be more than the account's current balance.
       * 
       * Emits `Delegated`.
       * 
       * Weight: `O(R)` where R is the number of referendums the voter delegating to has
       * voted on. Weight is charged as if maximum votes.
       **/
      delegate: AugmentedSubmittable<(to: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, conviction: PalletDemocracyConviction | 'None' | 'Locked1x' | 'Locked2x' | 'Locked3x' | 'Locked4x' | 'Locked5x' | 'Locked6x' | number | Uint8Array, balance: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, PalletDemocracyConviction, u128]>;
      /**
       * Schedule an emergency cancellation of a referendum. Cannot happen twice to the same
       * referendum.
       * 
       * The dispatch origin of this call must be `CancellationOrigin`.
       * 
       * -`ref_index`: The index of the referendum to cancel.
       * 
       * Weight: `O(1)`.
       **/
      emergencyCancel: AugmentedSubmittable<(refIndex: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32]>;
      /**
       * Schedule a referendum to be tabled once it is legal to schedule an external
       * referendum.
       * 
       * The dispatch origin of this call must be `ExternalOrigin`.
       * 
       * - `proposal_hash`: The preimage hash of the proposal.
       **/
      externalPropose: AugmentedSubmittable<(proposal: FrameSupportPreimagesBounded | { Legacy: any } | { Inline: any } | { Lookup: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [FrameSupportPreimagesBounded]>;
      /**
       * Schedule a negative-turnout-bias referendum to be tabled next once it is legal to
       * schedule an external referendum.
       * 
       * The dispatch of this call must be `ExternalDefaultOrigin`.
       * 
       * - `proposal_hash`: The preimage hash of the proposal.
       * 
       * Unlike `external_propose`, blacklisting has no effect on this and it may replace a
       * pre-scheduled `external_propose` call.
       * 
       * Weight: `O(1)`
       **/
      externalProposeDefault: AugmentedSubmittable<(proposal: FrameSupportPreimagesBounded | { Legacy: any } | { Inline: any } | { Lookup: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [FrameSupportPreimagesBounded]>;
      /**
       * Schedule a majority-carries referendum to be tabled next once it is legal to schedule
       * an external referendum.
       * 
       * The dispatch of this call must be `ExternalMajorityOrigin`.
       * 
       * - `proposal_hash`: The preimage hash of the proposal.
       * 
       * Unlike `external_propose`, blacklisting has no effect on this and it may replace a
       * pre-scheduled `external_propose` call.
       * 
       * Weight: `O(1)`
       **/
      externalProposeMajority: AugmentedSubmittable<(proposal: FrameSupportPreimagesBounded | { Legacy: any } | { Inline: any } | { Lookup: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [FrameSupportPreimagesBounded]>;
      /**
       * Schedule the currently externally-proposed majority-carries referendum to be tabled
       * immediately. If there is no externally-proposed referendum currently, or if there is one
       * but it is not a majority-carries referendum then it fails.
       * 
       * The dispatch of this call must be `FastTrackOrigin`.
       * 
       * - `proposal_hash`: The hash of the current external proposal.
       * - `voting_period`: The period that is allowed for voting on this proposal. Increased to
       * Must be always greater than zero.
       * For `FastTrackOrigin` must be equal or greater than `FastTrackVotingPeriod`.
       * - `delay`: The number of block after voting has ended in approval and this should be
       * enacted. This doesn't have a minimum amount.
       * 
       * Emits `Started`.
       * 
       * Weight: `O(1)`
       **/
      fastTrack: AugmentedSubmittable<(proposalHash: H256 | string | Uint8Array, votingPeriod: u64 | AnyNumber | Uint8Array, delay: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256, u64, u64]>;
      /**
       * Propose a sensitive action to be taken.
       * 
       * The dispatch origin of this call must be _Signed_ and the sender must
       * have funds to cover the deposit.
       * 
       * - `proposal_hash`: The hash of the proposal preimage.
       * - `value`: The amount of deposit (must be at least `MinimumDeposit`).
       * 
       * Emits `Proposed`.
       **/
      propose: AugmentedSubmittable<(proposal: FrameSupportPreimagesBounded | { Legacy: any } | { Inline: any } | { Lookup: any } | string | Uint8Array, value: Compact<u128> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [FrameSupportPreimagesBounded, Compact<u128>]>;
      /**
       * Remove a vote for a referendum.
       * 
       * If the `target` is equal to the signer, then this function is exactly equivalent to
       * `remove_vote`. If not equal to the signer, then the vote must have expired,
       * either because the referendum was cancelled, because the voter lost the referendum or
       * because the conviction period is over.
       * 
       * The dispatch origin of this call must be _Signed_.
       * 
       * - `target`: The account of the vote to be removed; this account must have voted for
       * referendum `index`.
       * - `index`: The index of referendum of the vote to be removed.
       * 
       * Weight: `O(R + log R)` where R is the number of referenda that `target` has voted on.
       * Weight is calculated for the maximum number of vote.
       **/
      removeOtherVote: AugmentedSubmittable<(target: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, index: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, u32]>;
      /**
       * Remove a vote for a referendum.
       * 
       * If:
       * - the referendum was cancelled, or
       * - the referendum is ongoing, or
       * - the referendum has ended such that
       * - the vote of the account was in opposition to the result; or
       * - there was no conviction to the account's vote; or
       * - the account made a split vote
       * ...then the vote is removed cleanly and a following call to `unlock` may result in more
       * funds being available.
       * 
       * If, however, the referendum has ended and:
       * - it finished corresponding to the vote of the account, and
       * - the account made a standard vote with conviction, and
       * - the lock period of the conviction is not over
       * ...then the lock will be aggregated into the overall account's lock, which may involve
       * *overlocking* (where the two locks are combined into a single lock that is the maximum
       * of both the amount locked and the time is it locked for).
       * 
       * The dispatch origin of this call must be _Signed_, and the signer must have a vote
       * registered for referendum `index`.
       * 
       * - `index`: The index of referendum of the vote to be removed.
       * 
       * Weight: `O(R + log R)` where R is the number of referenda that `target` has voted on.
       * Weight is calculated for the maximum number of vote.
       **/
      removeVote: AugmentedSubmittable<(index: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32]>;
      /**
       * Signals agreement with a particular proposal.
       * 
       * The dispatch origin of this call must be _Signed_ and the sender
       * must have funds to cover the deposit, equal to the original deposit.
       * 
       * - `proposal`: The index of the proposal to second.
       **/
      second: AugmentedSubmittable<(proposal: Compact<u32> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [Compact<u32>]>;
      /**
       * Set or clear a metadata of a proposal or a referendum.
       * 
       * Parameters:
       * - `origin`: Must correspond to the `MetadataOwner`.
       * - `ExternalOrigin` for an external proposal with the `SuperMajorityApprove`
       * threshold.
       * - `ExternalDefaultOrigin` for an external proposal with the `SuperMajorityAgainst`
       * threshold.
       * - `ExternalMajorityOrigin` for an external proposal with the `SimpleMajority`
       * threshold.
       * - `Signed` by a creator for a public proposal.
       * - `Signed` to clear a metadata for a finished referendum.
       * - `Root` to set a metadata for an ongoing referendum.
       * - `owner`: an identifier of a metadata owner.
       * - `maybe_hash`: The hash of an on-chain stored preimage. `None` to clear a metadata.
       **/
      setMetadata: AugmentedSubmittable<(owner: PalletDemocracyMetadataOwner | { External: any } | { Proposal: any } | { Referendum: any } | string | Uint8Array, maybeHash: Option<H256> | null | Uint8Array | H256 | string) => SubmittableExtrinsic<ApiType>, [PalletDemocracyMetadataOwner, Option<H256>]>;
      /**
       * Undelegate the voting power of the sending account.
       * 
       * Tokens may be unlocked following once an amount of time consistent with the lock period
       * of the conviction with which the delegation was issued.
       * 
       * The dispatch origin of this call must be _Signed_ and the signing account must be
       * currently delegating.
       * 
       * Emits `Undelegated`.
       * 
       * Weight: `O(R)` where R is the number of referendums the voter delegating to has
       * voted on. Weight is charged as if maximum votes.
       **/
      undelegate: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Unlock tokens that have an expired lock.
       * 
       * The dispatch origin of this call must be _Signed_.
       * 
       * - `target`: The account to remove the lock on.
       * 
       * Weight: `O(R)` with R number of vote of target.
       **/
      unlock: AugmentedSubmittable<(target: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress]>;
      /**
       * Veto and blacklist the external proposal hash.
       * 
       * The dispatch origin of this call must be `VetoOrigin`.
       * 
       * - `proposal_hash`: The preimage hash of the proposal to veto and blacklist.
       * 
       * Emits `Vetoed`.
       * 
       * Weight: `O(V + log(V))` where V is number of `existing vetoers`
       **/
      vetoExternal: AugmentedSubmittable<(proposalHash: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256]>;
      /**
       * Vote in a referendum. If `vote.is_aye()`, the vote is to enact the proposal;
       * otherwise it is a vote to keep the status quo.
       * 
       * The dispatch origin of this call must be _Signed_.
       * 
       * - `ref_index`: The index of the referendum to vote for.
       * - `vote`: The vote configuration.
       **/
      vote: AugmentedSubmittable<(refIndex: Compact<u32> | AnyNumber | Uint8Array, vote: PalletDemocracyVoteAccountVote | { Standard: any } | { Split: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Compact<u32>, PalletDemocracyVoteAccountVote]>;
    };
    did: {
      /**
       * Add a single new key agreement key to the DID.
       * 
       * The new key is added to the set of public keys.
       * 
       * The dispatch origin must be a DID origin proxied via the
       * `submit_did_call` extrinsic.
       * 
       * Emits `DidUpdated`.
       * 
       * # <weight>
       * Weight: O(1)
       * - Reads: [Origin Account], Did
       * - Writes: Did
       * # </weight>
       **/
      addKeyAgreementKey: AugmentedSubmittable<(newKey: DidDidDetailsDidEncryptionKey | { x25519: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [DidDidDetailsDidEncryptionKey]>;
      /**
       * Add a new service endpoint under the given DID.
       * 
       * The dispatch origin must be a DID origin proxied via the
       * `submit_did_call` extrinsic.
       * 
       * Emits `DidUpdated`.
       * 
       * # <weight>
       * Weight: O(1)
       * - Reads: [Origin Account], Did, ServiceEndpoints, DidEndpointsCount
       * - Writes: Did, ServiceEndpoints, DidEndpointsCount
       * # </weight>
       **/
      addServiceEndpoint: AugmentedSubmittable<(serviceEndpoint: DidServiceEndpointsDidEndpoint | { id?: any; serviceTypes?: any; urls?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [DidServiceEndpointsDidEndpoint]>;
      /**
       * Changes the deposit owner.
       * 
       * The balance that is reserved by the current deposit owner will be
       * freed and balance of the new deposit owner will get reserved.
       * 
       * The subject of the call must be the did owner.
       * The sender of the call will be the new deposit owner.
       **/
      changeDepositOwner: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Store a new DID on chain, after verifying that the creation
       * operation has been signed by the KILT account associated with the
       * identifier of the DID being created and that a DID with the same
       * identifier has not previously existed on (and then deleted from) the
       * chain.
       * 
       * There must be no DID information stored on chain under the same DID
       * identifier.
       * 
       * The new keys added with this operation are stored under the DID
       * identifier along with the block number in which the operation was
       * executed.
       * 
       * The dispatch origin can be any KILT account with enough funds to
       * execute the extrinsic and it does not have to be tied in any way to
       * the KILT account identifying the DID subject.
       * 
       * Emits `DidCreated`.
       * 
       * # <weight>
       * - The transaction's complexity is mainly dependent on the number of
       * new key agreement keys and the number of new service endpoints
       * included in the operation.
       * ---------
       * Weight: O(K) + O(N) where K is the number of new key agreement
       * keys bounded by `MaxNewKeyAgreementKeys`, while N is the number of
       * new service endpoints bounded by `MaxNumberOfServicesPerDid`.
       * - Reads: [Origin Account], Did, DidBlacklist
       * - Writes: Did (with K new key agreement keys), ServiceEndpoints
       * (with N new service endpoints), DidEndpointsCount
       * # </weight>
       **/
      create: AugmentedSubmittable<(details: DidDidDetailsDidCreationDetails | { did?: any; submitter?: any; newKeyAgreementKeys?: any; newAttestationKey?: any; newDelegationKey?: any; newServiceDetails?: any } | string | Uint8Array, signature: DidDidDetailsDidSignature | { ed25519: any } | { sr25519: any } | { ecdsa: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [DidDidDetailsDidCreationDetails, DidDidDetailsDidSignature]>;
      /**
       * Delete a DID from the chain and all information associated with it,
       * after verifying that the delete operation has been signed by the DID
       * subject using the authentication key currently stored on chain.
       * 
       * The referenced DID identifier must be present on chain before the
       * delete operation is evaluated.
       * 
       * After it is deleted, a DID with the same identifier cannot be
       * re-created ever again.
       * 
       * As the result of the deletion, all traces of the DID are removed
       * from the storage, which results in the invalidation of all
       * attestations issued by the DID subject.
       * 
       * The dispatch origin must be a DID origin proxied via the
       * `submit_did_call` extrinsic.
       * 
       * Emits `DidDeleted`.
       * 
       * # <weight>
       * Weight: O(1)
       * - Reads: [Origin Account], Did
       * - Kills: Did entry associated to the DID identifier
       * # </weight>
       **/
      delete: AugmentedSubmittable<(endpointsToRemove: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32]>;
      /**
       * Reclaim a deposit for a DID. This will delete the DID and all
       * information associated with it, after verifying that the caller is
       * the owner of the deposit.
       * 
       * The referenced DID identifier must be present on chain before the
       * delete operation is evaluated.
       * 
       * After it is deleted, a DID with the same identifier cannot be
       * re-created ever again.
       * 
       * As the result of the deletion, all traces of the DID are removed
       * from the storage, which results in the invalidation of all
       * attestations issued by the DID subject.
       * 
       * Emits `DidDeleted`.
       * 
       * # <weight>
       * Weight: O(1)
       * - Reads: [Origin Account], Did
       * - Kills: Did entry associated to the DID identifier
       * # </weight>
       **/
      reclaimDeposit: AugmentedSubmittable<(didSubject: AccountId32 | string | Uint8Array, endpointsToRemove: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [AccountId32, u32]>;
      /**
       * Remove the DID attestation key.
       * 
       * The old key is deleted from the set of public keys if
       * it is not used in any other part of the DID.
       * 
       * The dispatch origin must be a DID origin proxied via the
       * `submit_did_call` extrinsic.
       * 
       * Emits `DidUpdated`.
       * 
       * # <weight>
       * Weight: O(1)
       * - Reads: [Origin Account], Did
       * - Writes: Did
       * # </weight>
       **/
      removeAttestationKey: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Remove the DID delegation key.
       * 
       * The old key is deleted from the set of public keys if
       * it is not used in any other part of the DID.
       * 
       * The dispatch origin must be a DID origin proxied via the
       * `submit_did_call` extrinsic.
       * 
       * Emits `DidUpdated`.
       * 
       * # <weight>
       * Weight: O(1)
       * - Reads: [Origin Account], Did
       * - Writes: Did
       * # </weight>
       **/
      removeDelegationKey: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Remove a DID key agreement key from both its set of key agreement
       * keys and as well as its public keys.
       * 
       * The dispatch origin must be a DID origin proxied via the
       * `submit_did_call` extrinsic.
       * 
       * Emits `DidUpdated`.
       * 
       * # <weight>
       * Weight: O(1)
       * - Reads: [Origin Account], Did
       * - Writes: Did
       * # </weight>
       **/
      removeKeyAgreementKey: AugmentedSubmittable<(keyId: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256]>;
      /**
       * Remove the service with the provided ID from the DID.
       * 
       * The dispatch origin must be a DID origin proxied via the
       * `submit_did_call` extrinsic.
       * 
       * Emits `DidUpdated`.
       * 
       * # <weight>
       * Weight: O(1)
       * - Reads: [Origin Account], ServiceEndpoints, DidEndpointsCount
       * - Writes: Did, ServiceEndpoints, DidEndpointsCount
       * # </weight>
       **/
      removeServiceEndpoint: AugmentedSubmittable<(serviceId: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Bytes]>;
      /**
       * Set or update the DID attestation key.
       * 
       * If an old key existed, it is deleted from the set of public keys if
       * it is not used in any other part of the DID. The new key is added to
       * the set of public keys.
       * 
       * The dispatch origin must be a DID origin proxied via the
       * `submit_did_call` extrinsic.
       * 
       * Emits `DidUpdated`.
       * 
       * # <weight>
       * Weight: O(1)
       * - Reads: [Origin Account], Did
       * - Writes: Did
       * # </weight>
       **/
      setAttestationKey: AugmentedSubmittable<(newKey: DidDidDetailsDidVerificationKey | { ed25519: any } | { sr25519: any } | { ecdsa: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [DidDidDetailsDidVerificationKey]>;
      /**
       * Update the DID authentication key.
       * 
       * The old key is deleted from the set of public keys if it is
       * not used in any other part of the DID. The new key is added to the
       * set of public keys.
       * 
       * The dispatch origin must be a DID origin proxied via the
       * `submit_did_call` extrinsic.
       * 
       * Emits `DidUpdated`.
       * 
       * # <weight>
       * Weight: O(1)
       * - Reads: [Origin Account], Did
       * - Writes: Did
       * # </weight>
       **/
      setAuthenticationKey: AugmentedSubmittable<(newKey: DidDidDetailsDidVerificationKey | { ed25519: any } | { sr25519: any } | { ecdsa: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [DidDidDetailsDidVerificationKey]>;
      /**
       * Set or update the DID delegation key.
       * 
       * If an old key existed, it is deleted from the set of public keys if
       * it is not used in any other part of the DID. The new key is added to
       * the set of public keys.
       * 
       * The dispatch origin must be a DID origin proxied via the
       * `submit_did_call` extrinsic.
       * 
       * Emits `DidUpdated`.
       * 
       * # <weight>
       * Weight: O(1)
       * - Reads: [Origin Account], Did
       * - Writes: Did
       * # </weight>
       **/
      setDelegationKey: AugmentedSubmittable<(newKey: DidDidDetailsDidVerificationKey | { ed25519: any } | { sr25519: any } | { ecdsa: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [DidDidDetailsDidVerificationKey]>;
      /**
       * Proxy a dispatchable call of another runtime extrinsic that
       * supports a DID origin.
       * 
       * The referenced DID identifier must be present on chain before the
       * operation is dispatched.
       * 
       * A call submitted through this extrinsic must be signed with the
       * right DID key, depending on the call. This information is provided
       * by the `DidAuthorizedCallOperation` parameter, which specifies the
       * DID subject acting as the origin of the call, the DID's tx counter
       * (nonce), the dispatchable to call in case signature verification
       * succeeds, the type of DID key to use to verify the operation
       * signature, and the block number the operation was targeting for
       * inclusion, when it was created and signed.
       * 
       * In case the signature is incorrect, the nonce is not valid, the
       * required key is not present for the specified DID, or the block
       * specified is too old the verification fails and the call is not
       * dispatched. Otherwise, the call is properly dispatched with a
       * `DidOrigin` origin indicating the DID subject.
       * 
       * A successful dispatch operation results in the tx counter associated
       * with the given DID to be incremented, to mitigate replay attacks.
       * 
       * The dispatch origin can be any KILT account with enough funds to
       * execute the extrinsic and it does not have to be tied in any way to
       * the KILT account identifying the DID subject.
       * 
       * Emits `DidCallDispatched`.
       * 
       * # <weight>
       * Weight: O(1) + weight of the dispatched call
       * - Reads: [Origin Account], Did
       * - Writes: Did
       * # </weight>
       **/
      submitDidCall: AugmentedSubmittable<(didCall: DidDidDetailsDidAuthorizedCallOperation | { did?: any; txCounter?: any; call?: any; blockNumber?: any; submitter?: any } | string | Uint8Array, signature: DidDidDetailsDidSignature | { ed25519: any } | { sr25519: any } | { ecdsa: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [DidDidDetailsDidAuthorizedCallOperation, DidDidDetailsDidSignature]>;
      /**
       * Updates the deposit amount to the current deposit rate.
       * 
       * The sender must be the deposit owner.
       **/
      updateDeposit: AugmentedSubmittable<(did: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [AccountId32]>;
    };
    didLookup: {
      /**
       * Associate the given account to the DID that authorized this call.
       * 
       * The account has to sign the DID and a blocknumber after which the
       * signature expires in order to authorize the association.
       * 
       * The signature will be checked against the scale encoded tuple of the
       * method specific id of the did identifier and the block number after
       * which the signature should be regarded invalid.
       * 
       * Emits `AssociationEstablished` and, optionally, `AssociationRemoved`
       * if there was a previous association for the account.
       * 
       * # <weight>
       * Weight: O(1)
       * - Reads: ConnectedDids + ConnectedAccounts + DID Origin Check
       * - Writes: ConnectedDids + ConnectedAccounts
       * # </weight>
       **/
      associateAccount: AugmentedSubmittable<(req: PalletDidLookupAssociateAccountRequest | { Polkadot: any } | { Ethereum: any } | string | Uint8Array, expiration: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [PalletDidLookupAssociateAccountRequest, u64]>;
      /**
       * Associate the sender of the call to the DID that authorized this
       * call.
       * 
       * Emits `AssociationEstablished` and, optionally, `AssociationRemoved`
       * if there was a previous association for the account.
       * 
       * # <weight>
       * Weight: O(1)
       * - Reads: ConnectedDids + ConnectedAccounts + DID Origin Check
       * - Writes: ConnectedDids + ConnectedAccounts
       * # </weight>
       **/
      associateSender: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Changes the deposit owner.
       * 
       * The balance that is reserved by the current deposit owner will be
       * freed and balance of the new deposit owner will get reserved.
       * 
       * The subject of the call must be linked to the account.
       * The sender of the call will be the new deposit owner.
       **/
      changeDepositOwner: AugmentedSubmittable<(account: PalletDidLookupLinkableAccountLinkableAccountId | { AccountId20: any } | { AccountId32: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [PalletDidLookupLinkableAccountLinkableAccountId]>;
      /**
       * Remove the association of the provided account. This call can only
       * be called from the deposit owner. The reserved deposit will be
       * freed.
       * 
       * Emits `AssociationRemoved`.
       * 
       * # <weight>
       * Weight: O(1)
       * - Reads: ConnectedDids
       * - Writes: ConnectedDids
       * # </weight>
       **/
      reclaimDeposit: AugmentedSubmittable<(account: PalletDidLookupLinkableAccountLinkableAccountId | { AccountId20: any } | { AccountId32: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [PalletDidLookupLinkableAccountLinkableAccountId]>;
      /**
       * Remove the association of the provided account ID. This call doesn't
       * require the authorization of the account ID, but the associated DID
       * needs to match the DID that authorized this call.
       * 
       * Emits `AssociationRemoved`.
       * 
       * # <weight>
       * Weight: O(1)
       * - Reads: ConnectedDids + ConnectedAccounts + DID Origin Check
       * - Writes: ConnectedDids + ConnectedAccounts
       * # </weight>
       **/
      removeAccountAssociation: AugmentedSubmittable<(account: PalletDidLookupLinkableAccountLinkableAccountId | { AccountId20: any } | { AccountId32: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [PalletDidLookupLinkableAccountLinkableAccountId]>;
      /**
       * Remove the association of the sender account. This call doesn't
       * require the authorization of the DID, but requires a signed origin.
       * 
       * Emits `AssociationRemoved`.
       * 
       * # <weight>
       * Weight: O(1)
       * - Reads: ConnectedDids + ConnectedAccounts + DID Origin Check
       * - Writes: ConnectedDids + ConnectedAccounts
       * # </weight>
       **/
      removeSenderAssociation: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Updates the deposit amount to the current deposit rate.
       * 
       * The sender must be the deposit owner.
       **/
      updateDeposit: AugmentedSubmittable<(account: PalletDidLookupLinkableAccountLinkableAccountId | { AccountId20: any } | { AccountId32: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [PalletDidLookupLinkableAccountLinkableAccountId]>;
    };
    dmpQueue: {
      /**
       * Service a single overweight message.
       **/
      serviceOverweight: AugmentedSubmittable<(index: u64 | AnyNumber | Uint8Array, weightLimit: SpWeightsWeightV2Weight | { refTime?: any; proofSize?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [u64, SpWeightsWeightV2Weight]>;
    };
    indices: {
      /**
       * Assign an previously unassigned index.
       * 
       * Payment: `Deposit` is reserved from the sender account.
       * 
       * The dispatch origin for this call must be _Signed_.
       * 
       * - `index`: the index to be claimed. This must not be in use.
       * 
       * Emits `IndexAssigned` if successful.
       * 
       * ## Complexity
       * - `O(1)`.
       **/
      claim: AugmentedSubmittable<(index: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u64]>;
      /**
       * Force an index to an account. This doesn't require a deposit. If the index is already
       * held, then any deposit is reimbursed to its current owner.
       * 
       * The dispatch origin for this call must be _Root_.
       * 
       * - `index`: the index to be (re-)assigned.
       * - `new`: the new owner of the index. This function is a no-op if it is equal to sender.
       * - `freeze`: if set to `true`, will freeze the index so it cannot be transferred.
       * 
       * Emits `IndexAssigned` if successful.
       * 
       * ## Complexity
       * - `O(1)`.
       **/
      forceTransfer: AugmentedSubmittable<(updated: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, index: u64 | AnyNumber | Uint8Array, freeze: bool | boolean | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, u64, bool]>;
      /**
       * Free up an index owned by the sender.
       * 
       * Payment: Any previous deposit placed for the index is unreserved in the sender account.
       * 
       * The dispatch origin for this call must be _Signed_ and the sender must own the index.
       * 
       * - `index`: the index to be freed. This must be owned by the sender.
       * 
       * Emits `IndexFreed` if successful.
       * 
       * ## Complexity
       * - `O(1)`.
       **/
      free: AugmentedSubmittable<(index: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u64]>;
      /**
       * Freeze an index so it will always point to the sender account. This consumes the
       * deposit.
       * 
       * The dispatch origin for this call must be _Signed_ and the signing account must have a
       * non-frozen account `index`.
       * 
       * - `index`: the index to be frozen in place.
       * 
       * Emits `IndexFrozen` if successful.
       * 
       * ## Complexity
       * - `O(1)`.
       **/
      freeze: AugmentedSubmittable<(index: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u64]>;
      /**
       * Assign an index already owned by the sender to another account. The balance reservation
       * is effectively transferred to the new account.
       * 
       * The dispatch origin for this call must be _Signed_.
       * 
       * - `index`: the index to be re-assigned. This must be owned by the sender.
       * - `new`: the new owner of the index. This function is a no-op if it is equal to sender.
       * 
       * Emits `IndexAssigned` if successful.
       * 
       * ## Complexity
       * - `O(1)`.
       **/
      transfer: AugmentedSubmittable<(updated: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, index: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, u64]>;
    };
    multisig: {
      /**
       * Register approval for a dispatch to be made from a deterministic composite account if
       * approved by a total of `threshold - 1` of `other_signatories`.
       * 
       * Payment: `DepositBase` will be reserved if this is the first approval, plus
       * `threshold` times `DepositFactor`. It is returned once this dispatch happens or
       * is cancelled.
       * 
       * The dispatch origin for this call must be _Signed_.
       * 
       * - `threshold`: The total number of approvals for this dispatch before it is executed.
       * - `other_signatories`: The accounts (other than the sender) who can approve this
       * dispatch. May not be empty.
       * - `maybe_timepoint`: If this is the first approval, then this must be `None`. If it is
       * not the first approval, then it must be `Some`, with the timepoint (block number and
       * transaction index) of the first approval transaction.
       * - `call_hash`: The hash of the call to be executed.
       * 
       * NOTE: If this is the final approval, you will want to use `as_multi` instead.
       * 
       * ## Complexity
       * - `O(S)`.
       * - Up to one balance-reserve or unreserve operation.
       * - One passthrough operation, one insert, both `O(S)` where `S` is the number of
       * signatories. `S` is capped by `MaxSignatories`, with weight being proportional.
       * - One encode & hash, both of complexity `O(S)`.
       * - Up to one binary search and insert (`O(logS + S)`).
       * - I/O: 1 read `O(S)`, up to 1 mutate `O(S)`. Up to one remove.
       * - One event.
       * - Storage: inserts one item, value size bounded by `MaxSignatories`, with a deposit
       * taken for its lifetime of `DepositBase + threshold * DepositFactor`.
       **/
      approveAsMulti: AugmentedSubmittable<(threshold: u16 | AnyNumber | Uint8Array, otherSignatories: Vec<AccountId32> | (AccountId32 | string | Uint8Array)[], maybeTimepoint: Option<PalletMultisigTimepoint> | null | Uint8Array | PalletMultisigTimepoint | { height?: any; index?: any } | string, callHash: U8aFixed | string | Uint8Array, maxWeight: SpWeightsWeightV2Weight | { refTime?: any; proofSize?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [u16, Vec<AccountId32>, Option<PalletMultisigTimepoint>, U8aFixed, SpWeightsWeightV2Weight]>;
      /**
       * Register approval for a dispatch to be made from a deterministic composite account if
       * approved by a total of `threshold - 1` of `other_signatories`.
       * 
       * If there are enough, then dispatch the call.
       * 
       * Payment: `DepositBase` will be reserved if this is the first approval, plus
       * `threshold` times `DepositFactor`. It is returned once this dispatch happens or
       * is cancelled.
       * 
       * The dispatch origin for this call must be _Signed_.
       * 
       * - `threshold`: The total number of approvals for this dispatch before it is executed.
       * - `other_signatories`: The accounts (other than the sender) who can approve this
       * dispatch. May not be empty.
       * - `maybe_timepoint`: If this is the first approval, then this must be `None`. If it is
       * not the first approval, then it must be `Some`, with the timepoint (block number and
       * transaction index) of the first approval transaction.
       * - `call`: The call to be executed.
       * 
       * NOTE: Unless this is the final approval, you will generally want to use
       * `approve_as_multi` instead, since it only requires a hash of the call.
       * 
       * Result is equivalent to the dispatched result if `threshold` is exactly `1`. Otherwise
       * on success, result is `Ok` and the result from the interior call, if it was executed,
       * may be found in the deposited `MultisigExecuted` event.
       * 
       * ## Complexity
       * - `O(S + Z + Call)`.
       * - Up to one balance-reserve or unreserve operation.
       * - One passthrough operation, one insert, both `O(S)` where `S` is the number of
       * signatories. `S` is capped by `MaxSignatories`, with weight being proportional.
       * - One call encode & hash, both of complexity `O(Z)` where `Z` is tx-len.
       * - One encode & hash, both of complexity `O(S)`.
       * - Up to one binary search and insert (`O(logS + S)`).
       * - I/O: 1 read `O(S)`, up to 1 mutate `O(S)`. Up to one remove.
       * - One event.
       * - The weight of the `call`.
       * - Storage: inserts one item, value size bounded by `MaxSignatories`, with a deposit
       * taken for its lifetime of `DepositBase + threshold * DepositFactor`.
       **/
      asMulti: AugmentedSubmittable<(threshold: u16 | AnyNumber | Uint8Array, otherSignatories: Vec<AccountId32> | (AccountId32 | string | Uint8Array)[], maybeTimepoint: Option<PalletMultisigTimepoint> | null | Uint8Array | PalletMultisigTimepoint | { height?: any; index?: any } | string, call: Call | IMethod | string | Uint8Array, maxWeight: SpWeightsWeightV2Weight | { refTime?: any; proofSize?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [u16, Vec<AccountId32>, Option<PalletMultisigTimepoint>, Call, SpWeightsWeightV2Weight]>;
      /**
       * Immediately dispatch a multi-signature call using a single approval from the caller.
       * 
       * The dispatch origin for this call must be _Signed_.
       * 
       * - `other_signatories`: The accounts (other than the sender) who are part of the
       * multi-signature, but do not participate in the approval process.
       * - `call`: The call to be executed.
       * 
       * Result is equivalent to the dispatched result.
       * 
       * ## Complexity
       * O(Z + C) where Z is the length of the call and C its execution weight.
       **/
      asMultiThreshold1: AugmentedSubmittable<(otherSignatories: Vec<AccountId32> | (AccountId32 | string | Uint8Array)[], call: Call | IMethod | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Vec<AccountId32>, Call]>;
      /**
       * Cancel a pre-existing, on-going multisig transaction. Any deposit reserved previously
       * for this operation will be unreserved on success.
       * 
       * The dispatch origin for this call must be _Signed_.
       * 
       * - `threshold`: The total number of approvals for this dispatch before it is executed.
       * - `other_signatories`: The accounts (other than the sender) who can approve this
       * dispatch. May not be empty.
       * - `timepoint`: The timepoint (block number and transaction index) of the first approval
       * transaction for this dispatch.
       * - `call_hash`: The hash of the call to be executed.
       * 
       * ## Complexity
       * - `O(S)`.
       * - Up to one balance-reserve or unreserve operation.
       * - One passthrough operation, one insert, both `O(S)` where `S` is the number of
       * signatories. `S` is capped by `MaxSignatories`, with weight being proportional.
       * - One encode & hash, both of complexity `O(S)`.
       * - One event.
       * - I/O: 1 read `O(S)`, one remove.
       * - Storage: removes one item.
       **/
      cancelAsMulti: AugmentedSubmittable<(threshold: u16 | AnyNumber | Uint8Array, otherSignatories: Vec<AccountId32> | (AccountId32 | string | Uint8Array)[], timepoint: PalletMultisigTimepoint | { height?: any; index?: any } | string | Uint8Array, callHash: U8aFixed | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [u16, Vec<AccountId32>, PalletMultisigTimepoint, U8aFixed]>;
    };
    parachainStaking: {
      /**
       * Revert the previously requested exit of the network of a collator
       * candidate. On success, adds back the candidate to the TopCandidates
       * and updates the collators.
       * 
       * Requires the candidate to previously have called
       * `init_leave_candidates`.
       * 
       * Emits `CollatorCanceledExit`.
       **/
      cancelLeaveCandidates: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Stake less funds for a collator candidate.
       * 
       * If the new amount of staked fund is not large enough, the account
       * could be removed from the set of collator candidates and not be
       * considered for authoring the next blocks.
       * 
       * This operation affects the pallet's total stake amount.
       * 
       * The unstaked funds are not released immediately to the account, but
       * they will be available after `StakeDuration` blocks.
       * 
       * The resulting total amount of funds staked must be within the
       * allowed range as set in the pallet's configuration.
       * 
       * Emits `CollatorStakedLess`.
       **/
      candidateStakeLess: AugmentedSubmittable<(less: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u128]>;
      /**
       * Stake more funds for a collator candidate.
       * 
       * If not in the set of candidates, staking enough funds allows the
       * account to be added to it. The larger amount of funds, the higher
       * chances to be selected as the author of the next block.
       * 
       * This operation affects the pallet's total stake amount.
       * 
       * The resulting total amount of funds staked must be within the
       * allowed range as set in the pallet's configuration.
       * 
       * Emits `CollatorStakedMore`.
       **/
      candidateStakeMore: AugmentedSubmittable<(more: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u128]>;
      /**
       * Claim block authoring rewards for the target address.
       * 
       * Requires `Rewards` to be set beforehand, which can by triggered by
       * any of the following options
       * * Calling increment_{collator, delegator}_rewards (active)
       * * Altering your stake (active)
       * * Leaving the network as a collator (active)
       * * Revoking a delegation as a delegator (active)
       * * Being a delegator whose collator left the network, altered their
       * stake or incremented rewards (passive)
       * 
       * The dispatch origin can be any signed one, e.g., anyone can claim
       * for anyone.
       * 
       * Emits `Rewarded`.
       **/
      claimRewards: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Reduce the stake for delegating a collator candidate.
       * 
       * If the new amount of staked fund is not large enough, the collator
       * could be removed from the set of collator candidates and not be
       * considered for authoring the next blocks.
       * 
       * The unstaked funds are not release immediately to the account, but
       * they will be available after `StakeDuration` blocks.
       * 
       * The remaining staked funds must still be larger than the minimum
       * required by this pallet to maintain the status of delegator.
       * 
       * The resulting total amount of funds staked must be within the
       * allowed range as set in the pallet's configuration.
       * 
       * Emits `DelegatorStakedLess`.
       **/
      delegatorStakeLess: AugmentedSubmittable<(less: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u128]>;
      /**
       * Increase the stake for delegating a collator candidate.
       * 
       * If not in the set of candidates, staking enough funds allows the
       * collator candidate to be added to it.
       * 
       * Emits `DelegatorStakedMore`.
       **/
      delegatorStakeMore: AugmentedSubmittable<(more: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u128]>;
      /**
       * Execute the network exit of a candidate who requested to leave at
       * least `ExitQueueDelay` rounds ago. Prepares unstaking of the
       * candidates and their delegators stake which can be unlocked via
       * `unlock_unstaked` after waiting at least `StakeDuration` many
       * blocks.
       * 
       * Requires the candidate to previously have called
       * `init_leave_candidates`.
       * 
       * The exit request can be reversed by calling
       * `cancel_leave_candidates`.
       * 
       * NOTE: Iterates over CandidatePool for each candidate over their
       * delegators to set rewards. Needs to be improved when scaling up
       * `MaxTopCandidates`.
       * 
       * Emits `CollatorLeft`.
       **/
      executeLeaveCandidates: AugmentedSubmittable<(collator: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress]>;
      /**
       * Executes the annual reduction of the reward rates for collators and
       * delegators.
       * 
       * Moreover, sets rewards for all collators and delegators
       * before adjusting the inflation.
       * 
       * The dispatch origin can be any signed one because we bail if called
       * too early.
       * 
       * Emits `RoundInflationSet`.
       **/
      executeScheduledRewardChange: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Forces the start of the new round in the next block.
       * 
       * The new round will be enforced via <T as
       * ShouldEndSession<_>>::should_end_session.
       * 
       * The dispatch origin must be Root.
       **/
      forceNewRound: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Forcedly removes a collator candidate from the TopCandidates and
       * clears all associated storage for the candidate and their
       * delegators.
       * 
       * Prepares unstaking of the candidates and their delegators stake
       * which can be unlocked via `unlock_unstaked` after waiting at
       * least `StakeDuration` many blocks. Also increments rewards for the
       * collator and their delegators.
       * 
       * Increments rewards of candidate and their delegators.
       * 
       * Emits `CandidateRemoved`.
       **/
      forceRemoveCandidate: AugmentedSubmittable<(collator: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress]>;
      /**
       * Actively increment the rewards of a collator.
       * 
       * The same effect is triggered by changing the stake or leaving the
       * network.
       * 
       * The dispatch origin must be a collator.
       **/
      incrementCollatorRewards: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Actively increment the rewards of a delegator.
       * 
       * The same effect is triggered by changing the stake or revoking
       * delegations.
       * 
       * The dispatch origin must be a delegator.
       **/
      incrementDelegatorRewards: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Request to leave the set of collator candidates.
       * 
       * On success, the account is immediately removed from the candidate
       * pool to prevent selection as a collator in future validation rounds,
       * but unstaking of the funds is executed with a delay of
       * `StakeDuration` blocks.
       * 
       * The exit request can be reversed by calling
       * `cancel_leave_candidates`.
       * 
       * This operation affects the pallet's total stake amount. It is
       * updated even though the funds of the candidate who signaled to leave
       * are still locked for `ExitDelay` + `StakeDuration` more blocks.
       * 
       * NOTE 1: Upon starting a new session_i in `new_session`, the current
       * top candidates are selected to be block authors for session_i+1. Any
       * changes to the top candidates afterwards do not effect the set of
       * authors for session_i+1.
       * Thus, we have to make sure none of these collators can
       * leave before session_i+1 ends by delaying their
       * exit for `ExitDelay` many blocks.
       * 
       * NOTE 2: We do not increment rewards in this extrinsic as the
       * candidate could still author blocks, and thus be eligible to receive
       * rewards, until the end of the next session.
       * 
       * Emits `CollatorScheduledExit`.
       **/
      initLeaveCandidates: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Join the set of collator candidates.
       * 
       * In the next blocks, if the collator candidate has enough funds
       * staked to be included in any of the top `MaxSelectedCandidates`
       * positions, it will be included in the set of potential authors that
       * will be selected by the stake-weighted random selection function.
       * 
       * The staked funds of the new collator candidate are added to the
       * total stake of the system.
       * 
       * The total amount of funds staked must be within the allowed range as
       * set in the pallet's configuration.
       * 
       * The dispatch origin must not be already part of the collator
       * candidates nor of the delegators set.
       * 
       * Emits `JoinedCollatorCandidates`.
       **/
      joinCandidates: AugmentedSubmittable<(stake: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u128]>;
      /**
       * Join the set of delegators by delegating to a collator candidate.
       * 
       * The account that wants to delegate cannot be part of the collator
       * candidates set as well.
       * 
       * The caller must _not_ have a delegation. If that is the case, they
       * are required to first remove the delegation.
       * 
       * The amount staked must be larger than the minimum required to become
       * a delegator as set in the pallet's configuration.
       * 
       * As only `MaxDelegatorsPerCollator` are allowed to delegate a given
       * collator, the amount staked must be larger than the lowest one in
       * the current set of delegator for the operation to be meaningful.
       * 
       * The collator's total stake as well as the pallet's total stake are
       * increased accordingly.
       * 
       * Emits `Delegation`.
       * Emits `DelegationReplaced` if the candidate has
       * `MaxDelegatorsPerCollator` many delegations but this delegator
       * staked more than one of the other delegators of this candidate.
       **/
      joinDelegators: AugmentedSubmittable<(collator: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, amount: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, u128]>;
      /**
       * Leave the set of delegators and, by implication, revoke the ongoing
       * delegation.
       * 
       * All staked funds are not unlocked immediately, but they are added to
       * the queue of pending unstaking, and will effectively be released
       * after `StakeDuration` blocks from the moment the delegator leaves.
       * 
       * This operation reduces the total stake of the pallet as well as the
       * stakes of all collators that were delegated, potentially affecting
       * their chances to be included in the set of candidates in the next
       * rounds.
       * 
       * Automatically increments the accumulated rewards of the origin of
       * the current delegation.
       * 
       * Emits `DelegatorLeft`.
       **/
      leaveDelegators: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Set the number of blocks each validation round lasts.
       * 
       * If the new value is less than the length of the current round, the
       * system will immediately move to the next round in the next block.
       * 
       * The new value must be higher than the minimum allowed as set in the
       * pallet's configuration.
       * 
       * The dispatch origin must be Root.
       * 
       * Emits `BlocksPerRoundSet`.
       **/
      setBlocksPerRound: AugmentedSubmittable<(updated: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u64]>;
      /**
       * Set the annual inflation rate to derive per-round inflation.
       * 
       * The inflation details are considered valid if the annual reward rate
       * is approximately the per-block reward rate multiplied by the
       * estimated* total number of blocks per year.
       * 
       * The estimated average block time is twelve seconds.
       * 
       * NOTE: Iterates over CandidatePool and for each candidate over their
       * delegators to update their rewards before the reward rates change.
       * Needs to be improved when scaling up `MaxTopCandidates`.
       * 
       * The dispatch origin must be Root.
       * 
       * Emits `RoundInflationSet`.
       **/
      setInflation: AugmentedSubmittable<(collatorMaxRatePercentage: Perquintill | AnyNumber | Uint8Array, collatorAnnualRewardRatePercentage: Perquintill | AnyNumber | Uint8Array, delegatorMaxRatePercentage: Perquintill | AnyNumber | Uint8Array, delegatorAnnualRewardRatePercentage: Perquintill | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [Perquintill, Perquintill, Perquintill, Perquintill]>;
      /**
       * Set the maximal amount a collator can stake. Existing stakes are not
       * changed.
       * 
       * The dispatch origin must be Root.
       * 
       * Emits `MaxCandidateStakeChanged`.
       **/
      setMaxCandidateStake: AugmentedSubmittable<(updated: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u128]>;
      /**
       * Set the maximum number of collator candidates that can be selected
       * at the beginning of each validation round.
       * 
       * Changes are not applied until the start of the next round.
       * 
       * The new value must be higher than the minimum allowed as set in the
       * pallet's configuration.
       * 
       * The dispatch origin must be Root.
       * 
       * Emits `MaxSelectedCandidatesSet`.
       **/
      setMaxSelectedCandidates: AugmentedSubmittable<(updated: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32]>;
      /**
       * Unlock all previously staked funds that are now available for
       * unlocking by the origin account after `StakeDuration` blocks have
       * elapsed.
       * 
       * Weight: O(U) where U is the number of locked unstaking requests
       * bounded by `MaxUnstakeRequests`.
       * - Reads: [Origin Account], Unstaking, Locks
       * - Writes: Unstaking, Locks
       * - Kills: Unstaking & Locks if no balance is locked anymore
       * # </weight>
       **/
      unlockUnstaked: AugmentedSubmittable<(target: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress]>;
    };
    parachainSystem: {
      /**
       * Authorize an upgrade to a given `code_hash` for the runtime. The runtime can be supplied
       * later.
       * 
       * The `check_version` parameter sets a boolean flag for whether or not the runtime's spec
       * version and name should be verified on upgrade. Since the authorization only has a hash,
       * it cannot actually perform the verification.
       * 
       * This call requires Root origin.
       **/
      authorizeUpgrade: AugmentedSubmittable<(codeHash: H256 | string | Uint8Array, checkVersion: bool | boolean | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256, bool]>;
      /**
       * Provide the preimage (runtime binary) `code` for an upgrade that has been authorized.
       * 
       * If the authorization required a version check, this call will ensure the spec name
       * remains unchanged and that the spec version has increased.
       * 
       * Note that this function will not apply the new `code`, but only attempt to schedule the
       * upgrade with the Relay Chain.
       * 
       * All origins are allowed.
       **/
      enactAuthorizedUpgrade: AugmentedSubmittable<(code: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Bytes]>;
      /**
       * Set the current validation data.
       * 
       * This should be invoked exactly once per block. It will panic at the finalization
       * phase if the call was not invoked.
       * 
       * The dispatch origin for this call must be `Inherent`
       * 
       * As a side effect, this function upgrades the current validation function
       * if the appropriate time has come.
       **/
      setValidationData: AugmentedSubmittable<(data: CumulusPrimitivesParachainInherentParachainInherentData | { validationData?: any; relayChainState?: any; downwardMessages?: any; horizontalMessages?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [CumulusPrimitivesParachainInherentParachainInherentData]>;
      sudoSendUpwardMessage: AugmentedSubmittable<(message: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Bytes]>;
    };
    polkadotXcm: {
      /**
       * Execute an XCM message from a local, signed, origin.
       * 
       * An event is deposited indicating whether `msg` could be executed completely or only
       * partially.
       * 
       * No more than `max_weight` will be used in its attempted execution. If this is less than the
       * maximum amount of weight that the message could take to be executed, then no execution
       * attempt will be made.
       * 
       * NOTE: A successful return to this does *not* imply that the `msg` was executed successfully
       * to completion; only that *some* of it was executed.
       **/
      execute: AugmentedSubmittable<(message: XcmVersionedXcm | { V2: any } | { V3: any } | string | Uint8Array, maxWeight: SpWeightsWeightV2Weight | { refTime?: any; proofSize?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [XcmVersionedXcm, SpWeightsWeightV2Weight]>;
      /**
       * Set a safe XCM version (the version that XCM should be encoded with if the most recent
       * version a destination can accept is unknown).
       * 
       * - `origin`: Must be Root.
       * - `maybe_xcm_version`: The default XCM encoding version, or `None` to disable.
       **/
      forceDefaultXcmVersion: AugmentedSubmittable<(maybeXcmVersion: Option<u32> | null | Uint8Array | u32 | AnyNumber) => SubmittableExtrinsic<ApiType>, [Option<u32>]>;
      /**
       * Ask a location to notify us regarding their XCM version and any changes to it.
       * 
       * - `origin`: Must be Root.
       * - `location`: The location to which we should subscribe for XCM version notifications.
       **/
      forceSubscribeVersionNotify: AugmentedSubmittable<(location: XcmVersionedMultiLocation | { V2: any } | { V3: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [XcmVersionedMultiLocation]>;
      /**
       * Require that a particular destination should no longer notify us regarding any XCM
       * version changes.
       * 
       * - `origin`: Must be Root.
       * - `location`: The location to which we are currently subscribed for XCM version
       * notifications which we no longer desire.
       **/
      forceUnsubscribeVersionNotify: AugmentedSubmittable<(location: XcmVersionedMultiLocation | { V2: any } | { V3: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [XcmVersionedMultiLocation]>;
      /**
       * Extoll that a particular destination can be communicated with through a particular
       * version of XCM.
       * 
       * - `origin`: Must be Root.
       * - `location`: The destination that is being described.
       * - `xcm_version`: The latest version of XCM that `location` supports.
       **/
      forceXcmVersion: AugmentedSubmittable<(location: XcmV3MultiLocation | { parents?: any; interior?: any } | string | Uint8Array, xcmVersion: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [XcmV3MultiLocation, u32]>;
      /**
       * Transfer some assets from the local chain to the sovereign account of a destination
       * chain and forward a notification XCM.
       * 
       * Fee payment on the destination side is made from the asset in the `assets` vector of
       * index `fee_asset_item`, up to enough to pay for `weight_limit` of weight. If more weight
       * is needed than `weight_limit`, then the operation will fail and the assets send may be
       * at risk.
       * 
       * - `origin`: Must be capable of withdrawing the `assets` and executing XCM.
       * - `dest`: Destination context for the assets. Will typically be `X2(Parent, Parachain(..))` to send
       * from parachain to parachain, or `X1(Parachain(..))` to send from relay to parachain.
       * - `beneficiary`: A beneficiary location for the assets in the context of `dest`. Will generally be
       * an `AccountId32` value.
       * - `assets`: The assets to be withdrawn. This should include the assets used to pay the fee on the
       * `dest` side.
       * - `fee_asset_item`: The index into `assets` of the item which should be used to pay
       * fees.
       * - `weight_limit`: The remote-side weight limit, if any, for the XCM fee purchase.
       **/
      limitedReserveTransferAssets: AugmentedSubmittable<(dest: XcmVersionedMultiLocation | { V2: any } | { V3: any } | string | Uint8Array, beneficiary: XcmVersionedMultiLocation | { V2: any } | { V3: any } | string | Uint8Array, assets: XcmVersionedMultiAssets | { V2: any } | { V3: any } | string | Uint8Array, feeAssetItem: u32 | AnyNumber | Uint8Array, weightLimit: XcmV3WeightLimit | { Unlimited: any } | { Limited: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [XcmVersionedMultiLocation, XcmVersionedMultiLocation, XcmVersionedMultiAssets, u32, XcmV3WeightLimit]>;
      /**
       * Teleport some assets from the local chain to some destination chain.
       * 
       * Fee payment on the destination side is made from the asset in the `assets` vector of
       * index `fee_asset_item`, up to enough to pay for `weight_limit` of weight. If more weight
       * is needed than `weight_limit`, then the operation will fail and the assets send may be
       * at risk.
       * 
       * - `origin`: Must be capable of withdrawing the `assets` and executing XCM.
       * - `dest`: Destination context for the assets. Will typically be `X2(Parent, Parachain(..))` to send
       * from parachain to parachain, or `X1(Parachain(..))` to send from relay to parachain.
       * - `beneficiary`: A beneficiary location for the assets in the context of `dest`. Will generally be
       * an `AccountId32` value.
       * - `assets`: The assets to be withdrawn. The first item should be the currency used to to pay the fee on the
       * `dest` side. May not be empty.
       * - `fee_asset_item`: The index into `assets` of the item which should be used to pay
       * fees.
       * - `weight_limit`: The remote-side weight limit, if any, for the XCM fee purchase.
       **/
      limitedTeleportAssets: AugmentedSubmittable<(dest: XcmVersionedMultiLocation | { V2: any } | { V3: any } | string | Uint8Array, beneficiary: XcmVersionedMultiLocation | { V2: any } | { V3: any } | string | Uint8Array, assets: XcmVersionedMultiAssets | { V2: any } | { V3: any } | string | Uint8Array, feeAssetItem: u32 | AnyNumber | Uint8Array, weightLimit: XcmV3WeightLimit | { Unlimited: any } | { Limited: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [XcmVersionedMultiLocation, XcmVersionedMultiLocation, XcmVersionedMultiAssets, u32, XcmV3WeightLimit]>;
      /**
       * Transfer some assets from the local chain to the sovereign account of a destination
       * chain and forward a notification XCM.
       * 
       * Fee payment on the destination side is made from the asset in the `assets` vector of
       * index `fee_asset_item`. The weight limit for fees is not provided and thus is unlimited,
       * with all fees taken as needed from the asset.
       * 
       * - `origin`: Must be capable of withdrawing the `assets` and executing XCM.
       * - `dest`: Destination context for the assets. Will typically be `X2(Parent, Parachain(..))` to send
       * from parachain to parachain, or `X1(Parachain(..))` to send from relay to parachain.
       * - `beneficiary`: A beneficiary location for the assets in the context of `dest`. Will generally be
       * an `AccountId32` value.
       * - `assets`: The assets to be withdrawn. This should include the assets used to pay the fee on the
       * `dest` side.
       * - `fee_asset_item`: The index into `assets` of the item which should be used to pay
       * fees.
       **/
      reserveTransferAssets: AugmentedSubmittable<(dest: XcmVersionedMultiLocation | { V2: any } | { V3: any } | string | Uint8Array, beneficiary: XcmVersionedMultiLocation | { V2: any } | { V3: any } | string | Uint8Array, assets: XcmVersionedMultiAssets | { V2: any } | { V3: any } | string | Uint8Array, feeAssetItem: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [XcmVersionedMultiLocation, XcmVersionedMultiLocation, XcmVersionedMultiAssets, u32]>;
      send: AugmentedSubmittable<(dest: XcmVersionedMultiLocation | { V2: any } | { V3: any } | string | Uint8Array, message: XcmVersionedXcm | { V2: any } | { V3: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [XcmVersionedMultiLocation, XcmVersionedXcm]>;
      /**
       * Teleport some assets from the local chain to some destination chain.
       * 
       * Fee payment on the destination side is made from the asset in the `assets` vector of
       * index `fee_asset_item`. The weight limit for fees is not provided and thus is unlimited,
       * with all fees taken as needed from the asset.
       * 
       * - `origin`: Must be capable of withdrawing the `assets` and executing XCM.
       * - `dest`: Destination context for the assets. Will typically be `X2(Parent, Parachain(..))` to send
       * from parachain to parachain, or `X1(Parachain(..))` to send from relay to parachain.
       * - `beneficiary`: A beneficiary location for the assets in the context of `dest`. Will generally be
       * an `AccountId32` value.
       * - `assets`: The assets to be withdrawn. The first item should be the currency used to to pay the fee on the
       * `dest` side. May not be empty.
       * - `fee_asset_item`: The index into `assets` of the item which should be used to pay
       * fees.
       **/
      teleportAssets: AugmentedSubmittable<(dest: XcmVersionedMultiLocation | { V2: any } | { V3: any } | string | Uint8Array, beneficiary: XcmVersionedMultiLocation | { V2: any } | { V3: any } | string | Uint8Array, assets: XcmVersionedMultiAssets | { V2: any } | { V3: any } | string | Uint8Array, feeAssetItem: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [XcmVersionedMultiLocation, XcmVersionedMultiLocation, XcmVersionedMultiAssets, u32]>;
    };
    preimage: {
      /**
       * Register a preimage on-chain.
       * 
       * If the preimage was previously requested, no fees or deposits are taken for providing
       * the preimage. Otherwise, a deposit is taken proportional to the size of the preimage.
       **/
      notePreimage: AugmentedSubmittable<(bytes: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Bytes]>;
      /**
       * Request a preimage be uploaded to the chain without paying any fees or deposits.
       * 
       * If the preimage requests has already been provided on-chain, we unreserve any deposit
       * a user may have paid, and take the control of the preimage out of their hands.
       **/
      requestPreimage: AugmentedSubmittable<(hash: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256]>;
      /**
       * Clear an unrequested preimage from the runtime storage.
       * 
       * If `len` is provided, then it will be a much cheaper operation.
       * 
       * - `hash`: The hash of the preimage to be removed from the store.
       * - `len`: The length of the preimage of `hash`.
       **/
      unnotePreimage: AugmentedSubmittable<(hash: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256]>;
      /**
       * Clear a previously made request for a preimage.
       * 
       * NOTE: THIS MUST NOT BE CALLED ON `hash` MORE TIMES THAN `request_preimage`.
       **/
      unrequestPreimage: AugmentedSubmittable<(hash: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256]>;
    };
    proxy: {
      /**
       * Register a proxy account for the sender that is able to make calls on its behalf.
       * 
       * The dispatch origin for this call must be _Signed_.
       * 
       * Parameters:
       * - `proxy`: The account that the `caller` would like to make a proxy.
       * - `proxy_type`: The permissions allowed for this proxy account.
       * - `delay`: The announcement period required of the initial proxy. Will generally be
       * zero.
       **/
      addProxy: AugmentedSubmittable<(delegate: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, proxyType: SpiritnetRuntimeProxyType | 'Any' | 'NonTransfer' | 'Governance' | 'ParachainStaking' | 'CancelProxy' | 'NonDepositClaiming' | number | Uint8Array, delay: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, SpiritnetRuntimeProxyType, u64]>;
      /**
       * Publish the hash of a proxy-call that will be made in the future.
       * 
       * This must be called some number of blocks before the corresponding `proxy` is attempted
       * if the delay associated with the proxy relationship is greater than zero.
       * 
       * No more than `MaxPending` announcements may be made at any one time.
       * 
       * This will take a deposit of `AnnouncementDepositFactor` as well as
       * `AnnouncementDepositBase` if there are no other pending announcements.
       * 
       * The dispatch origin for this call must be _Signed_ and a proxy of `real`.
       * 
       * Parameters:
       * - `real`: The account that the proxy will make a call on behalf of.
       * - `call_hash`: The hash of the call to be made by the `real` account.
       **/
      announce: AugmentedSubmittable<(real: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, callHash: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, H256]>;
      /**
       * Spawn a fresh new account that is guaranteed to be otherwise inaccessible, and
       * initialize it with a proxy of `proxy_type` for `origin` sender.
       * 
       * Requires a `Signed` origin.
       * 
       * - `proxy_type`: The type of the proxy that the sender will be registered as over the
       * new account. This will almost always be the most permissive `ProxyType` possible to
       * allow for maximum flexibility.
       * - `index`: A disambiguation index, in case this is called multiple times in the same
       * transaction (e.g. with `utility::batch`). Unless you're using `batch` you probably just
       * want to use `0`.
       * - `delay`: The announcement period required of the initial proxy. Will generally be
       * zero.
       * 
       * Fails with `Duplicate` if this has already been called in this transaction, from the
       * same sender, with the same parameters.
       * 
       * Fails if there are insufficient funds to pay for deposit.
       **/
      createPure: AugmentedSubmittable<(proxyType: SpiritnetRuntimeProxyType | 'Any' | 'NonTransfer' | 'Governance' | 'ParachainStaking' | 'CancelProxy' | 'NonDepositClaiming' | number | Uint8Array, delay: u64 | AnyNumber | Uint8Array, index: u16 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [SpiritnetRuntimeProxyType, u64, u16]>;
      /**
       * Removes a previously spawned pure proxy.
       * 
       * WARNING: **All access to this account will be lost.** Any funds held in it will be
       * inaccessible.
       * 
       * Requires a `Signed` origin, and the sender account must have been created by a call to
       * `pure` with corresponding parameters.
       * 
       * - `spawner`: The account that originally called `pure` to create this account.
       * - `index`: The disambiguation index originally passed to `pure`. Probably `0`.
       * - `proxy_type`: The proxy type originally passed to `pure`.
       * - `height`: The height of the chain when the call to `pure` was processed.
       * - `ext_index`: The extrinsic index in which the call to `pure` was processed.
       * 
       * Fails with `NoPermission` in case the caller is not a previously created pure
       * account whose `pure` call has corresponding parameters.
       **/
      killPure: AugmentedSubmittable<(spawner: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, proxyType: SpiritnetRuntimeProxyType | 'Any' | 'NonTransfer' | 'Governance' | 'ParachainStaking' | 'CancelProxy' | 'NonDepositClaiming' | number | Uint8Array, index: u16 | AnyNumber | Uint8Array, height: Compact<u64> | AnyNumber | Uint8Array, extIndex: Compact<u32> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, SpiritnetRuntimeProxyType, u16, Compact<u64>, Compact<u32>]>;
      /**
       * Dispatch the given `call` from an account that the sender is authorised for through
       * `add_proxy`.
       * 
       * The dispatch origin for this call must be _Signed_.
       * 
       * Parameters:
       * - `real`: The account that the proxy will make a call on behalf of.
       * - `force_proxy_type`: Specify the exact proxy type to be used and checked for this call.
       * - `call`: The call to be made by the `real` account.
       **/
      proxy: AugmentedSubmittable<(real: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, forceProxyType: Option<SpiritnetRuntimeProxyType> | null | Uint8Array | SpiritnetRuntimeProxyType | 'Any' | 'NonTransfer' | 'Governance' | 'ParachainStaking' | 'CancelProxy' | 'NonDepositClaiming' | number, call: Call | IMethod | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, Option<SpiritnetRuntimeProxyType>, Call]>;
      /**
       * Dispatch the given `call` from an account that the sender is authorized for through
       * `add_proxy`.
       * 
       * Removes any corresponding announcement(s).
       * 
       * The dispatch origin for this call must be _Signed_.
       * 
       * Parameters:
       * - `real`: The account that the proxy will make a call on behalf of.
       * - `force_proxy_type`: Specify the exact proxy type to be used and checked for this call.
       * - `call`: The call to be made by the `real` account.
       **/
      proxyAnnounced: AugmentedSubmittable<(delegate: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, real: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, forceProxyType: Option<SpiritnetRuntimeProxyType> | null | Uint8Array | SpiritnetRuntimeProxyType | 'Any' | 'NonTransfer' | 'Governance' | 'ParachainStaking' | 'CancelProxy' | 'NonDepositClaiming' | number, call: Call | IMethod | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, MultiAddress, Option<SpiritnetRuntimeProxyType>, Call]>;
      /**
       * Remove the given announcement of a delegate.
       * 
       * May be called by a target (proxied) account to remove a call that one of their delegates
       * (`delegate`) has announced they want to execute. The deposit is returned.
       * 
       * The dispatch origin for this call must be _Signed_.
       * 
       * Parameters:
       * - `delegate`: The account that previously announced the call.
       * - `call_hash`: The hash of the call to be made.
       **/
      rejectAnnouncement: AugmentedSubmittable<(delegate: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, callHash: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, H256]>;
      /**
       * Remove a given announcement.
       * 
       * May be called by a proxy account to remove a call they previously announced and return
       * the deposit.
       * 
       * The dispatch origin for this call must be _Signed_.
       * 
       * Parameters:
       * - `real`: The account that the proxy will make a call on behalf of.
       * - `call_hash`: The hash of the call to be made by the `real` account.
       **/
      removeAnnouncement: AugmentedSubmittable<(real: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, callHash: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, H256]>;
      /**
       * Unregister all proxy accounts for the sender.
       * 
       * The dispatch origin for this call must be _Signed_.
       * 
       * WARNING: This may be called on accounts created by `pure`, however if done, then
       * the unreserved fees will be inaccessible. **All access to this account will be lost.**
       **/
      removeProxies: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Unregister a proxy account for the sender.
       * 
       * The dispatch origin for this call must be _Signed_.
       * 
       * Parameters:
       * - `proxy`: The account that the `caller` would like to remove as a proxy.
       * - `proxy_type`: The permissions currently enabled for the removed proxy account.
       **/
      removeProxy: AugmentedSubmittable<(delegate: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, proxyType: SpiritnetRuntimeProxyType | 'Any' | 'NonTransfer' | 'Governance' | 'ParachainStaking' | 'CancelProxy' | 'NonDepositClaiming' | number | Uint8Array, delay: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, SpiritnetRuntimeProxyType, u64]>;
    };
    publicCredentials: {
      /**
       * Register a new public credential on chain.
       * 
       * This function fails if a credential with the same identifier already
       * exists for the specified subject.
       * 
       * Emits `CredentialStored`.
       **/
      add: AugmentedSubmittable<(credential: PublicCredentialsCredentialsCredential | { ctypeHash?: any; subject?: any; claims?: any; authorization?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [PublicCredentialsCredentialsCredential]>;
      /**
       * Changes the deposit owner.
       * 
       * The balance that is reserved by the current deposit owner will be
       * freed and balance of the new deposit owner will get reserved.
       * 
       * The subject of the call must be the owner of the credential.
       * The sender of the call will be the new deposit owner.
       **/
      changeDepositOwner: AugmentedSubmittable<(credentialId: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256]>;
      /**
       * Removes the information pertaining a public credential from the
       * chain and returns the deposit to its payer.
       * 
       * The removal of the credential does not delete it entirely from the
       * blockchain history, but only its link *from* the blockchain state
       * *to* the blockchain history is removed.
       * 
       * Clients parsing public credentials should interpret
       * the lack of such a link as the fact that the credential has been
       * removed by its attester some time in the past.
       * 
       * This function fails if a credential already exists for the specified
       * subject.
       * 
       * The dispatch origin must be the owner of the deposit, hence not the
       * credential's attester.
       * 
       * Emits `CredentialRemoved`.
       **/
      reclaimDeposit: AugmentedSubmittable<(credentialId: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256]>;
      /**
       * Removes the information pertaining a public credential from the
       * chain.
       * 
       * The removal of the credential does not delete it entirely from the
       * blockchain history, but only its link *from* the blockchain state
       * *to* the blockchain history is removed.
       * 
       * Clients parsing public credentials should interpret
       * the lack of such a link as the fact that the credential has been
       * removed by its attester some time in the past.
       * 
       * This function fails if a credential already exists for the specified
       * subject.
       * 
       * The dispatch origin must be authorized to remove the credential.
       * 
       * Emits `CredentialRemoved`.
       **/
      remove: AugmentedSubmittable<(credentialId: H256 | string | Uint8Array, authorization: Option<RuntimeCommonAuthorizationPalletAuthorize> | null | Uint8Array | RuntimeCommonAuthorizationPalletAuthorize | { Delegation: any } | string) => SubmittableExtrinsic<ApiType>, [H256, Option<RuntimeCommonAuthorizationPalletAuthorize>]>;
      /**
       * Revokes a public credential.
       * 
       * If a credential was already revoked, this function does not fail but
       * simply results in a noop.
       * 
       * The dispatch origin must be authorized to revoke the credential.
       * 
       * Emits `CredentialRevoked`.
       **/
      revoke: AugmentedSubmittable<(credentialId: H256 | string | Uint8Array, authorization: Option<RuntimeCommonAuthorizationPalletAuthorize> | null | Uint8Array | RuntimeCommonAuthorizationPalletAuthorize | { Delegation: any } | string) => SubmittableExtrinsic<ApiType>, [H256, Option<RuntimeCommonAuthorizationPalletAuthorize>]>;
      /**
       * Unrevokes a public credential.
       * 
       * If a credential was not revoked, this function does not fail but
       * simply results in a noop.
       * 
       * The dispatch origin must be authorized to unrevoke the
       * credential.
       * 
       * Emits `CredentialUnrevoked`.
       **/
      unrevoke: AugmentedSubmittable<(credentialId: H256 | string | Uint8Array, authorization: Option<RuntimeCommonAuthorizationPalletAuthorize> | null | Uint8Array | RuntimeCommonAuthorizationPalletAuthorize | { Delegation: any } | string) => SubmittableExtrinsic<ApiType>, [H256, Option<RuntimeCommonAuthorizationPalletAuthorize>]>;
      /**
       * Updates the deposit amount to the current deposit rate.
       * 
       * The sender must be the deposit owner.
       **/
      updateDeposit: AugmentedSubmittable<(credentialId: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256]>;
    };
    scheduler: {
      /**
       * Cancel an anonymously scheduled task.
       **/
      cancel: AugmentedSubmittable<(when: u64 | AnyNumber | Uint8Array, index: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u64, u32]>;
      /**
       * Cancel a named scheduled task.
       **/
      cancelNamed: AugmentedSubmittable<(id: U8aFixed | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [U8aFixed]>;
      /**
       * Anonymously schedule a task.
       **/
      schedule: AugmentedSubmittable<(when: u64 | AnyNumber | Uint8Array, maybePeriodic: Option<ITuple<[u64, u32]>> | null | Uint8Array | ITuple<[u64, u32]> | [u64 | AnyNumber | Uint8Array, u32 | AnyNumber | Uint8Array], priority: u8 | AnyNumber | Uint8Array, call: Call | IMethod | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [u64, Option<ITuple<[u64, u32]>>, u8, Call]>;
      /**
       * Anonymously schedule a task after a delay.
       **/
      scheduleAfter: AugmentedSubmittable<(after: u64 | AnyNumber | Uint8Array, maybePeriodic: Option<ITuple<[u64, u32]>> | null | Uint8Array | ITuple<[u64, u32]> | [u64 | AnyNumber | Uint8Array, u32 | AnyNumber | Uint8Array], priority: u8 | AnyNumber | Uint8Array, call: Call | IMethod | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [u64, Option<ITuple<[u64, u32]>>, u8, Call]>;
      /**
       * Schedule a named task.
       **/
      scheduleNamed: AugmentedSubmittable<(id: U8aFixed | string | Uint8Array, when: u64 | AnyNumber | Uint8Array, maybePeriodic: Option<ITuple<[u64, u32]>> | null | Uint8Array | ITuple<[u64, u32]> | [u64 | AnyNumber | Uint8Array, u32 | AnyNumber | Uint8Array], priority: u8 | AnyNumber | Uint8Array, call: Call | IMethod | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [U8aFixed, u64, Option<ITuple<[u64, u32]>>, u8, Call]>;
      /**
       * Schedule a named task after a delay.
       **/
      scheduleNamedAfter: AugmentedSubmittable<(id: U8aFixed | string | Uint8Array, after: u64 | AnyNumber | Uint8Array, maybePeriodic: Option<ITuple<[u64, u32]>> | null | Uint8Array | ITuple<[u64, u32]> | [u64 | AnyNumber | Uint8Array, u32 | AnyNumber | Uint8Array], priority: u8 | AnyNumber | Uint8Array, call: Call | IMethod | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [U8aFixed, u64, Option<ITuple<[u64, u32]>>, u8, Call]>;
    };
    session: {
      /**
       * Removes any session key(s) of the function caller.
       * 
       * This doesn't take effect until the next session.
       * 
       * The dispatch origin of this function must be Signed and the account must be either be
       * convertible to a validator ID using the chain's typical addressing system (this usually
       * means being a controller account) or directly convertible into a validator ID (which
       * usually means being a stash account).
       * 
       * ## Complexity
       * - `O(1)` in number of key types. Actual cost depends on the number of length of
       * `T::Keys::key_ids()` which is fixed.
       **/
      purgeKeys: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Sets the session key(s) of the function caller to `keys`.
       * Allows an account to set its session key prior to becoming a validator.
       * This doesn't take effect until the next session.
       * 
       * The dispatch origin of this function must be signed.
       * 
       * ## Complexity
       * - `O(1)`. Actual cost depends on the number of length of `T::Keys::key_ids()` which is
       * fixed.
       **/
      setKeys: AugmentedSubmittable<(keys: SpiritnetRuntimeSessionKeys | { aura?: any } | string | Uint8Array, proof: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [SpiritnetRuntimeSessionKeys, Bytes]>;
    };
    system: {
      /**
       * Kill all storage items with a key that starts with the given prefix.
       * 
       * **NOTE:** We rely on the Root origin to provide us the number of subkeys under
       * the prefix we are removing to accurately calculate the weight of this function.
       **/
      killPrefix: AugmentedSubmittable<(prefix: Bytes | string | Uint8Array, subkeys: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [Bytes, u32]>;
      /**
       * Kill some items from storage.
       **/
      killStorage: AugmentedSubmittable<(keys: Vec<Bytes> | (Bytes | string | Uint8Array)[]) => SubmittableExtrinsic<ApiType>, [Vec<Bytes>]>;
      /**
       * Make some on-chain remark.
       * 
       * ## Complexity
       * - `O(1)`
       **/
      remark: AugmentedSubmittable<(remark: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Bytes]>;
      /**
       * Make some on-chain remark and emit event.
       **/
      remarkWithEvent: AugmentedSubmittable<(remark: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Bytes]>;
      /**
       * Set the new runtime code.
       * 
       * ## Complexity
       * - `O(C + S)` where `C` length of `code` and `S` complexity of `can_set_code`
       **/
      setCode: AugmentedSubmittable<(code: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Bytes]>;
      /**
       * Set the new runtime code without doing any checks of the given `code`.
       * 
       * ## Complexity
       * - `O(C)` where `C` length of `code`
       **/
      setCodeWithoutChecks: AugmentedSubmittable<(code: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Bytes]>;
      /**
       * Set the number of pages in the WebAssembly environment's heap.
       **/
      setHeapPages: AugmentedSubmittable<(pages: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u64]>;
      /**
       * Set some items of storage.
       **/
      setStorage: AugmentedSubmittable<(items: Vec<ITuple<[Bytes, Bytes]>> | ([Bytes | string | Uint8Array, Bytes | string | Uint8Array])[]) => SubmittableExtrinsic<ApiType>, [Vec<ITuple<[Bytes, Bytes]>>]>;
    };
    technicalCommittee: {
      /**
       * Close a vote that is either approved, disapproved or whose voting period has ended.
       * 
       * May be called by any signed account in order to finish voting and close the proposal.
       * 
       * If called before the end of the voting period it will only close the vote if it is
       * has enough votes to be approved or disapproved.
       * 
       * If called after the end of the voting period abstentions are counted as rejections
       * unless there is a prime member set and the prime member cast an approval.
       * 
       * If the close operation completes successfully with disapproval, the transaction fee will
       * be waived. Otherwise execution of the approved operation will be charged to the caller.
       * 
       * + `proposal_weight_bound`: The maximum amount of weight consumed by executing the closed
       * proposal.
       * + `length_bound`: The upper bound for the length of the proposal in storage. Checked via
       * `storage::read` so it is `size_of::<u32>() == 4` larger than the pure length.
       * 
       * ## Complexity
       * - `O(B + M + P1 + P2)` where:
       * - `B` is `proposal` size in bytes (length-fee-bounded)
       * - `M` is members-count (code- and governance-bounded)
       * - `P1` is the complexity of `proposal` preimage.
       * - `P2` is proposal-count (code-bounded)
       **/
      close: AugmentedSubmittable<(proposalHash: H256 | string | Uint8Array, index: Compact<u32> | AnyNumber | Uint8Array, proposalWeightBound: SpWeightsWeightV2Weight | { refTime?: any; proofSize?: any } | string | Uint8Array, lengthBound: Compact<u32> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256, Compact<u32>, SpWeightsWeightV2Weight, Compact<u32>]>;
      /**
       * Close a vote that is either approved, disapproved or whose voting period has ended.
       * 
       * May be called by any signed account in order to finish voting and close the proposal.
       * 
       * If called before the end of the voting period it will only close the vote if it is
       * has enough votes to be approved or disapproved.
       * 
       * If called after the end of the voting period abstentions are counted as rejections
       * unless there is a prime member set and the prime member cast an approval.
       * 
       * If the close operation completes successfully with disapproval, the transaction fee will
       * be waived. Otherwise execution of the approved operation will be charged to the caller.
       * 
       * + `proposal_weight_bound`: The maximum amount of weight consumed by executing the closed
       * proposal.
       * + `length_bound`: The upper bound for the length of the proposal in storage. Checked via
       * `storage::read` so it is `size_of::<u32>() == 4` larger than the pure length.
       * 
       * ## Complexity
       * - `O(B + M + P1 + P2)` where:
       * - `B` is `proposal` size in bytes (length-fee-bounded)
       * - `M` is members-count (code- and governance-bounded)
       * - `P1` is the complexity of `proposal` preimage.
       * - `P2` is proposal-count (code-bounded)
       **/
      closeOldWeight: AugmentedSubmittable<(proposalHash: H256 | string | Uint8Array, index: Compact<u32> | AnyNumber | Uint8Array, proposalWeightBound: Compact<u64> | AnyNumber | Uint8Array, lengthBound: Compact<u32> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256, Compact<u32>, Compact<u64>, Compact<u32>]>;
      /**
       * Disapprove a proposal, close, and remove it from the system, regardless of its current
       * state.
       * 
       * Must be called by the Root origin.
       * 
       * Parameters:
       * * `proposal_hash`: The hash of the proposal that should be disapproved.
       * 
       * ## Complexity
       * O(P) where P is the number of max proposals
       **/
      disapproveProposal: AugmentedSubmittable<(proposalHash: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256]>;
      /**
       * Dispatch a proposal from a member using the `Member` origin.
       * 
       * Origin must be a member of the collective.
       * 
       * ## Complexity:
       * - `O(B + M + P)` where:
       * - `B` is `proposal` size in bytes (length-fee-bounded)
       * - `M` members-count (code-bounded)
       * - `P` complexity of dispatching `proposal`
       **/
      execute: AugmentedSubmittable<(proposal: Call | IMethod | string | Uint8Array, lengthBound: Compact<u32> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [Call, Compact<u32>]>;
      /**
       * Add a new proposal to either be voted on or executed directly.
       * 
       * Requires the sender to be member.
       * 
       * `threshold` determines whether `proposal` is executed directly (`threshold < 2`)
       * or put up for voting.
       * 
       * ## Complexity
       * - `O(B + M + P1)` or `O(B + M + P2)` where:
       * - `B` is `proposal` size in bytes (length-fee-bounded)
       * - `M` is members-count (code- and governance-bounded)
       * - branching is influenced by `threshold` where:
       * - `P1` is proposal execution complexity (`threshold < 2`)
       * - `P2` is proposals-count (code-bounded) (`threshold >= 2`)
       **/
      propose: AugmentedSubmittable<(threshold: Compact<u32> | AnyNumber | Uint8Array, proposal: Call | IMethod | string | Uint8Array, lengthBound: Compact<u32> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [Compact<u32>, Call, Compact<u32>]>;
      /**
       * Set the collective's membership.
       * 
       * - `new_members`: The new member list. Be nice to the chain and provide it sorted.
       * - `prime`: The prime member whose vote sets the default.
       * - `old_count`: The upper bound for the previous number of members in storage. Used for
       * weight estimation.
       * 
       * The dispatch of this call must be `SetMembersOrigin`.
       * 
       * NOTE: Does not enforce the expected `MaxMembers` limit on the amount of members, but
       * the weight estimations rely on it to estimate dispatchable weight.
       * 
       * # WARNING:
       * 
       * The `pallet-collective` can also be managed by logic outside of the pallet through the
       * implementation of the trait [`ChangeMembers`].
       * Any call to `set_members` must be careful that the member set doesn't get out of sync
       * with other logic managing the member set.
       * 
       * ## Complexity:
       * - `O(MP + N)` where:
       * - `M` old-members-count (code- and governance-bounded)
       * - `N` new-members-count (code- and governance-bounded)
       * - `P` proposals-count (code-bounded)
       **/
      setMembers: AugmentedSubmittable<(newMembers: Vec<AccountId32> | (AccountId32 | string | Uint8Array)[], prime: Option<AccountId32> | null | Uint8Array | AccountId32 | string, oldCount: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [Vec<AccountId32>, Option<AccountId32>, u32]>;
      /**
       * Add an aye or nay vote for the sender to the given proposal.
       * 
       * Requires the sender to be a member.
       * 
       * Transaction fees will be waived if the member is voting on any particular proposal
       * for the first time and the call is successful. Subsequent vote changes will charge a
       * fee.
       * ## Complexity
       * - `O(M)` where `M` is members-count (code- and governance-bounded)
       **/
      vote: AugmentedSubmittable<(proposal: H256 | string | Uint8Array, index: Compact<u32> | AnyNumber | Uint8Array, approve: bool | boolean | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256, Compact<u32>, bool]>;
    };
    technicalMembership: {
      /**
       * Add a member `who` to the set.
       * 
       * May only be called from `T::AddOrigin`.
       **/
      addMember: AugmentedSubmittable<(who: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress]>;
      /**
       * Swap out the sending member for some other key `new`.
       * 
       * May only be called from `Signed` origin of a current member.
       * 
       * Prime membership is passed from the origin account to `new`, if extant.
       **/
      changeKey: AugmentedSubmittable<(updated: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress]>;
      /**
       * Remove the prime member if it exists.
       * 
       * May only be called from `T::PrimeOrigin`.
       **/
      clearPrime: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Remove a member `who` from the set.
       * 
       * May only be called from `T::RemoveOrigin`.
       **/
      removeMember: AugmentedSubmittable<(who: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress]>;
      /**
       * Change the membership to a new set, disregarding the existing membership. Be nice and
       * pass `members` pre-sorted.
       * 
       * May only be called from `T::ResetOrigin`.
       **/
      resetMembers: AugmentedSubmittable<(members: Vec<AccountId32> | (AccountId32 | string | Uint8Array)[]) => SubmittableExtrinsic<ApiType>, [Vec<AccountId32>]>;
      /**
       * Set the prime member. Must be a current member.
       * 
       * May only be called from `T::PrimeOrigin`.
       **/
      setPrime: AugmentedSubmittable<(who: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress]>;
      /**
       * Swap out one member `remove` for another `add`.
       * 
       * May only be called from `T::SwapOrigin`.
       * 
       * Prime membership is *not* passed from `remove` to `add`, if extant.
       **/
      swapMember: AugmentedSubmittable<(remove: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, add: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, MultiAddress]>;
    };
    timestamp: {
      /**
       * Set the current time.
       * 
       * This call should be invoked exactly once per block. It will panic at the finalization
       * phase, if this call hasn't been invoked by that time.
       * 
       * The timestamp should be greater than the previous one by the amount specified by
       * `MinimumPeriod`.
       * 
       * The dispatch origin for this call must be `Inherent`.
       * 
       * ## Complexity
       * - `O(1)` (Note that implementations of `OnTimestampSet` must also be `O(1)`)
       * - 1 storage read and 1 storage mutation (codec `O(1)`). (because of `DidUpdate::take` in
       * `on_finalize`)
       * - 1 event handler `on_timestamp_set`. Must be `O(1)`.
       **/
      set: AugmentedSubmittable<(now: Compact<u64> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [Compact<u64>]>;
    };
    tips: {
      /**
       * Close and payout a tip.
       * 
       * The dispatch origin for this call must be _Signed_.
       * 
       * The tip identified by `hash` must have finished its countdown period.
       * 
       * - `hash`: The identity of the open tip for which a tip value is declared. This is formed
       * as the hash of the tuple of the original tip `reason` and the beneficiary account ID.
       * 
       * ## Complexity
       * - : `O(T)` where `T` is the number of tippers. decoding `Tipper` vec of length `T`. `T`
       * is charged as upper bound given by `ContainsLengthBound`. The actual cost depends on
       * the implementation of `T::Tippers`.
       **/
      closeTip: AugmentedSubmittable<(hash: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256]>;
      /**
       * Report something `reason` that deserves a tip and claim any eventual the finder's fee.
       * 
       * The dispatch origin for this call must be _Signed_.
       * 
       * Payment: `TipReportDepositBase` will be reserved from the origin account, as well as
       * `DataDepositPerByte` for each byte in `reason`.
       * 
       * - `reason`: The reason for, or the thing that deserves, the tip; generally this will be
       * a UTF-8-encoded URL.
       * - `who`: The account which should be credited for the tip.
       * 
       * Emits `NewTip` if successful.
       * 
       * ## Complexity
       * - `O(R)` where `R` length of `reason`.
       * - encoding and hashing of 'reason'
       **/
      reportAwesome: AugmentedSubmittable<(reason: Bytes | string | Uint8Array, who: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Bytes, MultiAddress]>;
      /**
       * Retract a prior tip-report from `report_awesome`, and cancel the process of tipping.
       * 
       * If successful, the original deposit will be unreserved.
       * 
       * The dispatch origin for this call must be _Signed_ and the tip identified by `hash`
       * must have been reported by the signing account through `report_awesome` (and not
       * through `tip_new`).
       * 
       * - `hash`: The identity of the open tip for which a tip value is declared. This is formed
       * as the hash of the tuple of the original tip `reason` and the beneficiary account ID.
       * 
       * Emits `TipRetracted` if successful.
       * 
       * ## Complexity
       * - `O(1)`
       * - Depends on the length of `T::Hash` which is fixed.
       **/
      retractTip: AugmentedSubmittable<(hash: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256]>;
      /**
       * Remove and slash an already-open tip.
       * 
       * May only be called from `T::RejectOrigin`.
       * 
       * As a result, the finder is slashed and the deposits are lost.
       * 
       * Emits `TipSlashed` if successful.
       * 
       * ## Complexity
       * - O(1).
       **/
      slashTip: AugmentedSubmittable<(hash: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256]>;
      /**
       * Declare a tip value for an already-open tip.
       * 
       * The dispatch origin for this call must be _Signed_ and the signing account must be a
       * member of the `Tippers` set.
       * 
       * - `hash`: The identity of the open tip for which a tip value is declared. This is formed
       * as the hash of the tuple of the hash of the original tip `reason` and the beneficiary
       * account ID.
       * - `tip_value`: The amount of tip that the sender would like to give. The median tip
       * value of active tippers will be given to the `who`.
       * 
       * Emits `TipClosing` if the threshold of tippers has been reached and the countdown period
       * has started.
       * 
       * ## Complexity
       * - `O(T)` where `T` is the number of tippers. decoding `Tipper` vec of length `T`, insert
       * tip and check closing, `T` is charged as upper bound given by `ContainsLengthBound`.
       * The actual cost depends on the implementation of `T::Tippers`.
       * 
       * Actually weight could be lower as it depends on how many tips are in `OpenTip` but it
       * is weighted as if almost full i.e of length `T-1`.
       **/
      tip: AugmentedSubmittable<(hash: H256 | string | Uint8Array, tipValue: Compact<u128> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256, Compact<u128>]>;
      /**
       * Give a tip for something new; no finder's fee will be taken.
       * 
       * The dispatch origin for this call must be _Signed_ and the signing account must be a
       * member of the `Tippers` set.
       * 
       * - `reason`: The reason for, or the thing that deserves, the tip; generally this will be
       * a UTF-8-encoded URL.
       * - `who`: The account which should be credited for the tip.
       * - `tip_value`: The amount of tip that the sender would like to give. The median tip
       * value of active tippers will be given to the `who`.
       * 
       * Emits `NewTip` if successful.
       * 
       * ## Complexity
       * - `O(R + T)` where `R` length of `reason`, `T` is the number of tippers.
       * - `O(T)`: decoding `Tipper` vec of length `T`. `T` is charged as upper bound given by
       * `ContainsLengthBound`. The actual cost depends on the implementation of
       * `T::Tippers`.
       * - `O(R)`: hashing and encoding of reason of length `R`
       **/
      tipNew: AugmentedSubmittable<(reason: Bytes | string | Uint8Array, who: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, tipValue: Compact<u128> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [Bytes, MultiAddress, Compact<u128>]>;
    };
    tipsMembership: {
      /**
       * Add a member `who` to the set.
       * 
       * May only be called from `T::AddOrigin`.
       **/
      addMember: AugmentedSubmittable<(who: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress]>;
      /**
       * Swap out the sending member for some other key `new`.
       * 
       * May only be called from `Signed` origin of a current member.
       * 
       * Prime membership is passed from the origin account to `new`, if extant.
       **/
      changeKey: AugmentedSubmittable<(updated: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress]>;
      /**
       * Remove the prime member if it exists.
       * 
       * May only be called from `T::PrimeOrigin`.
       **/
      clearPrime: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Remove a member `who` from the set.
       * 
       * May only be called from `T::RemoveOrigin`.
       **/
      removeMember: AugmentedSubmittable<(who: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress]>;
      /**
       * Change the membership to a new set, disregarding the existing membership. Be nice and
       * pass `members` pre-sorted.
       * 
       * May only be called from `T::ResetOrigin`.
       **/
      resetMembers: AugmentedSubmittable<(members: Vec<AccountId32> | (AccountId32 | string | Uint8Array)[]) => SubmittableExtrinsic<ApiType>, [Vec<AccountId32>]>;
      /**
       * Set the prime member. Must be a current member.
       * 
       * May only be called from `T::PrimeOrigin`.
       **/
      setPrime: AugmentedSubmittable<(who: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress]>;
      /**
       * Swap out one member `remove` for another `add`.
       * 
       * May only be called from `T::SwapOrigin`.
       * 
       * Prime membership is *not* passed from `remove` to `add`, if extant.
       **/
      swapMember: AugmentedSubmittable<(remove: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, add: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, MultiAddress]>;
    };
    treasury: {
      /**
       * Approve a proposal. At a later time, the proposal will be allocated to the beneficiary
       * and the original deposit will be returned.
       * 
       * May only be called from `T::ApproveOrigin`.
       * 
       * ## Complexity
       * - O(1).
       **/
      approveProposal: AugmentedSubmittable<(proposalId: Compact<u32> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [Compact<u32>]>;
      /**
       * Put forward a suggestion for spending. A deposit proportional to the value
       * is reserved and slashed if the proposal is rejected. It is returned once the
       * proposal is awarded.
       * 
       * ## Complexity
       * - O(1)
       **/
      proposeSpend: AugmentedSubmittable<(value: Compact<u128> | AnyNumber | Uint8Array, beneficiary: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Compact<u128>, MultiAddress]>;
      /**
       * Reject a proposed spend. The original deposit will be slashed.
       * 
       * May only be called from `T::RejectOrigin`.
       * 
       * ## Complexity
       * - O(1)
       **/
      rejectProposal: AugmentedSubmittable<(proposalId: Compact<u32> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [Compact<u32>]>;
      /**
       * Force a previously approved proposal to be removed from the approval queue.
       * The original deposit will no longer be returned.
       * 
       * May only be called from `T::RejectOrigin`.
       * - `proposal_id`: The index of a proposal
       * 
       * ## Complexity
       * - O(A) where `A` is the number of approvals
       * 
       * Errors:
       * - `ProposalNotApproved`: The `proposal_id` supplied was not found in the approval queue,
       * i.e., the proposal has not been approved. This could also mean the proposal does not
       * exist altogether, thus there is no way it would have been approved in the first place.
       **/
      removeApproval: AugmentedSubmittable<(proposalId: Compact<u32> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [Compact<u32>]>;
      /**
       * Propose and approve a spend of treasury funds.
       * 
       * - `origin`: Must be `SpendOrigin` with the `Success` value being at least `amount`.
       * - `amount`: The amount to be transferred from the treasury to the `beneficiary`.
       * - `beneficiary`: The destination account for the transfer.
       * 
       * NOTE: For record-keeping purposes, the proposer is deemed to be equivalent to the
       * beneficiary.
       **/
      spend: AugmentedSubmittable<(amount: Compact<u128> | AnyNumber | Uint8Array, beneficiary: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Compact<u128>, MultiAddress]>;
    };
    utility: {
      /**
       * Send a call through an indexed pseudonym of the sender.
       * 
       * Filter from origin are passed along. The call will be dispatched with an origin which
       * use the same filter as the origin of this call.
       * 
       * NOTE: If you need to ensure that any account-based filtering is not honored (i.e.
       * because you expect `proxy` to have been used prior in the call stack and you do not want
       * the call restrictions to apply to any sub-accounts), then use `as_multi_threshold_1`
       * in the Multisig pallet instead.
       * 
       * NOTE: Prior to version *12, this was called `as_limited_sub`.
       * 
       * The dispatch origin for this call must be _Signed_.
       **/
      asDerivative: AugmentedSubmittable<(index: u16 | AnyNumber | Uint8Array, call: Call | IMethod | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [u16, Call]>;
      /**
       * Send a batch of dispatch calls.
       * 
       * May be called from any origin except `None`.
       * 
       * - `calls`: The calls to be dispatched from the same origin. The number of call must not
       * exceed the constant: `batched_calls_limit` (available in constant metadata).
       * 
       * If origin is root then the calls are dispatched without checking origin filter. (This
       * includes bypassing `frame_system::Config::BaseCallFilter`).
       * 
       * ## Complexity
       * - O(C) where C is the number of calls to be batched.
       * 
       * This will return `Ok` in all circumstances. To determine the success of the batch, an
       * event is deposited. If a call failed and the batch was interrupted, then the
       * `BatchInterrupted` event is deposited, along with the number of successful calls made
       * and the error of the failed call. If all were successful, then the `BatchCompleted`
       * event is deposited.
       **/
      batch: AugmentedSubmittable<(calls: Vec<Call> | (Call | IMethod | string | Uint8Array)[]) => SubmittableExtrinsic<ApiType>, [Vec<Call>]>;
      /**
       * Send a batch of dispatch calls and atomically execute them.
       * The whole transaction will rollback and fail if any of the calls failed.
       * 
       * May be called from any origin except `None`.
       * 
       * - `calls`: The calls to be dispatched from the same origin. The number of call must not
       * exceed the constant: `batched_calls_limit` (available in constant metadata).
       * 
       * If origin is root then the calls are dispatched without checking origin filter. (This
       * includes bypassing `frame_system::Config::BaseCallFilter`).
       * 
       * ## Complexity
       * - O(C) where C is the number of calls to be batched.
       **/
      batchAll: AugmentedSubmittable<(calls: Vec<Call> | (Call | IMethod | string | Uint8Array)[]) => SubmittableExtrinsic<ApiType>, [Vec<Call>]>;
      /**
       * Dispatches a function call with a provided origin.
       * 
       * The dispatch origin for this call must be _Root_.
       * 
       * ## Complexity
       * - O(1).
       **/
      dispatchAs: AugmentedSubmittable<(asOrigin: SpiritnetRuntimeOriginCaller | { system: any } | { Void: any } | { Council: any } | { TechnicalCommittee: any } | { Did: any } | { PolkadotXcm: any } | { CumulusXcm: any } | string | Uint8Array, call: Call | IMethod | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [SpiritnetRuntimeOriginCaller, Call]>;
      /**
       * Send a batch of dispatch calls.
       * Unlike `batch`, it allows errors and won't interrupt.
       * 
       * May be called from any origin except `None`.
       * 
       * - `calls`: The calls to be dispatched from the same origin. The number of call must not
       * exceed the constant: `batched_calls_limit` (available in constant metadata).
       * 
       * If origin is root then the calls are dispatch without checking origin filter. (This
       * includes bypassing `frame_system::Config::BaseCallFilter`).
       * 
       * ## Complexity
       * - O(C) where C is the number of calls to be batched.
       **/
      forceBatch: AugmentedSubmittable<(calls: Vec<Call> | (Call | IMethod | string | Uint8Array)[]) => SubmittableExtrinsic<ApiType>, [Vec<Call>]>;
      /**
       * Dispatch a function call with a specified weight.
       * 
       * This function does not check the weight of the call, and instead allows the
       * Root origin to specify the weight of the call.
       * 
       * The dispatch origin for this call must be _Root_.
       **/
      withWeight: AugmentedSubmittable<(call: Call | IMethod | string | Uint8Array, weight: SpWeightsWeightV2Weight | { refTime?: any; proofSize?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Call, SpWeightsWeightV2Weight]>;
    };
    vesting: {
      /**
       * Force a vested transfer.
       * 
       * The dispatch origin for this call must be _Root_.
       * 
       * - `source`: The account whose funds should be transferred.
       * - `target`: The account that should be transferred the vested funds.
       * - `schedule`: The vesting schedule attached to the transfer.
       * 
       * Emits `VestingCreated`.
       * 
       * NOTE: This will unlock all schedules through the current block.
       * 
       * ## Complexity
       * - `O(1)`.
       **/
      forceVestedTransfer: AugmentedSubmittable<(source: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, target: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, schedule: PalletVestingVestingInfo | { locked?: any; perBlock?: any; startingBlock?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, MultiAddress, PalletVestingVestingInfo]>;
      /**
       * Merge two vesting schedules together, creating a new vesting schedule that unlocks over
       * the highest possible start and end blocks. If both schedules have already started the
       * current block will be used as the schedule start; with the caveat that if one schedule
       * is finished by the current block, the other will be treated as the new merged schedule,
       * unmodified.
       * 
       * NOTE: If `schedule1_index == schedule2_index` this is a no-op.
       * NOTE: This will unlock all schedules through the current block prior to merging.
       * NOTE: If both schedules have ended by the current block, no new schedule will be created
       * and both will be removed.
       * 
       * Merged schedule attributes:
       * - `starting_block`: `MAX(schedule1.starting_block, scheduled2.starting_block,
       * current_block)`.
       * - `ending_block`: `MAX(schedule1.ending_block, schedule2.ending_block)`.
       * - `locked`: `schedule1.locked_at(current_block) + schedule2.locked_at(current_block)`.
       * 
       * The dispatch origin for this call must be _Signed_.
       * 
       * - `schedule1_index`: index of the first schedule to merge.
       * - `schedule2_index`: index of the second schedule to merge.
       **/
      mergeSchedules: AugmentedSubmittable<(schedule1Index: u32 | AnyNumber | Uint8Array, schedule2Index: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32, u32]>;
      /**
       * Unlock any vested funds of the sender account.
       * 
       * The dispatch origin for this call must be _Signed_ and the sender must have funds still
       * locked under this pallet.
       * 
       * Emits either `VestingCompleted` or `VestingUpdated`.
       * 
       * ## Complexity
       * - `O(1)`.
       **/
      vest: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Create a vested transfer.
       * 
       * The dispatch origin for this call must be _Signed_.
       * 
       * - `target`: The account receiving the vested funds.
       * - `schedule`: The vesting schedule attached to the transfer.
       * 
       * Emits `VestingCreated`.
       * 
       * NOTE: This will unlock all schedules through the current block.
       * 
       * ## Complexity
       * - `O(1)`.
       **/
      vestedTransfer: AugmentedSubmittable<(target: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, schedule: PalletVestingVestingInfo | { locked?: any; perBlock?: any; startingBlock?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, PalletVestingVestingInfo]>;
      /**
       * Unlock any vested funds of a `target` account.
       * 
       * The dispatch origin for this call must be _Signed_.
       * 
       * - `target`: The account whose vested funds should be unlocked. Must have funds still
       * locked under this pallet.
       * 
       * Emits either `VestingCompleted` or `VestingUpdated`.
       * 
       * ## Complexity
       * - `O(1)`.
       **/
      vestOther: AugmentedSubmittable<(target: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress]>;
    };
    web3Names: {
      /**
       * Ban a name.
       * 
       * A banned name cannot be claimed by anyone. The name's deposit
       * is returned to the original payer.
       * 
       * The origin must be the ban origin.
       * 
       * Emits `Web3NameBanned` if the operation is carried out
       * successfully.
       * 
       * # <weight>
       * Weight: O(1)
       * - Reads: Banned, Owner, Names storage entries + origin check
       * - Writes: Names, Owner, Banned storage entries + currency deposit
       * release
       * # </weight>
       **/
      ban: AugmentedSubmittable<(name: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Bytes]>;
      /**
       * Changes the deposit owner.
       * 
       * The balance that is reserved by the current deposit owner will be
       * freed and balance of the new deposit owner will get reserved.
       * 
       * The subject of the call must be the owner of the web3name.
       * The sender of the call will be the new deposit owner.
       **/
      changeDepositOwner: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Assign the specified name to the owner as specified in the
       * origin.
       * 
       * The name must not have already been claimed by someone else and the
       * owner must not already own another name.
       * 
       * Emits `Web3NameClaimed` if the operation is carried out
       * successfully.
       * 
       * # <weight>
       * Weight: O(1)
       * - Reads: Names, Owner, Banned storage entries + available currency
       * check + origin check
       * - Writes: Names, Owner storage entries + currency deposit reserve
       * # </weight>
       **/
      claim: AugmentedSubmittable<(name: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Bytes]>;
      /**
       * Release the provided name from its owner.
       * 
       * The origin must be the account that paid for the name's deposit.
       * 
       * Emits `Web3NameReleased` if the operation is carried out
       * successfully.
       * 
       * # <weight>
       * Weight: O(1)
       * - Reads: Owner storage entry + origin check
       * - Writes: Names, Owner storage entries + currency deposit release
       * # </weight>
       **/
      reclaimDeposit: AugmentedSubmittable<(name: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Bytes]>;
      /**
       * Release the provided name from its owner.
       * 
       * The origin must be the owner of the specified name.
       * 
       * Emits `Web3NameReleased` if the operation is carried out
       * successfully.
       * 
       * # <weight>
       * Weight: O(1)
       * - Reads: Names storage entry + origin check
       * - Writes: Names, Owner storage entries + currency deposit release
       * # </weight>
       **/
      releaseByOwner: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Unban a name.
       * 
       * Make a name claimable again.
       * 
       * The origin must be the ban origin.
       * 
       * Emits `Web3NameUnbanned` if the operation is carried out
       * successfully.
       * 
       * # <weight>
       * Weight: O(1)
       * - Reads: Banned storage entry + origin check
       * - Writes: Banned storage entry deposit release
       * # </weight>
       **/
      unban: AugmentedSubmittable<(name: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Bytes]>;
      /**
       * Updates the deposit amount to the current deposit rate.
       * 
       * The sender must be the deposit owner.
       **/
      updateDeposit: AugmentedSubmittable<(nameInput: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Bytes]>;
    };
    xcmpQueue: {
      /**
       * Resumes all XCM executions for the XCMP queue.
       * 
       * Note that this function doesn't change the status of the in/out bound channels.
       * 
       * - `origin`: Must pass `ControllerOrigin`.
       **/
      resumeXcmExecution: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Services a single overweight XCM.
       * 
       * - `origin`: Must pass `ExecuteOverweightOrigin`.
       * - `index`: The index of the overweight XCM to service
       * - `weight_limit`: The amount of weight that XCM execution may take.
       * 
       * Errors:
       * - `BadOverweightIndex`: XCM under `index` is not found in the `Overweight` storage map.
       * - `BadXcm`: XCM under `index` cannot be properly decoded into a valid XCM format.
       * - `WeightOverLimit`: XCM execution may use greater `weight_limit`.
       * 
       * Events:
       * - `OverweightServiced`: On success.
       **/
      serviceOverweight: AugmentedSubmittable<(index: u64 | AnyNumber | Uint8Array, weightLimit: SpWeightsWeightV2Weight | { refTime?: any; proofSize?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [u64, SpWeightsWeightV2Weight]>;
      /**
       * Suspends all XCM executions for the XCMP queue, regardless of the sender's origin.
       * 
       * - `origin`: Must pass `ControllerOrigin`.
       **/
      suspendXcmExecution: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Overwrites the number of pages of messages which must be in the queue after which we drop any further
       * messages from the channel.
       * 
       * - `origin`: Must pass `Root`.
       * - `new`: Desired value for `QueueConfigData.drop_threshold`
       **/
      updateDropThreshold: AugmentedSubmittable<(updated: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32]>;
      /**
       * Overwrites the number of pages of messages which the queue must be reduced to before it signals that
       * message sending may recommence after it has been suspended.
       * 
       * - `origin`: Must pass `Root`.
       * - `new`: Desired value for `QueueConfigData.resume_threshold`
       **/
      updateResumeThreshold: AugmentedSubmittable<(updated: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32]>;
      /**
       * Overwrites the number of pages of messages which must be in the queue for the other side to be told to
       * suspend their sending.
       * 
       * - `origin`: Must pass `Root`.
       * - `new`: Desired value for `QueueConfigData.suspend_value`
       **/
      updateSuspendThreshold: AugmentedSubmittable<(updated: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32]>;
      /**
       * Overwrites the amount of remaining weight under which we stop processing messages.
       * 
       * - `origin`: Must pass `Root`.
       * - `new`: Desired value for `QueueConfigData.threshold_weight`
       **/
      updateThresholdWeight: AugmentedSubmittable<(updated: SpWeightsWeightV2Weight | { refTime?: any; proofSize?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [SpWeightsWeightV2Weight]>;
      /**
       * Overwrites the speed to which the available weight approaches the maximum weight.
       * A lower number results in a faster progression. A value of 1 makes the entire weight available initially.
       * 
       * - `origin`: Must pass `Root`.
       * - `new`: Desired value for `QueueConfigData.weight_restrict_decay`.
       **/
      updateWeightRestrictDecay: AugmentedSubmittable<(updated: SpWeightsWeightV2Weight | { refTime?: any; proofSize?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [SpWeightsWeightV2Weight]>;
      /**
       * Overwrite the maximum amount of weight any individual message may consume.
       * Messages above this weight go into the overweight queue and may only be serviced explicitly.
       * 
       * - `origin`: Must pass `Root`.
       * - `new`: Desired value for `QueueConfigData.xcmp_max_individual_weight`.
       **/
      updateXcmpMaxIndividualWeight: AugmentedSubmittable<(updated: SpWeightsWeightV2Weight | { refTime?: any; proofSize?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [SpWeightsWeightV2Weight]>;
    };
  } // AugmentedSubmittables
} // declare module
