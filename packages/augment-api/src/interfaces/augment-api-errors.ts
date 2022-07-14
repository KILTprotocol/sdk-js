// Auto-generated via `yarn polkadot-types-from-chain`, do not edit
/* eslint-disable */

// import type lookup before we augment - in some environments
// this is required to allow for ambient/previous definitions
import '@polkadot/api-base/types/errors';

import type { ApiTypes, AugmentedError } from '@polkadot/api-base/types';

export type __AugmentedError<ApiType extends ApiTypes> = AugmentedError<ApiType>;

declare module '@polkadot/api-base/types/errors' {
  interface AugmentedErrors<ApiType extends ApiTypes> {
    attestation: {
      /**
       * There is already an attestation with the same claim hash stored on
       * chain.
       **/
      AlreadyAttested: AugmentedError<ApiType>;
      /**
       * The attestation has already been revoked.
       **/
      AlreadyRevoked: AugmentedError<ApiType>;
      /**
       * No attestation on chain matching the claim hash.
       **/
      AttestationNotFound: AugmentedError<ApiType>;
      /**
       * The attestation CType does not match the CType specified in the
       * delegation hierarchy root.
       **/
      CTypeMismatch: AugmentedError<ApiType>;
      /**
       * The delegation node has already been revoked.
       * Only when the revoker is not the original attester.
       **/
      DelegationRevoked: AugmentedError<ApiType>;
      /**
       * The delegation node does not include the permission to create new
       * attestations. Only when the revoker is not the original attester.
       **/
      DelegationUnauthorizedToAttest: AugmentedError<ApiType>;
      /**
       * The maximum number of delegated attestations has already been
       * reached for the corresponding delegation id such that another one
       * cannot be added.
       **/
      MaxDelegatedAttestationsExceeded: AugmentedError<ApiType>;
      /**
       * The delegation node owner is different than the attester.
       * Only when the revoker is not the original attester.
       **/
      NotDelegatedToAttester: AugmentedError<ApiType>;
      /**
       * The call origin is not authorized to change the attestation.
       **/
      Unauthorized: AugmentedError<ApiType>;
    };
    authorship: {
      /**
       * The uncle is genesis.
       **/
      GenesisUncle: AugmentedError<ApiType>;
      /**
       * The uncle parent not in the chain.
       **/
      InvalidUncleParent: AugmentedError<ApiType>;
      /**
       * The uncle isn't recent enough to be included.
       **/
      OldUncle: AugmentedError<ApiType>;
      /**
       * The uncle is too high in chain.
       **/
      TooHighUncle: AugmentedError<ApiType>;
      /**
       * Too many uncles.
       **/
      TooManyUncles: AugmentedError<ApiType>;
      /**
       * The uncle is already included.
       **/
      UncleAlreadyIncluded: AugmentedError<ApiType>;
      /**
       * Uncles already set in the block.
       **/
      UnclesAlreadySet: AugmentedError<ApiType>;
    };
    balances: {
      /**
       * Beneficiary account must pre-exist
       **/
      DeadAccount: AugmentedError<ApiType>;
      /**
       * Value too low to create account due to existential deposit
       **/
      ExistentialDeposit: AugmentedError<ApiType>;
      /**
       * A vesting schedule already exists for this account
       **/
      ExistingVestingSchedule: AugmentedError<ApiType>;
      /**
       * Balance too low to send value
       **/
      InsufficientBalance: AugmentedError<ApiType>;
      /**
       * Transfer/payment would kill account
       **/
      KeepAlive: AugmentedError<ApiType>;
      /**
       * Account liquidity restrictions prevent withdrawal
       **/
      LiquidityRestrictions: AugmentedError<ApiType>;
      /**
       * Number of named reserves exceed MaxReserves
       **/
      TooManyReserves: AugmentedError<ApiType>;
      /**
       * Vesting balance too high to send value
       **/
      VestingBalance: AugmentedError<ApiType>;
    };
    council: {
      /**
       * Members are already initialized!
       **/
      AlreadyInitialized: AugmentedError<ApiType>;
      /**
       * Duplicate proposals not allowed
       **/
      DuplicateProposal: AugmentedError<ApiType>;
      /**
       * Duplicate vote ignored
       **/
      DuplicateVote: AugmentedError<ApiType>;
      /**
       * Account is not a member
       **/
      NotMember: AugmentedError<ApiType>;
      /**
       * Proposal must exist
       **/
      ProposalMissing: AugmentedError<ApiType>;
      /**
       * The close call was made too early, before the end of the voting.
       **/
      TooEarly: AugmentedError<ApiType>;
      /**
       * There can only be a maximum of `MaxProposals` active proposals.
       **/
      TooManyProposals: AugmentedError<ApiType>;
      /**
       * Mismatched index
       **/
      WrongIndex: AugmentedError<ApiType>;
      /**
       * The given length bound for the proposal was too low.
       **/
      WrongProposalLength: AugmentedError<ApiType>;
      /**
       * The given weight bound for the proposal was too low.
       **/
      WrongProposalWeight: AugmentedError<ApiType>;
    };
    ctype: {
      /**
       * The CType already exists.
       **/
      CTypeAlreadyExists: AugmentedError<ApiType>;
      /**
       * There is no CType with the given hash.
       **/
      CTypeNotFound: AugmentedError<ApiType>;
      /**
       * The paying account was unable to pay the fees for creating a ctype.
       **/
      UnableToPayFees: AugmentedError<ApiType>;
    };
    delegation: {
      /**
       * No delegate with the given ID stored on chain.
       **/
      DelegateNotFound: AugmentedError<ApiType>;
      /**
       * There is already a delegation node with the same ID stored on chain.
       **/
      DelegationAlreadyExists: AugmentedError<ApiType>;
      /**
       * No delegation with the given ID stored on chain.
       **/
      DelegationNotFound: AugmentedError<ApiType>;
      /**
       * Max number of removals for delegation nodes has been reached for the
       * operation.
       **/
      ExceededRemovalBounds: AugmentedError<ApiType>;
      /**
       * Max number of revocations for delegation nodes has been reached for
       * the operation.
       **/
      ExceededRevocationBounds: AugmentedError<ApiType>;
      /**
       * There is already a hierarchy with the same ID stored on chain.
       **/
      HierarchyAlreadyExists: AugmentedError<ApiType>;
      /**
       * No hierarchy with the given ID stored on chain.
       **/
      HierarchyNotFound: AugmentedError<ApiType>;
      /**
       * An error that is not supposed to take place, yet it happened.
       **/
      InternalError: AugmentedError<ApiType>;
      /**
       * The delegate's signature for the delegation creation operation is
       * invalid.
       **/
      InvalidDelegateSignature: AugmentedError<ApiType>;
      /**
       * The max number of all children has been reached for the
       * corresponding delegation node.
       **/
      MaxChildrenExceeded: AugmentedError<ApiType>;
      /**
       * The max number of parent checks exceeds the limit for the pallet.
       **/
      MaxParentChecksTooLarge: AugmentedError<ApiType>;
      /**
       * The max number of removals exceeds the limit for the pallet.
       **/
      MaxRemovalsTooLarge: AugmentedError<ApiType>;
      /**
       * The max number of revocation exceeds the limit for the pallet.
       **/
      MaxRevocationsTooLarge: AugmentedError<ApiType>;
      /**
       * Max number of nodes checked without verifying the given condition.
       **/
      MaxSearchDepthReached: AugmentedError<ApiType>;
      /**
       * The delegation creator is not allowed to write the delegation
       * because they are not the owner of the delegation root node.
       **/
      NotOwnerOfDelegationHierarchy: AugmentedError<ApiType>;
      /**
       * The delegation creator is not allowed to write the delegation
       * because they are not the owner of the delegation parent node.
       **/
      NotOwnerOfParentDelegation: AugmentedError<ApiType>;
      /**
       * No parent delegation with the given ID stored on chain.
       **/
      ParentDelegationNotFound: AugmentedError<ApiType>;
      /**
       * The parent delegation has previously been revoked.
       **/
      ParentDelegationRevoked: AugmentedError<ApiType>;
      /**
       * The delegation creator is not allowed to create the delegation.
       **/
      UnauthorizedDelegation: AugmentedError<ApiType>;
      /**
       * The call origin is not authorized to remove the delegation.
       **/
      UnauthorizedRemoval: AugmentedError<ApiType>;
      /**
       * The delegation revoker is not allowed to revoke the delegation.
       **/
      UnauthorizedRevocation: AugmentedError<ApiType>;
    };
    democracy: {
      /**
       * Cannot cancel the same proposal twice
       **/
      AlreadyCanceled: AugmentedError<ApiType>;
      /**
       * The account is already delegating.
       **/
      AlreadyDelegating: AugmentedError<ApiType>;
      /**
       * Identity may not veto a proposal twice
       **/
      AlreadyVetoed: AugmentedError<ApiType>;
      /**
       * Preimage already noted
       **/
      DuplicatePreimage: AugmentedError<ApiType>;
      /**
       * Proposal already made
       **/
      DuplicateProposal: AugmentedError<ApiType>;
      /**
       * Imminent
       **/
      Imminent: AugmentedError<ApiType>;
      /**
       * The instant referendum origin is currently disallowed.
       **/
      InstantNotAllowed: AugmentedError<ApiType>;
      /**
       * Too high a balance was provided that the account cannot afford.
       **/
      InsufficientFunds: AugmentedError<ApiType>;
      /**
       * Invalid hash
       **/
      InvalidHash: AugmentedError<ApiType>;
      /**
       * Maximum number of votes reached.
       **/
      MaxVotesReached: AugmentedError<ApiType>;
      /**
       * No proposals waiting
       **/
      NoneWaiting: AugmentedError<ApiType>;
      /**
       * Delegation to oneself makes no sense.
       **/
      Nonsense: AugmentedError<ApiType>;
      /**
       * The actor has no permission to conduct the action.
       **/
      NoPermission: AugmentedError<ApiType>;
      /**
       * No external proposal
       **/
      NoProposal: AugmentedError<ApiType>;
      /**
       * The account is not currently delegating.
       **/
      NotDelegating: AugmentedError<ApiType>;
      /**
       * Not imminent
       **/
      NotImminent: AugmentedError<ApiType>;
      /**
       * Next external proposal not simple majority
       **/
      NotSimpleMajority: AugmentedError<ApiType>;
      /**
       * The given account did not vote on the referendum.
       **/
      NotVoter: AugmentedError<ApiType>;
      /**
       * Invalid preimage
       **/
      PreimageInvalid: AugmentedError<ApiType>;
      /**
       * Preimage not found
       **/
      PreimageMissing: AugmentedError<ApiType>;
      /**
       * Proposal still blacklisted
       **/
      ProposalBlacklisted: AugmentedError<ApiType>;
      /**
       * Proposal does not exist
       **/
      ProposalMissing: AugmentedError<ApiType>;
      /**
       * Vote given for invalid referendum
       **/
      ReferendumInvalid: AugmentedError<ApiType>;
      /**
       * Too early
       **/
      TooEarly: AugmentedError<ApiType>;
      /**
       * Maximum number of proposals reached.
       **/
      TooManyProposals: AugmentedError<ApiType>;
      /**
       * Value too low
       **/
      ValueLow: AugmentedError<ApiType>;
      /**
       * The account currently has votes attached to it and the operation cannot succeed until
       * these are removed, either through `unvote` or `reap_vote`.
       **/
      VotesExist: AugmentedError<ApiType>;
      /**
       * Invalid upper bound.
       **/
      WrongUpperBound: AugmentedError<ApiType>;
    };
    did: {
      /**
       * The DID call was submitted by the wrong account
       **/
      BadDidOrigin: AugmentedError<ApiType>;
      /**
       * The DID has already been previously deleted.
       **/
      DidAlreadyDeleted: AugmentedError<ApiType>;
      /**
       * The DID with the given identifier is already present on chain.
       **/
      DidAlreadyPresent: AugmentedError<ApiType>;
      /**
       * No DID with the given identifier is present on chain.
       **/
      DidNotPresent: AugmentedError<ApiType>;
      /**
       * An error that is not supposed to take place, yet it happened.
       **/
      InternalError: AugmentedError<ApiType>;
      /**
       * The call had parameters that conflicted with each other
       * or were invalid.
       **/
      InvalidDidAuthorizationCall: AugmentedError<ApiType>;
      /**
       * The DID operation nonce is not equal to the current DID nonce + 1.
       **/
      InvalidNonce: AugmentedError<ApiType>;
      /**
       * One of the service endpoint details contains non-ASCII characters.
       **/
      InvalidServiceEncoding: AugmentedError<ApiType>;
      /**
       * The DID operation signature is invalid for the payload and the
       * verification key provided.
       **/
      InvalidSignature: AugmentedError<ApiType>;
      /**
       * The DID operation signature is not in the format the verification
       * key expects.
       **/
      InvalidSignatureFormat: AugmentedError<ApiType>;
      /**
       * A number of new key agreement keys greater than the maximum allowed
       * has been provided.
       **/
      MaxKeyAgreementKeysLimitExceeded: AugmentedError<ApiType>;
      /**
       * The maximum number of service endpoints for a DID has been exceeded.
       **/
      MaxNumberOfServicesPerDidExceeded: AugmentedError<ApiType>;
      /**
       * The maximum number of types for a service endpoint has been
       * exceeded.
       **/
      MaxNumberOfTypesPerServiceExceeded: AugmentedError<ApiType>;
      /**
       * The maximum number of URLs for a service endpoint has been exceeded.
       **/
      MaxNumberOfUrlsPerServiceExceeded: AugmentedError<ApiType>;
      /**
       * The maximum number of public keys for this DID key identifier has
       * been reached.
       **/
      MaxPublicKeysPerDidExceeded: AugmentedError<ApiType>;
      /**
       * The service endpoint ID exceeded the maximum allowed length.
       **/
      MaxServiceIdLengthExceeded: AugmentedError<ApiType>;
      /**
       * One of the service endpoint types exceeded the maximum allowed
       * length.
       **/
      MaxServiceTypeLengthExceeded: AugmentedError<ApiType>;
      /**
       * One of the service endpoint URLs exceeded the maximum allowed
       * length.
       **/
      MaxServiceUrlLengthExceeded: AugmentedError<ApiType>;
      /**
       * The maximum number of key agreements has been reached for the DID
       * subject.
       **/
      MaxTotalKeyAgreementKeysExceeded: AugmentedError<ApiType>;
      /**
       * Only the owner of the deposit can reclaim its reserved balance.
       **/
      NotOwnerOfDeposit: AugmentedError<ApiType>;
      /**
       * A service with the provided ID is already present for the given DID.
       **/
      ServiceAlreadyPresent: AugmentedError<ApiType>;
      /**
       * A service with the provided ID is not present under the given DID.
       **/
      ServiceNotPresent: AugmentedError<ApiType>;
      /**
       * The number of service endpoints stored under the DID is larger than
       * the number of endpoints to delete.
       **/
      StoredEndpointsCountTooLarge: AugmentedError<ApiType>;
      /**
       * The block number provided in a DID-authorized operation is invalid.
       **/
      TransactionExpired: AugmentedError<ApiType>;
      /**
       * The origin is unable to reserve the deposit and pay the fee.
       **/
      UnableToPayFees: AugmentedError<ApiType>;
      /**
       * The called extrinsic does not support DID authorisation.
       **/
      UnsupportedDidAuthorizationCall: AugmentedError<ApiType>;
      /**
       * One or more verification keys referenced are not stored in the set
       * of verification keys.
       **/
      VerificationKeyNotPresent: AugmentedError<ApiType>;
    };
    didLookup: {
      /**
       * The association does not exist.
       **/
      AssociationNotFound: AugmentedError<ApiType>;
      /**
       * The account has insufficient funds and can't pay the fees or reserve
       * the deposit.
       **/
      InsufficientFunds: AugmentedError<ApiType>;
      /**
       * The origin was not allowed to manage the association between the DID
       * and the account ID.
       **/
      NotAuthorized: AugmentedError<ApiType>;
      /**
       * The supplied proof of ownership was outdated.
       **/
      OutdatedProof: AugmentedError<ApiType>;
    };
    indices: {
      /**
       * The index was not available.
       **/
      InUse: AugmentedError<ApiType>;
      /**
       * The index was not already assigned.
       **/
      NotAssigned: AugmentedError<ApiType>;
      /**
       * The index is assigned to another account.
       **/
      NotOwner: AugmentedError<ApiType>;
      /**
       * The source and destination accounts are identical.
       **/
      NotTransfer: AugmentedError<ApiType>;
      /**
       * The index is permanent and may not be freed/changed.
       **/
      Permanent: AugmentedError<ApiType>;
    };
    kiltLaunch: {
      /**
       * The source address does not have KILT balance lock which is
       * required for `locked_transfer`.
       **/
      BalanceLockNotFound: AugmentedError<ApiType>;
      /**
       * The source and destination address have limits for their custom KILT
       * balance lock and thus cannot be merged. Should never be thrown.
       **/
      ConflictingLockingBlocks: AugmentedError<ApiType>;
      /**
       * The source and destination address differ in their vesting starting
       * blocks and thus cannot be merged. Should never be thrown.
       **/
      ConflictingVestingStarts: AugmentedError<ApiType>;
      /**
       * The source address does not have any balance lock at all which is
       * required for `locked_transfer`.
       **/
      ExpectedLocks: AugmentedError<ApiType>;
      /**
       * The source address has less balance available than the locked amount
       * which should be transferred in `locked_transfer`.
       **/
      InsufficientBalance: AugmentedError<ApiType>;
      /**
       * The source address has less locked balance than the amount which
       * should be transferred in `locked_transfer`.
       **/
      InsufficientLockedBalance: AugmentedError<ApiType>;
      /**
       * When migrating multiple accounts to the same target, the size of the
       * list of source addresses should never exceed `MaxClaims`.
       **/
      MaxClaimsExceeded: AugmentedError<ApiType>;
      /**
       * The source address has more than one vesting scheme which should
       * only be a theoretical issue.
       **/
      MultipleVestingSchemes: AugmentedError<ApiType>;
      /**
       * The source address is not a valid address which was set up as an
       * unowned account in the genesis build.
       **/
      NotUnownedAccount: AugmentedError<ApiType>;
      /**
       * The target address should not be the source address.
       **/
      SameDestination: AugmentedError<ApiType>;
      /**
       * The signing account is not the transfer account.
       **/
      Unauthorized: AugmentedError<ApiType>;
      /**
       * The source address has a balance lock and thus cannot be migrated.
       **/
      UnexpectedLocks: AugmentedError<ApiType>;
    };
    parachainStaking: {
      /**
       * The delegator has already previously delegated the collator
       * candidate.
       **/
      AlreadyDelegatedCollator: AugmentedError<ApiType>;
      /**
       * The account is already delegating the collator candidate.
       **/
      AlreadyDelegating: AugmentedError<ApiType>;
      /**
       * The collator candidate has already trigger the process to leave the
       * set of collator candidates.
       **/
      AlreadyLeaving: AugmentedError<ApiType>;
      /**
       * The account is already part of the collator candidates set.
       **/
      CandidateExists: AugmentedError<ApiType>;
      /**
       * The account is not part of the collator candidates set.
       **/
      CandidateNotFound: AugmentedError<ApiType>;
      /**
       * The collator candidate is in the process of leaving the set of
       * candidates and thus cannot be delegated to.
       **/
      CannotDelegateIfLeaving: AugmentedError<ApiType>;
      /**
       * The account has a full list of unstaking requests and needs to
       * unlock at least one of these before being able to join (again).
       * NOTE: Can only happen if the account was a candidate or
       * delegator before and either got kicked or exited voluntarily.
       **/
      CannotJoinBeforeUnlocking: AugmentedError<ApiType>;
      /**
       * The collator tried to leave before waiting at least for
       * `ExitQueueDelay` many rounds.
       **/
      CannotLeaveYet: AugmentedError<ApiType>;
      /**
       * The number of selected candidates per staking round is
       * above the maximum value allowed.
       **/
      CannotSetAboveMax: AugmentedError<ApiType>;
      /**
       * The number of selected candidates per staking round is
       * below the minimum value allowed.
       **/
      CannotSetBelowMin: AugmentedError<ApiType>;
      /**
       * The collator candidate is in the process of leaving the set of
       * candidates and cannot perform any other actions in the meantime.
       **/
      CannotStakeIfLeaving: AugmentedError<ApiType>;
      /**
       * The account has not staked enough funds to delegate a collator
       * candidate.
       **/
      DelegationBelowMin: AugmentedError<ApiType>;
      /**
       * The given delegation does not exist in the set of delegations.
       **/
      DelegationNotFound: AugmentedError<ApiType>;
      /**
       * The delegator has exceeded the number of delegations per round which
       * is equal to MaxDelegatorsPerCollator.
       * 
       * This protects against attacks in which a delegator can re-delegate
       * from a collator who has already authored a block, to another one
       * which has not in this round.
       **/
      DelegationsPerRoundExceeded: AugmentedError<ApiType>;
      /**
       * The account is already part of the delegators set.
       **/
      DelegatorExists: AugmentedError<ApiType>;
      /**
       * The account is not part of the delegators set.
       **/
      DelegatorNotFound: AugmentedError<ApiType>;
      /**
       * An invalid inflation configuration is trying to be set.
       **/
      InvalidSchedule: AugmentedError<ApiType>;
      /**
       * The delegator has already delegated the maximum number of candidates
       * allowed.
       **/
      MaxCollatorsPerDelegatorExceeded: AugmentedError<ApiType>;
      /**
       * The staking reward being unlocked does not exist.
       * Max unlocking requests reached.
       **/
      NoMoreUnstaking: AugmentedError<ApiType>;
      /**
       * The account has not staked enough funds to become a delegator.
       **/
      NomStakeBelowMin: AugmentedError<ApiType>;
      /**
       * The collator candidate wanted to execute the exit but has not
       * requested to leave before by calling `init_leave_candidates`.
       **/
      NotLeaving: AugmentedError<ApiType>;
      /**
       * The account has not delegated any collator candidate yet, hence it
       * is not in the set of delegators.
       **/
      NotYetDelegating: AugmentedError<ApiType>;
      /**
       * Provided staked value is zero. Should never be thrown.
       **/
      StakeNotFound: AugmentedError<ApiType>;
      /**
       * The set of collator candidates would fall below the required minimum
       * if the collator left.
       **/
      TooFewCollatorCandidates: AugmentedError<ApiType>;
      /**
       * The collator candidate has already reached the maximum number of
       * delegators.
       * 
       * This error is generated in case a new delegation request does not
       * stake enough funds to replace some other existing delegation.
       **/
      TooManyDelegators: AugmentedError<ApiType>;
      /**
       * The collator delegate or the delegator is trying to un-stake more
       * funds that are currently staked.
       **/
      Underflow: AugmentedError<ApiType>;
      /**
       * Cannot unlock when Unstaked is empty.
       **/
      UnstakingIsEmpty: AugmentedError<ApiType>;
      /**
       * The account has already staked the maximum amount of funds possible.
       **/
      ValStakeAboveMax: AugmentedError<ApiType>;
      /**
       * The account has not staked enough funds to be added to the collator
       * candidates set.
       **/
      ValStakeBelowMin: AugmentedError<ApiType>;
      /**
       * The account tried to stake more or less with amount zero.
       **/
      ValStakeZero: AugmentedError<ApiType>;
    };
    parachainSystem: {
      /**
       * The inherent which supplies the host configuration did not run this block
       **/
      HostConfigurationNotAvailable: AugmentedError<ApiType>;
      /**
       * No code upgrade has been authorized.
       **/
      NothingAuthorized: AugmentedError<ApiType>;
      /**
       * No validation function upgrade is currently scheduled.
       **/
      NotScheduled: AugmentedError<ApiType>;
      /**
       * Attempt to upgrade validation function while existing upgrade pending
       **/
      OverlappingUpgrades: AugmentedError<ApiType>;
      /**
       * Polkadot currently prohibits this parachain from upgrading its validation function
       **/
      ProhibitedByPolkadot: AugmentedError<ApiType>;
      /**
       * The supplied validation function has compiled into a blob larger than Polkadot is
       * willing to run
       **/
      TooBig: AugmentedError<ApiType>;
      /**
       * The given code upgrade has not been authorized.
       **/
      Unauthorized: AugmentedError<ApiType>;
      /**
       * The inherent which supplies the validation data did not run this block
       **/
      ValidationDataNotAvailable: AugmentedError<ApiType>;
    };
    preimage: {
      /**
       * Preimage has already been noted on-chain.
       **/
      AlreadyNoted: AugmentedError<ApiType>;
      /**
       * The user is not authorized to perform this action.
       **/
      NotAuthorized: AugmentedError<ApiType>;
      /**
       * The preimage cannot be removed since it has not yet been noted.
       **/
      NotNoted: AugmentedError<ApiType>;
      /**
       * The preimage request cannot be removed since no outstanding requests exist.
       **/
      NotRequested: AugmentedError<ApiType>;
      /**
       * A preimage may not be removed when there are outstanding requests.
       **/
      Requested: AugmentedError<ApiType>;
      /**
       * Preimage is too large to store on-chain.
       **/
      TooLarge: AugmentedError<ApiType>;
    };
    proxy: {
      /**
       * Account is already a proxy.
       **/
      Duplicate: AugmentedError<ApiType>;
      /**
       * Call may not be made by proxy because it may escalate its privileges.
       **/
      NoPermission: AugmentedError<ApiType>;
      /**
       * Cannot add self as proxy.
       **/
      NoSelfProxy: AugmentedError<ApiType>;
      /**
       * Proxy registration not found.
       **/
      NotFound: AugmentedError<ApiType>;
      /**
       * Sender is not a proxy of the account to be proxied.
       **/
      NotProxy: AugmentedError<ApiType>;
      /**
       * There are too many proxies registered or too many announcements pending.
       **/
      TooMany: AugmentedError<ApiType>;
      /**
       * Announcement, if made at all, was made too recently.
       **/
      Unannounced: AugmentedError<ApiType>;
      /**
       * A call which is incompatible with the proxy type's filter was attempted.
       **/
      Unproxyable: AugmentedError<ApiType>;
    };
    scheduler: {
      /**
       * Failed to schedule a call
       **/
      FailedToSchedule: AugmentedError<ApiType>;
      /**
       * Cannot find the scheduled call.
       **/
      NotFound: AugmentedError<ApiType>;
      /**
       * Reschedule failed because it does not change scheduled time.
       **/
      RescheduleNoChange: AugmentedError<ApiType>;
      /**
       * Given target block number is in the past.
       **/
      TargetBlockNumberInPast: AugmentedError<ApiType>;
    };
    session: {
      /**
       * Registered duplicate key.
       **/
      DuplicatedKey: AugmentedError<ApiType>;
      /**
       * Invalid ownership proof.
       **/
      InvalidProof: AugmentedError<ApiType>;
      /**
       * Key setting account is not live, so it's impossible to associate keys.
       **/
      NoAccount: AugmentedError<ApiType>;
      /**
       * No associated validator ID for account.
       **/
      NoAssociatedValidatorId: AugmentedError<ApiType>;
      /**
       * No keys are associated with this account.
       **/
      NoKeys: AugmentedError<ApiType>;
    };
    system: {
      /**
       * The origin filter prevent the call to be dispatched.
       **/
      CallFiltered: AugmentedError<ApiType>;
      /**
       * Failed to extract the runtime version from the new runtime.
       * 
       * Either calling `Core_version` or decoding `RuntimeVersion` failed.
       **/
      FailedToExtractRuntimeVersion: AugmentedError<ApiType>;
      /**
       * The name of specification does not match between the current runtime
       * and the new runtime.
       **/
      InvalidSpecName: AugmentedError<ApiType>;
      /**
       * Suicide called when the account has non-default composite data.
       **/
      NonDefaultComposite: AugmentedError<ApiType>;
      /**
       * There is a non-zero reference count preventing the account from being purged.
       **/
      NonZeroRefCount: AugmentedError<ApiType>;
      /**
       * The specification version is not allowed to decrease between the current runtime
       * and the new runtime.
       **/
      SpecVersionNeedsToIncrease: AugmentedError<ApiType>;
    };
    technicalCommittee: {
      /**
       * Members are already initialized!
       **/
      AlreadyInitialized: AugmentedError<ApiType>;
      /**
       * Duplicate proposals not allowed
       **/
      DuplicateProposal: AugmentedError<ApiType>;
      /**
       * Duplicate vote ignored
       **/
      DuplicateVote: AugmentedError<ApiType>;
      /**
       * Account is not a member
       **/
      NotMember: AugmentedError<ApiType>;
      /**
       * Proposal must exist
       **/
      ProposalMissing: AugmentedError<ApiType>;
      /**
       * The close call was made too early, before the end of the voting.
       **/
      TooEarly: AugmentedError<ApiType>;
      /**
       * There can only be a maximum of `MaxProposals` active proposals.
       **/
      TooManyProposals: AugmentedError<ApiType>;
      /**
       * Mismatched index
       **/
      WrongIndex: AugmentedError<ApiType>;
      /**
       * The given length bound for the proposal was too low.
       **/
      WrongProposalLength: AugmentedError<ApiType>;
      /**
       * The given weight bound for the proposal was too low.
       **/
      WrongProposalWeight: AugmentedError<ApiType>;
    };
    technicalMembership: {
      /**
       * Already a member.
       **/
      AlreadyMember: AugmentedError<ApiType>;
      /**
       * Not a member.
       **/
      NotMember: AugmentedError<ApiType>;
    };
    treasury: {
      /**
       * Proposer's balance is too low.
       **/
      InsufficientProposersBalance: AugmentedError<ApiType>;
      /**
       * No proposal or bounty at that index.
       **/
      InvalidIndex: AugmentedError<ApiType>;
      /**
       * Too many approvals in the queue.
       **/
      TooManyApprovals: AugmentedError<ApiType>;
    };
    utility: {
      /**
       * Too many calls batched.
       **/
      TooManyCalls: AugmentedError<ApiType>;
    };
    vesting: {
      /**
       * Amount being transferred is too low to create a vesting schedule.
       **/
      AmountLow: AugmentedError<ApiType>;
      /**
       * The account already has `MaxVestingSchedules` count of schedules and thus
       * cannot add another one. Consider merging existing schedules in order to add another.
       **/
      AtMaxVestingSchedules: AugmentedError<ApiType>;
      /**
       * Failed to create a new schedule because some parameter was invalid.
       **/
      InvalidScheduleParams: AugmentedError<ApiType>;
      /**
       * The account given is not vesting.
       **/
      NotVesting: AugmentedError<ApiType>;
      /**
       * An index was out of bounds of the vesting schedules.
       **/
      ScheduleIndexOutOfBounds: AugmentedError<ApiType>;
    };
    web3Names: {
      /**
       * The tx submitter does not have enough funds to pay for the deposit.
       **/
      InsufficientFunds: AugmentedError<ApiType>;
      /**
       * A name that contains not allowed characters is being claimed.
       **/
      InvalidWeb3NameCharacter: AugmentedError<ApiType>;
      /**
       * The actor cannot performed the specified operation.
       **/
      NotAuthorized: AugmentedError<ApiType>;
      /**
       * The specified owner already owns a name.
       **/
      OwnerAlreadyExists: AugmentedError<ApiType>;
      /**
       * The specified owner does not own any names.
       **/
      OwnerNotFound: AugmentedError<ApiType>;
      /**
       * The specified name has already been previously banned.
       **/
      Web3NameAlreadyBanned: AugmentedError<ApiType>;
      /**
       * The specified name has already been previously claimed.
       **/
      Web3NameAlreadyClaimed: AugmentedError<ApiType>;
      /**
       * The specified name has been banned and cannot be interacted
       * with.
       **/
      Web3NameBanned: AugmentedError<ApiType>;
      /**
       * The specified name is not currently banned.
       **/
      Web3NameNotBanned: AugmentedError<ApiType>;
      /**
       * The specified name does not exist.
       **/
      Web3NameNotFound: AugmentedError<ApiType>;
      /**
       * A name that is too long is being claimed.
       **/
      Web3NameTooLong: AugmentedError<ApiType>;
      /**
       * A name that is too short is being claimed.
       **/
      Web3NameTooShort: AugmentedError<ApiType>;
    };
  } // AugmentedErrors
} // declare module
