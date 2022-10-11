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
       * The maximum number of delegated attestations has already been
       * reached for the corresponding delegation id such that another one
       * cannot be added.
       **/
      MaxDelegatedAttestationsExceeded: AugmentedError<ApiType>;
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
       * The operation wasn't allowed because of insufficient rights.
       **/
      AccessDenied: AugmentedError<ApiType>;
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
    grandpa: {
      /**
       * Attempt to signal GRANDPA change with one already pending.
       **/
      ChangePending: AugmentedError<ApiType>;
      /**
       * A given equivocation report is valid but already previously reported.
       **/
      DuplicateOffenceReport: AugmentedError<ApiType>;
      /**
       * An equivocation proof provided as part of an equivocation report is invalid.
       **/
      InvalidEquivocationProof: AugmentedError<ApiType>;
      /**
       * A key ownership proof provided as part of an equivocation report is invalid.
       **/
      InvalidKeyOwnershipProof: AugmentedError<ApiType>;
      /**
       * Attempt to signal GRANDPA pause when the authority set isn't live
       * (either paused or already pending pause).
       **/
      PauseFailed: AugmentedError<ApiType>;
      /**
       * Attempt to signal GRANDPA resume when the authority set isn't paused
       * (either live or already pending resume).
       **/
      ResumeFailed: AugmentedError<ApiType>;
      /**
       * Cannot signal forced change so soon after last.
       **/
      TooSoon: AugmentedError<ApiType>;
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
    publicCredentials: {
      /**
       * A credential with the same root hash has already issued to the
       * specified subject.
       **/
      CredentialAlreadyIssued: AugmentedError<ApiType>;
      /**
       * No credential with the specified root hash has been issued to the
       * specified subject.
       **/
      CredentialNotFound: AugmentedError<ApiType>;
      /**
       * Catch-all for any other errors that should not happen, yet it
       * happened.
       **/
      InternalError: AugmentedError<ApiType>;
      /**
       * The credential input is invalid.
       **/
      InvalidInput: AugmentedError<ApiType>;
      /**
       * Not enough tokens to pay for the fees or the deposit.
       **/
      UnableToPayFees: AugmentedError<ApiType>;
      /**
       * The caller is not authorized to performed the operation.
       **/
      Unauthorized: AugmentedError<ApiType>;
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
    sudo: {
      /**
       * Sender must be the Sudo account
       **/
      RequireSudo: AugmentedError<ApiType>;
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
    utility: {
      /**
       * Too many calls batched.
       **/
      TooManyCalls: AugmentedError<ApiType>;
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
