// Auto-generated via `yarn polkadot-types-from-chain`, do not edit
/* eslint-disable */

// import type lookup before we augment - in some environments
// this is required to allow for ambient/previous definitions
import '@polkadot/api-base/types/submittable';

import type { ApiTypes, AugmentedSubmittable, SubmittableExtrinsic, SubmittableExtrinsicFunction } from '@polkadot/api-base/types';
import type { Bytes, Compact, Option, Vec, bool, u128, u16, u32, u64 } from '@polkadot/types-codec';
import type { AnyNumber, IMethod, ITuple } from '@polkadot/types-codec/types';
import type { AccountId32, Call, H256, MultiAddress, Perbill } from '@polkadot/types/interfaces/runtime';
import type { PalletDidLookupAssociateAccountRequest, MashnetNodeRuntimeOriginCaller, MashnetNodeRuntimeOpaqueSessionKeys, RuntimeCommonAuthorizationPalletAuthorize, MashnetNodeRuntimeProxyType, PalletDidLookupLinkableAccountLinkableAccountId, DelegationDelegationHierarchyPermissions, DidDidDetailsDidAuthorizedCallOperation, DidDidDetailsDidCreationDetails, DidDidDetailsDidEncryptionKey, DidDidDetailsDidSignature, DidDidDetailsDidVerificationKey, DidServiceEndpointsDidEndpoint, SpCoreVoid, SpRuntimeHeader } from '@polkadot/types/lookup';

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
    };
    authorship: {
      /**
       * Provide a set of uncles.
       **/
      setUncles: AugmentedSubmittable<(newUncles: Vec<SpRuntimeHeader> | (SpRuntimeHeader | { parentHash?: any; number?: any; stateRoot?: any; extrinsicsRoot?: any; digest?: any } | string | Uint8Array)[]) => SubmittableExtrinsic<ApiType>, [Vec<SpRuntimeHeader>]>;
    };
    balances: {
      /**
       * Exactly as `transfer`, except the origin must be root and the source account may be
       * specified.
       * # <weight>
       * - Same as transfer, but additional read and write because the source account is not
       * assumed to be in the overlay.
       * # </weight>
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
       * # <weight>
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
       * ---------------------------------
       * - Origin account is already in memory, so no DB operations for them.
       * # </weight>
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
       * keep the sender account alive (true). # <weight>
       * - O(1). Just like transfer, but reading the user's transferable balance first.
       * #</weight>
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
      addDelegation: AugmentedSubmittable<(delegationId: H256 | string | Uint8Array, parentId: H256 | string | Uint8Array, delegate: AccountId32 | string | Uint8Array, permissions: DelegationDelegationHierarchyPermissions | { bits?: any } | string | Uint8Array, delegateSignature: DidDidDetailsDidSignature | { Ed25519: any } | { Sr25519: any } | { Ecdsa: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256, H256, AccountId32, DelegationDelegationHierarchyPermissions, DidDidDetailsDidSignature]>;
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
      addKeyAgreementKey: AugmentedSubmittable<(newKey: DidDidDetailsDidEncryptionKey | { X25519: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [DidDidDetailsDidEncryptionKey]>;
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
      create: AugmentedSubmittable<(details: DidDidDetailsDidCreationDetails | { did?: any; submitter?: any; newKeyAgreementKeys?: any; newAttestationKey?: any; newDelegationKey?: any; newServiceDetails?: any } | string | Uint8Array, signature: DidDidDetailsDidSignature | { Ed25519: any } | { Sr25519: any } | { Ecdsa: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [DidDidDetailsDidCreationDetails, DidDidDetailsDidSignature]>;
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
      setAttestationKey: AugmentedSubmittable<(newKey: DidDidDetailsDidVerificationKey | { Ed25519: any } | { Sr25519: any } | { Ecdsa: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [DidDidDetailsDidVerificationKey]>;
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
      setAuthenticationKey: AugmentedSubmittable<(newKey: DidDidDetailsDidVerificationKey | { Ed25519: any } | { Sr25519: any } | { Ecdsa: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [DidDidDetailsDidVerificationKey]>;
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
      setDelegationKey: AugmentedSubmittable<(newKey: DidDidDetailsDidVerificationKey | { Ed25519: any } | { Sr25519: any } | { Ecdsa: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [DidDidDetailsDidVerificationKey]>;
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
      submitDidCall: AugmentedSubmittable<(didCall: DidDidDetailsDidAuthorizedCallOperation | { did?: any; txCounter?: any; call?: any; blockNumber?: any; submitter?: any } | string | Uint8Array, signature: DidDidDetailsDidSignature | { Ed25519: any } | { Sr25519: any } | { Ecdsa: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [DidDidDetailsDidAuthorizedCallOperation, DidDidDetailsDidSignature]>;
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
      associateAccount: AugmentedSubmittable<(req: PalletDidLookupAssociateAccountRequest | { Dotsama: any } | { Ethereum: any } | string | Uint8Array, expiration: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [PalletDidLookupAssociateAccountRequest, u64]>;
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
      reclaimDeposit: AugmentedSubmittable<(account: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [AccountId32]>;
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
    };
    grandpa: {
      /**
       * Note that the current authority set of the GRANDPA finality gadget has stalled.
       * 
       * This will trigger a forced authority set change at the beginning of the next session, to
       * be enacted `delay` blocks after that. The `delay` should be high enough to safely assume
       * that the block signalling the forced change will not be re-orged e.g. 1000 blocks.
       * The block production rate (which may be slowed down because of finality lagging) should
       * be taken into account when choosing the `delay`. The GRANDPA voters based on the new
       * authority will start voting on top of `best_finalized_block_number` for new finalized
       * blocks. `best_finalized_block_number` should be the highest of the latest finalized
       * block of all validators of the new authority set.
       * 
       * Only callable by root.
       **/
      noteStalled: AugmentedSubmittable<(delay: u64 | AnyNumber | Uint8Array, bestFinalizedBlockNumber: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u64, u64]>;
      /**
       * Report voter equivocation/misbehavior. This method will verify the
       * equivocation proof and validate the given key ownership proof
       * against the extracted offender. If both are valid, the offence
       * will be reported.
       **/
      reportEquivocation: AugmentedSubmittable<(equivocationProof: SpFinalityGrandpaEquivocationProof | { setId?: any; equivocation?: any } | string | Uint8Array, keyOwnerProof: SpCoreVoid | null) => SubmittableExtrinsic<ApiType>, [SpFinalityGrandpaEquivocationProof, SpCoreVoid]>;
      /**
       * Report voter equivocation/misbehavior. This method will verify the
       * equivocation proof and validate the given key ownership proof
       * against the extracted offender. If both are valid, the offence
       * will be reported.
       * 
       * This extrinsic must be called unsigned and it is expected that only
       * block authors will call it (validated in `ValidateUnsigned`), as such
       * if the block author is defined it will be defined as the equivocation
       * reporter.
       **/
      reportEquivocationUnsigned: AugmentedSubmittable<(equivocationProof: SpFinalityGrandpaEquivocationProof | { setId?: any; equivocation?: any } | string | Uint8Array, keyOwnerProof: SpCoreVoid | null) => SubmittableExtrinsic<ApiType>, [SpFinalityGrandpaEquivocationProof, SpCoreVoid]>;
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
       * # <weight>
       * - `O(1)`.
       * - One storage mutation (codec `O(1)`).
       * - One reserve operation.
       * - One event.
       * -------------------
       * - DB Weight: 1 Read/Write (Accounts)
       * # </weight>
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
       * # <weight>
       * - `O(1)`.
       * - One storage mutation (codec `O(1)`).
       * - Up to one reserve operation.
       * - One event.
       * -------------------
       * - DB Weight:
       * - Reads: Indices Accounts, System Account (original owner)
       * - Writes: Indices Accounts, System Account (original owner)
       * # </weight>
       **/
      forceTransfer: AugmentedSubmittable<(updated: AccountId32 | string | Uint8Array, index: u64 | AnyNumber | Uint8Array, freeze: bool | boolean | Uint8Array) => SubmittableExtrinsic<ApiType>, [AccountId32, u64, bool]>;
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
       * # <weight>
       * - `O(1)`.
       * - One storage mutation (codec `O(1)`).
       * - One reserve operation.
       * - One event.
       * -------------------
       * - DB Weight: 1 Read/Write (Accounts)
       * # </weight>
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
       * # <weight>
       * - `O(1)`.
       * - One storage mutation (codec `O(1)`).
       * - Up to one slash operation.
       * - One event.
       * -------------------
       * - DB Weight: 1 Read/Write (Accounts)
       * # </weight>
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
       * # <weight>
       * - `O(1)`.
       * - One storage mutation (codec `O(1)`).
       * - One transfer operation.
       * - One event.
       * -------------------
       * - DB Weight:
       * - Reads: Indices Accounts, System Account (recipient)
       * - Writes: Indices Accounts, System Account (recipient)
       * # </weight>
       **/
      transfer: AugmentedSubmittable<(updated: AccountId32 | string | Uint8Array, index: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [AccountId32, u64]>;
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
       * 
       * # <weight>
       * Weight is a function of the number of proxies the user has (P).
       * # </weight>
       **/
      addProxy: AugmentedSubmittable<(delegate: AccountId32 | string | Uint8Array, proxyType: MashnetNodeRuntimeProxyType | 'Any' | 'NonTransfer' | 'CancelProxy' | 'NonDepositClaiming' | number | Uint8Array, delay: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [AccountId32, MashnetNodeRuntimeProxyType, u64]>;
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
       * 
       * # <weight>
       * Weight is a function of:
       * - A: the number of announcements made.
       * - P: the number of proxies the user has.
       * # </weight>
       **/
      announce: AugmentedSubmittable<(real: AccountId32 | string | Uint8Array, callHash: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [AccountId32, H256]>;
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
       * 
       * # <weight>
       * Weight is a function of the number of proxies the user has (P).
       * # </weight>
       * TODO: Might be over counting 1 read
       **/
      anonymous: AugmentedSubmittable<(proxyType: MashnetNodeRuntimeProxyType | 'Any' | 'NonTransfer' | 'CancelProxy' | 'NonDepositClaiming' | number | Uint8Array, delay: u64 | AnyNumber | Uint8Array, index: u16 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [MashnetNodeRuntimeProxyType, u64, u16]>;
      /**
       * Removes a previously spawned anonymous proxy.
       * 
       * WARNING: **All access to this account will be lost.** Any funds held in it will be
       * inaccessible.
       * 
       * Requires a `Signed` origin, and the sender account must have been created by a call to
       * `anonymous` with corresponding parameters.
       * 
       * - `spawner`: The account that originally called `anonymous` to create this account.
       * - `index`: The disambiguation index originally passed to `anonymous`. Probably `0`.
       * - `proxy_type`: The proxy type originally passed to `anonymous`.
       * - `height`: The height of the chain when the call to `anonymous` was processed.
       * - `ext_index`: The extrinsic index in which the call to `anonymous` was processed.
       * 
       * Fails with `NoPermission` in case the caller is not a previously created anonymous
       * account whose `anonymous` call has corresponding parameters.
       * 
       * # <weight>
       * Weight is a function of the number of proxies the user has (P).
       * # </weight>
       **/
      killAnonymous: AugmentedSubmittable<(spawner: AccountId32 | string | Uint8Array, proxyType: MashnetNodeRuntimeProxyType | 'Any' | 'NonTransfer' | 'CancelProxy' | 'NonDepositClaiming' | number | Uint8Array, index: u16 | AnyNumber | Uint8Array, height: Compact<u64> | AnyNumber | Uint8Array, extIndex: Compact<u32> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [AccountId32, MashnetNodeRuntimeProxyType, u16, Compact<u64>, Compact<u32>]>;
      /**
       * Dispatch the given `call` from an account that the sender is authorised for through
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
       * 
       * # <weight>
       * Weight is a function of the number of proxies the user has (P).
       * # </weight>
       **/
      proxy: AugmentedSubmittable<(real: AccountId32 | string | Uint8Array, forceProxyType: Option<MashnetNodeRuntimeProxyType> | null | Uint8Array | MashnetNodeRuntimeProxyType | 'Any' | 'NonTransfer' | 'CancelProxy' | 'NonDepositClaiming' | number, call: Call | IMethod | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [AccountId32, Option<MashnetNodeRuntimeProxyType>, Call]>;
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
       * 
       * # <weight>
       * Weight is a function of:
       * - A: the number of announcements made.
       * - P: the number of proxies the user has.
       * # </weight>
       **/
      proxyAnnounced: AugmentedSubmittable<(delegate: AccountId32 | string | Uint8Array, real: AccountId32 | string | Uint8Array, forceProxyType: Option<MashnetNodeRuntimeProxyType> | null | Uint8Array | MashnetNodeRuntimeProxyType | 'Any' | 'NonTransfer' | 'CancelProxy' | 'NonDepositClaiming' | number, call: Call | IMethod | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [AccountId32, AccountId32, Option<MashnetNodeRuntimeProxyType>, Call]>;
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
       * 
       * # <weight>
       * Weight is a function of:
       * - A: the number of announcements made.
       * - P: the number of proxies the user has.
       * # </weight>
       **/
      rejectAnnouncement: AugmentedSubmittable<(delegate: AccountId32 | string | Uint8Array, callHash: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [AccountId32, H256]>;
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
       * 
       * # <weight>
       * Weight is a function of:
       * - A: the number of announcements made.
       * - P: the number of proxies the user has.
       * # </weight>
       **/
      removeAnnouncement: AugmentedSubmittable<(real: AccountId32 | string | Uint8Array, callHash: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [AccountId32, H256]>;
      /**
       * Unregister all proxy accounts for the sender.
       * 
       * The dispatch origin for this call must be _Signed_.
       * 
       * WARNING: This may be called on accounts created by `anonymous`, however if done, then
       * the unreserved fees will be inaccessible. **All access to this account will be lost.**
       * 
       * # <weight>
       * Weight is a function of the number of proxies the user has (P).
       * # </weight>
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
       * 
       * # <weight>
       * Weight is a function of the number of proxies the user has (P).
       * # </weight>
       **/
      removeProxy: AugmentedSubmittable<(delegate: AccountId32 | string | Uint8Array, proxyType: MashnetNodeRuntimeProxyType | 'Any' | 'NonTransfer' | 'CancelProxy' | 'NonDepositClaiming' | number | Uint8Array, delay: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [AccountId32, MashnetNodeRuntimeProxyType, u64]>;
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
       * # <weight>
       * - Complexity: `O(1)` in number of key types. Actual cost depends on the number of length
       * of `T::Keys::key_ids()` which is fixed.
       * - DbReads: `T::ValidatorIdOf`, `NextKeys`, `origin account`
       * - DbWrites: `NextKeys`, `origin account`
       * - DbWrites per key id: `KeyOwner`
       * # </weight>
       **/
      purgeKeys: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Sets the session key(s) of the function caller to `keys`.
       * Allows an account to set its session key prior to becoming a validator.
       * This doesn't take effect until the next session.
       * 
       * The dispatch origin of this function must be signed.
       * 
       * # <weight>
       * - Complexity: `O(1)`. Actual cost depends on the number of length of
       * `T::Keys::key_ids()` which is fixed.
       * - DbReads: `origin account`, `T::ValidatorIdOf`, `NextKeys`
       * - DbWrites: `origin account`, `NextKeys`
       * - DbReads per key id: `KeyOwner`
       * - DbWrites per key id: `KeyOwner`
       * # </weight>
       **/
      setKeys: AugmentedSubmittable<(keys: MashnetNodeRuntimeOpaqueSessionKeys | { aura?: any; grandpa?: any } | string | Uint8Array, proof: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MashnetNodeRuntimeOpaqueSessionKeys, Bytes]>;
    };
    sudo: {
      /**
       * Authenticates the current sudo key and sets the given AccountId (`new`) as the new sudo
       * key.
       * 
       * The dispatch origin for this call must be _Signed_.
       * 
       * # <weight>
       * - O(1).
       * - Limited storage reads.
       * - One DB change.
       * # </weight>
       **/
      setKey: AugmentedSubmittable<(updated: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress]>;
      /**
       * Authenticates the sudo key and dispatches a function call with `Root` origin.
       * 
       * The dispatch origin for this call must be _Signed_.
       * 
       * # <weight>
       * - O(1).
       * - Limited storage reads.
       * - One DB write (event).
       * - Weight of derivative `call` execution + 10,000.
       * # </weight>
       **/
      sudo: AugmentedSubmittable<(call: Call | IMethod | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Call]>;
      /**
       * Authenticates the sudo key and dispatches a function call with `Signed` origin from
       * a given account.
       * 
       * The dispatch origin for this call must be _Signed_.
       * 
       * # <weight>
       * - O(1).
       * - Limited storage reads.
       * - One DB write (event).
       * - Weight of derivative `call` execution + 10,000.
       * # </weight>
       **/
      sudoAs: AugmentedSubmittable<(who: MultiAddress | { Id: any } | { Index: any } | { Raw: any } | { Address32: any } | { Address20: any } | string | Uint8Array, call: Call | IMethod | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MultiAddress, Call]>;
      /**
       * Authenticates the sudo key and dispatches a function call with `Root` origin.
       * This function does not check the weight of the call, and instead allows the
       * Sudo user to specify the weight of the call.
       * 
       * The dispatch origin for this call must be _Signed_.
       * 
       * # <weight>
       * - O(1).
       * - The weight of this call is defined by the caller.
       * # </weight>
       **/
      sudoUncheckedWeight: AugmentedSubmittable<(call: Call | IMethod | string | Uint8Array, weight: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [Call, u64]>;
    };
    system: {
      /**
       * A dispatch that will fill the block weight up to the given ratio.
       **/
      fillBlock: AugmentedSubmittable<(ratio: Perbill | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [Perbill]>;
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
       * # <weight>
       * - `O(1)`
       * # </weight>
       **/
      remark: AugmentedSubmittable<(remark: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Bytes]>;
      /**
       * Make some on-chain remark and emit event.
       **/
      remarkWithEvent: AugmentedSubmittable<(remark: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Bytes]>;
      /**
       * Set the new runtime code.
       * 
       * # <weight>
       * - `O(C + S)` where `C` length of `code` and `S` complexity of `can_set_code`
       * - 1 call to `can_set_code`: `O(S)` (calls `sp_io::misc::runtime_version` which is
       * expensive).
       * - 1 storage write (codec `O(C)`).
       * - 1 digest item.
       * - 1 event.
       * The weight of this function is dependent on the runtime, but generally this is very
       * expensive. We will treat this as a full block.
       * # </weight>
       **/
      setCode: AugmentedSubmittable<(code: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Bytes]>;
      /**
       * Set the new runtime code without doing any checks of the given `code`.
       * 
       * # <weight>
       * - `O(C)` where `C` length of `code`
       * - 1 storage write (codec `O(C)`).
       * - 1 digest item.
       * - 1 event.
       * The weight of this function is dependent on the runtime. We will treat this as a full
       * block. # </weight>
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
       * # <weight>
       * - `O(1)` (Note that implementations of `OnTimestampSet` must also be `O(1)`)
       * - 1 storage read and 1 storage mutation (codec `O(1)`). (because of `DidUpdate::take` in
       * `on_finalize`)
       * - 1 event handler `on_timestamp_set`. Must be `O(1)`.
       * # </weight>
       **/
      set: AugmentedSubmittable<(now: Compact<u64> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [Compact<u64>]>;
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
       * May be called from any origin.
       * 
       * - `calls`: The calls to be dispatched from the same origin. The number of call must not
       * exceed the constant: `batched_calls_limit` (available in constant metadata).
       * 
       * If origin is root then call are dispatch without checking origin filter. (This includes
       * bypassing `frame_system::Config::BaseCallFilter`).
       * 
       * # <weight>
       * - Complexity: O(C) where C is the number of calls to be batched.
       * # </weight>
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
       * May be called from any origin.
       * 
       * - `calls`: The calls to be dispatched from the same origin. The number of call must not
       * exceed the constant: `batched_calls_limit` (available in constant metadata).
       * 
       * If origin is root then call are dispatch without checking origin filter. (This includes
       * bypassing `frame_system::Config::BaseCallFilter`).
       * 
       * # <weight>
       * - Complexity: O(C) where C is the number of calls to be batched.
       * # </weight>
       **/
      batchAll: AugmentedSubmittable<(calls: Vec<Call> | (Call | IMethod | string | Uint8Array)[]) => SubmittableExtrinsic<ApiType>, [Vec<Call>]>;
      /**
       * Dispatches a function call with a provided origin.
       * 
       * The dispatch origin for this call must be _Root_.
       * 
       * # <weight>
       * - O(1).
       * - Limited storage reads.
       * - One DB write (event).
       * - Weight of derivative `call` execution + T::WeightInfo::dispatch_as().
       * # </weight>
       **/
      dispatchAs: AugmentedSubmittable<(asOrigin: MashnetNodeRuntimeOriginCaller | { system: any } | { Void: any } | { Did: any } | string | Uint8Array, call: Call | IMethod | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [MashnetNodeRuntimeOriginCaller, Call]>;
      /**
       * Send a batch of dispatch calls.
       * Unlike `batch`, it allows errors and won't interrupt.
       * 
       * May be called from any origin.
       * 
       * - `calls`: The calls to be dispatched from the same origin. The number of call must not
       * exceed the constant: `batched_calls_limit` (available in constant metadata).
       * 
       * If origin is root then call are dispatch without checking origin filter. (This includes
       * bypassing `frame_system::Config::BaseCallFilter`).
       * 
       * # <weight>
       * - Complexity: O(C) where C is the number of calls to be batched.
       * # </weight>
       **/
      forceBatch: AugmentedSubmittable<(calls: Vec<Call> | (Call | IMethod | string | Uint8Array)[]) => SubmittableExtrinsic<ApiType>, [Vec<Call>]>;
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
    };
  } // AugmentedSubmittables
} // declare module
