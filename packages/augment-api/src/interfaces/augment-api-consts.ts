// Auto-generated via `yarn polkadot-types-from-chain`, do not edit
/* eslint-disable */

// import type lookup before we augment - in some environments
// this is required to allow for ambient/previous definitions
import '@polkadot/api-base/types/consts';

import type { ApiTypes, AugmentedConst } from '@polkadot/api-base/types';
import type { u128, u16, u32, u64, u8 } from '@polkadot/types-codec';
import type { FrameSupportWeightsRuntimeDbWeight, FrameSystemLimitsBlockLength, FrameSystemLimitsBlockWeights, SpVersionRuntimeVersion } from '@polkadot/types/lookup';

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
    authorship: {
      /**
       * The number of blocks back we should accept uncles.
       * This means that we will deal with uncle-parents that are
       * `UncleGenerations + 1` before `now`.
       **/
      uncleGenerations: u64 & AugmentedConst<ApiType>;
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
    did: {
      /**
       * The amount of balance that will be taken for each DID as a deposit
       * to incentivise fair use of the on chain storage. The deposit can be
       * reclaimed when the DID is deleted.
       **/
      deposit: u128 & AugmentedConst<ApiType>;
      /**
       * The amount of balance that will be taken for each DID as a fee to
       * incentivise fair use of the on chain storage. The fee will not get
       * refunded when the DID is deleted.
       **/
      fee: u128 & AugmentedConst<ApiType>;
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
    };
    didLookup: {
      /**
       * The amount of balance that will be taken for each DID as a deposit
       * to incentivise fair use of the on chain storage. The deposit can be
       * reclaimed when the DID is deleted.
       **/
      deposit: u128 & AugmentedConst<ApiType>;
    };
    grandpa: {
      /**
       * Max Authorities in use
       **/
      maxAuthorities: u32 & AugmentedConst<ApiType>;
    };
    indices: {
      /**
       * The deposit needed for reserving an index.
       **/
      deposit: u128 & AugmentedConst<ApiType>;
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
      dbWeight: FrameSupportWeightsRuntimeDbWeight & AugmentedConst<ApiType>;
      /**
       * The designated SS85 prefix of this chain.
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
    utility: {
      /**
       * The limit on the number of batched calls.
       **/
      batchedCallsLimit: u32 & AugmentedConst<ApiType>;
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
