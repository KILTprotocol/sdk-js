// Auto-generated via `yarn polkadot-types-from-chain`, do not edit
/* eslint-disable */

// import type lookup before we augment - in some environments
// this is required to allow for ambient/previous definitions
import '@polkadot/api-base/types/consts';

import type { ApiTypes, AugmentedConst } from '@polkadot/api-base/types';
import type { Option, bool, u128, u16, u32, u64, u8 } from '@polkadot/types-codec';
import type { Percent, Permill, Perquintill } from '@polkadot/types/interfaces/runtime';
import type { FrameSupportPalletId, FrameSystemLimitsBlockLength, FrameSystemLimitsBlockWeights, SpVersionRuntimeVersion, SpWeightsRuntimeDbWeight, SpWeightsWeightV2Weight } from '@polkadot/types/lookup';

export type __AugmentedConst<ApiType extends ApiTypes> = AugmentedConst<ApiType>;

declare module '@polkadot/api-base/types/consts' {
  interface AugmentedConsts<ApiType extends ApiTypes> {
    attestation: {
      /**
       * The deposit that is required for storing an attestation.
       **/
      deposit: u128 & AugmentedConst<ApiType>;
      /**
       * The maximum number of delegated attestations which can be made by
       * the same delegation.
       **/
      maxDelegatedAttestations: u32 & AugmentedConst<ApiType>;
    };
    balances: {
      /**
       * The minimum amount required to keep an account open.
       **/
      existentialDeposit: u128 & AugmentedConst<ApiType>;
      /**
       * The maximum number of locks that should exist on an account.
       * Not strictly enforced, but used for weight estimation.
       **/
      maxLocks: u32 & AugmentedConst<ApiType>;
      /**
       * The maximum number of named reserves that can exist on an account.
       **/
      maxReserves: u32 & AugmentedConst<ApiType>;
    };
    delegation: {
      /**
       * The deposit that is required for storing a delegation.
       **/
      deposit: u128 & AugmentedConst<ApiType>;
      /**
       * Maximum number of all children for a delegation node. For a binary
       * tree, this should be twice the maximum depth of the tree, i.e.
       * `2 ^ MaxParentChecks`.
       **/
      maxChildren: u32 & AugmentedConst<ApiType>;
      /**
       * Maximum number of upwards traversals of the delegation tree from a
       * node to the root and thus the depth of the delegation tree.
       **/
      maxParentChecks: u32 & AugmentedConst<ApiType>;
      /**
       * Maximum number of removals. Should be same as MaxRevocations
       **/
      maxRemovals: u32 & AugmentedConst<ApiType>;
      /**
       * Maximum number of revocations.
       **/
      maxRevocations: u32 & AugmentedConst<ApiType>;
      maxSignatureByteLength: u16 & AugmentedConst<ApiType>;
    };
    democracy: {
      /**
       * Period in blocks where an external proposal may not be re-submitted after being vetoed.
       **/
      cooloffPeriod: u64 & AugmentedConst<ApiType>;
      /**
       * The period between a proposal being approved and enacted.
       * 
       * It should generally be a little more than the unstake period to ensure that
       * voting stakers have an opportunity to remove themselves from the system in the case
       * where they are on the losing side of a vote.
       **/
      enactmentPeriod: u64 & AugmentedConst<ApiType>;
      /**
       * Minimum voting period allowed for a fast-track referendum.
       **/
      fastTrackVotingPeriod: u64 & AugmentedConst<ApiType>;
      /**
       * Indicator for whether an emergency origin is even allowed to happen. Some chains may
       * want to set this permanently to `false`, others may want to condition it on things such
       * as an upgrade having happened recently.
       **/
      instantAllowed: bool & AugmentedConst<ApiType>;
      /**
       * How often (in blocks) new public referenda are launched.
       **/
      launchPeriod: u64 & AugmentedConst<ApiType>;
      /**
       * The maximum number of items which can be blacklisted.
       **/
      maxBlacklisted: u32 & AugmentedConst<ApiType>;
      /**
       * The maximum number of deposits a public proposal may have at any time.
       **/
      maxDeposits: u32 & AugmentedConst<ApiType>;
      /**
       * The maximum number of public proposals that can exist at any time.
       **/
      maxProposals: u32 & AugmentedConst<ApiType>;
      /**
       * The maximum number of votes for an account.
       * 
       * Also used to compute weight, an overly big value can
       * lead to extrinsic with very big weight: see `delegate` for instance.
       **/
      maxVotes: u32 & AugmentedConst<ApiType>;
      /**
       * The minimum amount to be used as a deposit for a public referendum proposal.
       **/
      minimumDeposit: u128 & AugmentedConst<ApiType>;
      /**
       * The minimum period of vote locking.
       * 
       * It should be no shorter than enactment period to ensure that in the case of an approval,
       * those successful voters are locked into the consequences that their votes entail.
       **/
      voteLockingPeriod: u64 & AugmentedConst<ApiType>;
      /**
       * How often (in blocks) to check for new votes.
       **/
      votingPeriod: u64 & AugmentedConst<ApiType>;
    };
    did: {
      /**
       * The amount of balance that will be taken for each DID as a deposit
       * to incentivise fair use of the on chain storage. The deposits
       * increase by the amount of used keys and service endpoints. The
       * deposit can be reclaimed when the DID is deleted.
       **/
      baseDeposit: u128 & AugmentedConst<ApiType>;
      /**
       * The amount of balance that will be taken for each DID as a fee to
       * incentivise fair use of the on chain storage. The fee will not get
       * refunded when the DID is deleted.
       **/
      fee: u128 & AugmentedConst<ApiType>;
      /**
       * The amount of balance that will be taken for each added key as a
       * deposit to incentivise fair use of the on chain storage.
       **/
      keyDeposit: u128 & AugmentedConst<ApiType>;
      /**
       * The maximum number of blocks a DID-authorized operation is
       * considered valid after its creation.
       **/
      maxBlocksTxValidity: u64 & AugmentedConst<ApiType>;
      /**
       * Maximum number of key agreement keys that can be added in a creation
       * operation.
       **/
      maxNewKeyAgreementKeys: u32 & AugmentedConst<ApiType>;
      /**
       * The maximum number of services that can be stored under a DID.
       **/
      maxNumberOfServicesPerDid: u32 & AugmentedConst<ApiType>;
      /**
       * The maximum number of a types description for a service endpoint.
       **/
      maxNumberOfTypesPerService: u32 & AugmentedConst<ApiType>;
      /**
       * The maximum number of a URLs for a service endpoint.
       **/
      maxNumberOfUrlsPerService: u32 & AugmentedConst<ApiType>;
      /**
       * Maximum number of total public keys which can be stored per DID key
       * identifier. This includes the ones currently used for
       * authentication, key agreement, attestation, and delegation.
       **/
      maxPublicKeysPerDid: u32 & AugmentedConst<ApiType>;
      /**
       * The maximum length of a service ID.
       **/
      maxServiceIdLength: u32 & AugmentedConst<ApiType>;
      /**
       * The maximum length of a service type description.
       **/
      maxServiceTypeLength: u32 & AugmentedConst<ApiType>;
      /**
       * The maximum length of a service URL.
       **/
      maxServiceUrlLength: u32 & AugmentedConst<ApiType>;
      /**
       * Maximum number of total key agreement keys that can be stored for a
       * DID subject.
       * 
       * Should be greater than `MaxNewKeyAgreementKeys`.
       **/
      maxTotalKeyAgreementKeys: u32 & AugmentedConst<ApiType>;
      /**
       * The amount of balance that will be taken for each service endpoint
       * as a deposit to incentivise fair use of the on chain storage. The
       * deposit can be reclaimed when the service endpoint is removed or the
       * DID deleted.
       **/
      serviceEndpointDeposit: u128 & AugmentedConst<ApiType>;
    };
    didLookup: {
      /**
       * The amount of balance that will be taken for each DID as a deposit
       * to incentivise fair use of the on chain storage. The deposit can be
       * reclaimed when the DID is deleted.
       **/
      deposit: u128 & AugmentedConst<ApiType>;
    };
    indices: {
      /**
       * The deposit needed for reserving an index.
       **/
      deposit: u128 & AugmentedConst<ApiType>;
    };
    inflation: {
      /**
       * The length of the initial period in which the constant reward is
       * minted. Once the current block exceeds this, rewards are no further
       * issued.
       **/
      initialPeriodLength: u64 & AugmentedConst<ApiType>;
      /**
       * The amount of newly issued tokens per block during the initial
       * period.
       **/
      initialPeriodReward: u128 & AugmentedConst<ApiType>;
    };
    multisig: {
      /**
       * The base amount of currency needed to reserve for creating a multisig execution or to
       * store a dispatch call for later.
       * 
       * This is held for an additional storage item whose value size is
       * `4 + sizeof((BlockNumber, Balance, AccountId))` bytes and whose key size is
       * `32 + sizeof(AccountId)` bytes.
       **/
      depositBase: u128 & AugmentedConst<ApiType>;
      /**
       * The amount of currency needed per unit threshold when creating a multisig execution.
       * 
       * This is held for adding 32 bytes more into a pre-existing storage value.
       **/
      depositFactor: u128 & AugmentedConst<ApiType>;
      /**
       * The maximum amount of signatories allowed in the multisig.
       **/
      maxSignatories: u32 & AugmentedConst<ApiType>;
    };
    parachainStaking: {
      /**
       * Default number of blocks validation rounds last, as set in the
       * genesis configuration.
       **/
      defaultBlocksPerRound: u64 & AugmentedConst<ApiType>;
      /**
       * Number of rounds a collator has to stay active after submitting a
       * request to leave the set of collator candidates.
       **/
      exitQueueDelay: u32 & AugmentedConst<ApiType>;
      /**
       * Maximum number of delegations which can be made within the same
       * round.
       * 
       * NOTE: To prevent re-delegation-reward attacks, we should keep this
       * to be one.
       **/
      maxDelegationsPerRound: u32 & AugmentedConst<ApiType>;
      /**
       * Maximum number of delegators a single collator can have.
       **/
      maxDelegatorsPerCollator: u32 & AugmentedConst<ApiType>;
      /**
       * Maximum size of the top candidates set.
       **/
      maxTopCandidates: u32 & AugmentedConst<ApiType>;
      /**
       * Max number of concurrent active unstaking requests before
       * unlocking.
       * 
       * NOTE: To protect against irremovability of a candidate or delegator,
       * we only allow for MaxUnstakeRequests - 1 many manual unstake
       * requests. The last one serves as a placeholder for the cases of
       * calling either `kick_delegator`, force_remove_candidate` or
       * `execute_leave_candidates`. Otherwise, a user could max out their
       * unstake requests and prevent themselves from being kicked from the
       * set of candidates/delegators until they unlock their funds.
       **/
      maxUnstakeRequests: u32 & AugmentedConst<ApiType>;
      /**
       * Minimum number of blocks validation rounds can last.
       **/
      minBlocksPerRound: u64 & AugmentedConst<ApiType>;
      /**
       * Minimum stake required for any account to be added to the set of
       * candidates.
       **/
      minCollatorCandidateStake: u128 & AugmentedConst<ApiType>;
      /**
       * Minimum number of collators selected from the set of candidates at
       * every validation round.
       **/
      minCollators: u32 & AugmentedConst<ApiType>;
      /**
       * Minimum stake required for any account to be elected as validator
       * for a round.
       **/
      minCollatorStake: u128 & AugmentedConst<ApiType>;
      /**
       * Minimum stake required for any account to become a delegator.
       **/
      minDelegatorStake: u128 & AugmentedConst<ApiType>;
      /**
       * Minimum number of collators which cannot leave the network if there
       * are no others.
       **/
      minRequiredCollators: u32 & AugmentedConst<ApiType>;
      /**
       * The rate in percent for the network rewards which are based on the
       * maximum number of collators and the maximum amount a collator can
       * stake.
       **/
      networkRewardRate: Perquintill & AugmentedConst<ApiType>;
      /**
       * The starting block number for the network rewards. Once the current
       * block number exceeds this start, the beneficiary will receive the
       * configured reward in each block.
       **/
      networkRewardStart: u64 & AugmentedConst<ApiType>;
      /**
       * Number of blocks for which unstaked balance will still be locked
       * before it can be unlocked by actively calling the extrinsic
       * `unlock_unstaked`.
       **/
      stakeDuration: u64 & AugmentedConst<ApiType>;
    };
    proxy: {
      /**
       * The base amount of currency needed to reserve for creating an announcement.
       * 
       * This is held when a new storage item holding a `Balance` is created (typically 16
       * bytes).
       **/
      announcementDepositBase: u128 & AugmentedConst<ApiType>;
      /**
       * The amount of currency needed per announcement made.
       * 
       * This is held for adding an `AccountId`, `Hash` and `BlockNumber` (typically 68 bytes)
       * into a pre-existing storage value.
       **/
      announcementDepositFactor: u128 & AugmentedConst<ApiType>;
      /**
       * The maximum amount of time-delayed announcements that are allowed to be pending.
       **/
      maxPending: u32 & AugmentedConst<ApiType>;
      /**
       * The maximum amount of proxies allowed for a single account.
       **/
      maxProxies: u32 & AugmentedConst<ApiType>;
      /**
       * The base amount of currency needed to reserve for creating a proxy.
       * 
       * This is held for an additional storage item whose value size is
       * `sizeof(Balance)` bytes and whose key size is `sizeof(AccountId)` bytes.
       **/
      proxyDepositBase: u128 & AugmentedConst<ApiType>;
      /**
       * The amount of currency needed per proxy added.
       * 
       * This is held for adding 32 bytes plus an instance of `ProxyType` more into a
       * pre-existing storage value. Thus, when configuring `ProxyDepositFactor` one should take
       * into account `32 + proxy_type.encode().len()` bytes of data.
       **/
      proxyDepositFactor: u128 & AugmentedConst<ApiType>;
    };
    publicCredentials: {
      /**
       * The amount of tokens to reserve when attesting a public credential.
       **/
      deposit: u128 & AugmentedConst<ApiType>;
      /**
       * The maximum length in bytes of the encoded claims of a credential.
       **/
      maxEncodedClaimsLength: u32 & AugmentedConst<ApiType>;
      /**
       * The maximum length in bytes of the raw credential subject
       * identifier.
       **/
      maxSubjectIdLength: u32 & AugmentedConst<ApiType>;
    };
    scheduler: {
      /**
       * The maximum weight that may be scheduled per block for any dispatchables.
       **/
      maximumWeight: SpWeightsWeightV2Weight & AugmentedConst<ApiType>;
      /**
       * The maximum number of scheduled calls in the queue for a single block.
       **/
      maxScheduledPerBlock: u32 & AugmentedConst<ApiType>;
    };
    system: {
      /**
       * Maximum number of block number to block hash mappings to keep (oldest pruned first).
       **/
      blockHashCount: u64 & AugmentedConst<ApiType>;
      /**
       * The maximum length of a block (in bytes).
       **/
      blockLength: FrameSystemLimitsBlockLength & AugmentedConst<ApiType>;
      /**
       * Block & extrinsics weights: base values and limits.
       **/
      blockWeights: FrameSystemLimitsBlockWeights & AugmentedConst<ApiType>;
      /**
       * The weight of runtime database operations the runtime can invoke.
       **/
      dbWeight: SpWeightsRuntimeDbWeight & AugmentedConst<ApiType>;
      /**
       * The designated SS58 prefix of this chain.
       * 
       * This replaces the "ss58Format" property declared in the chain spec. Reason is
       * that the runtime should know about the prefix in order to make use of it as
       * an identifier of the chain.
       **/
      ss58Prefix: u16 & AugmentedConst<ApiType>;
      /**
       * Get the chain's current version.
       **/
      version: SpVersionRuntimeVersion & AugmentedConst<ApiType>;
    };
    timestamp: {
      /**
       * The minimum period between blocks. Beware that this is different to the *expected*
       * period that the block production apparatus provides. Your chosen consensus system will
       * generally work with this to determine a sensible block time. e.g. For Aura, it will be
       * double this period on default settings.
       **/
      minimumPeriod: u64 & AugmentedConst<ApiType>;
    };
    tips: {
      /**
       * The amount held on deposit per byte within the tip report reason or bounty description.
       **/
      dataDepositPerByte: u128 & AugmentedConst<ApiType>;
      /**
       * Maximum acceptable reason length.
       * 
       * Benchmarks depend on this value, be sure to update weights file when changing this value
       **/
      maximumReasonLength: u32 & AugmentedConst<ApiType>;
      /**
       * The period for which a tip remains open after is has achieved threshold tippers.
       **/
      tipCountdown: u64 & AugmentedConst<ApiType>;
      /**
       * The percent of the final tip which goes to the original reporter of the tip.
       **/
      tipFindersFee: Percent & AugmentedConst<ApiType>;
      /**
       * The amount held on deposit for placing a tip report.
       **/
      tipReportDepositBase: u128 & AugmentedConst<ApiType>;
    };
    transactionPayment: {
      /**
       * A fee mulitplier for `Operational` extrinsics to compute "virtual tip" to boost their
       * `priority`
       * 
       * This value is multipled by the `final_fee` to obtain a "virtual tip" that is later
       * added to a tip component in regular `priority` calculations.
       * It means that a `Normal` transaction can front-run a similarly-sized `Operational`
       * extrinsic (with no tip), by including a tip value greater than the virtual tip.
       * 
       * ```rust,ignore
       * // For `Normal`
       * let priority = priority_calc(tip);
       * 
       * // For `Operational`
       * let virtual_tip = (inclusion_fee + tip) * OperationalFeeMultiplier;
       * let priority = priority_calc(tip + virtual_tip);
       * ```
       * 
       * Note that since we use `final_fee` the multiplier applies also to the regular `tip`
       * sent with the transaction. So, not only does the transaction get a priority bump based
       * on the `inclusion_fee`, but we also amplify the impact of tips applied to `Operational`
       * transactions.
       **/
      operationalFeeMultiplier: u8 & AugmentedConst<ApiType>;
    };
    treasury: {
      /**
       * Percentage of spare funds (if any) that are burnt per spend period.
       **/
      burn: Permill & AugmentedConst<ApiType>;
      /**
       * The maximum number of approvals that can wait in the spending queue.
       * 
       * NOTE: This parameter is also used within the Bounties Pallet extension if enabled.
       **/
      maxApprovals: u32 & AugmentedConst<ApiType>;
      /**
       * The treasury's pallet id, used for deriving its sovereign account ID.
       **/
      palletId: FrameSupportPalletId & AugmentedConst<ApiType>;
      /**
       * Fraction of a proposal's value that should be bonded in order to place the proposal.
       * An accepted proposal gets these back. A rejected proposal does not.
       **/
      proposalBond: Permill & AugmentedConst<ApiType>;
      /**
       * Maximum amount of funds that should be placed in a deposit for making a proposal.
       **/
      proposalBondMaximum: Option<u128> & AugmentedConst<ApiType>;
      /**
       * Minimum amount of funds that should be placed in a deposit for making a proposal.
       **/
      proposalBondMinimum: u128 & AugmentedConst<ApiType>;
      /**
       * Period between successive spends.
       **/
      spendPeriod: u64 & AugmentedConst<ApiType>;
    };
    utility: {
      /**
       * The limit on the number of batched calls.
       **/
      batchedCallsLimit: u32 & AugmentedConst<ApiType>;
    };
    vesting: {
      maxVestingSchedules: u32 & AugmentedConst<ApiType>;
      /**
       * The minimum amount transferred to call `vested_transfer`.
       **/
      minVestedTransfer: u128 & AugmentedConst<ApiType>;
    };
    web3Names: {
      /**
       * The amount of KILT to deposit to claim a name.
       **/
      deposit: u128 & AugmentedConst<ApiType>;
      /**
       * The max encoded length of a name.
       **/
      maxNameLength: u32 & AugmentedConst<ApiType>;
      /**
       * The min encoded length of a name.
       **/
      minNameLength: u32 & AugmentedConst<ApiType>;
    };
  } // AugmentedConsts
} // declare module
