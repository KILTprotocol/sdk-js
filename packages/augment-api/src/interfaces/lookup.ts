// Auto-generated via `yarn polkadot-types-from-defs`, do not edit
/* eslint-disable */

/* eslint-disable sort-keys */

export default {
  /**
   * Lookup3: frame_system::AccountInfo<Nonce, pallet_balances::types::AccountData<Balance>>
   **/
  FrameSystemAccountInfo: {
    nonce: 'u64',
    consumers: 'u32',
    providers: 'u32',
    sufficients: 'u32',
    data: 'PalletBalancesAccountData'
  },
  /**
   * Lookup5: pallet_balances::types::AccountData<Balance>
   **/
  PalletBalancesAccountData: {
    free: 'u128',
    reserved: 'u128',
    frozen: 'u128',
    flags: 'u128'
  },
  /**
   * Lookup9: frame_support::dispatch::PerDispatchClass<sp_weights::weight_v2::Weight>
   **/
  FrameSupportDispatchPerDispatchClassWeight: {
    normal: 'SpWeightsWeightV2Weight',
    operational: 'SpWeightsWeightV2Weight',
    mandatory: 'SpWeightsWeightV2Weight'
  },
  /**
   * Lookup10: sp_weights::weight_v2::Weight
   **/
  SpWeightsWeightV2Weight: {
    refTime: 'Compact<u64>',
    proofSize: 'Compact<u64>'
  },
  /**
   * Lookup14: sp_runtime::generic::digest::Digest
   **/
  SpRuntimeDigest: {
    logs: 'Vec<SpRuntimeDigestDigestItem>'
  },
  /**
   * Lookup16: sp_runtime::generic::digest::DigestItem
   **/
  SpRuntimeDigestDigestItem: {
    _enum: {
      Other: 'Bytes',
      __Unused1: 'Null',
      __Unused2: 'Null',
      __Unused3: 'Null',
      Consensus: '([u8;4],Bytes)',
      Seal: '([u8;4],Bytes)',
      PreRuntime: '([u8;4],Bytes)',
      __Unused7: 'Null',
      RuntimeEnvironmentUpdated: 'Null'
    }
  },
  /**
   * Lookup19: frame_system::EventRecord<spiritnet_runtime::RuntimeEvent, primitive_types::H256>
   **/
  FrameSystemEventRecord: {
    phase: 'FrameSystemPhase',
    event: 'Event',
    topics: 'Vec<H256>'
  },
  /**
   * Lookup21: frame_system::pallet::Event<T>
   **/
  FrameSystemEvent: {
    _enum: {
      ExtrinsicSuccess: {
        dispatchInfo: 'FrameSupportDispatchDispatchInfo',
      },
      ExtrinsicFailed: {
        dispatchError: 'SpRuntimeDispatchError',
        dispatchInfo: 'FrameSupportDispatchDispatchInfo',
      },
      CodeUpdated: 'Null',
      NewAccount: {
        account: 'AccountId32',
      },
      KilledAccount: {
        account: 'AccountId32',
      },
      Remarked: {
        _alias: {
          hash_: 'hash',
        },
        sender: 'AccountId32',
        hash_: 'H256'
      }
    }
  },
  /**
   * Lookup22: frame_support::dispatch::DispatchInfo
   **/
  FrameSupportDispatchDispatchInfo: {
    weight: 'SpWeightsWeightV2Weight',
    class: 'FrameSupportDispatchDispatchClass',
    paysFee: 'FrameSupportDispatchPays'
  },
  /**
   * Lookup23: frame_support::dispatch::DispatchClass
   **/
  FrameSupportDispatchDispatchClass: {
    _enum: ['Normal', 'Operational', 'Mandatory']
  },
  /**
   * Lookup24: frame_support::dispatch::Pays
   **/
  FrameSupportDispatchPays: {
    _enum: ['Yes', 'No']
  },
  /**
   * Lookup25: sp_runtime::DispatchError
   **/
  SpRuntimeDispatchError: {
    _enum: {
      Other: 'Null',
      CannotLookup: 'Null',
      BadOrigin: 'Null',
      Module: 'SpRuntimeModuleError',
      ConsumerRemaining: 'Null',
      NoProviders: 'Null',
      TooManyConsumers: 'Null',
      Token: 'SpRuntimeTokenError',
      Arithmetic: 'SpArithmeticArithmeticError',
      Transactional: 'SpRuntimeTransactionalError',
      Exhausted: 'Null',
      Corruption: 'Null',
      Unavailable: 'Null',
      RootNotAllowed: 'Null'
    }
  },
  /**
   * Lookup26: sp_runtime::ModuleError
   **/
  SpRuntimeModuleError: {
    index: 'u8',
    error: '[u8;4]'
  },
  /**
   * Lookup27: sp_runtime::TokenError
   **/
  SpRuntimeTokenError: {
    _enum: ['FundsUnavailable', 'OnlyProvider', 'BelowMinimum', 'CannotCreate', 'UnknownAsset', 'Frozen', 'Unsupported', 'CannotCreateHold', 'NotExpendable', 'Blocked']
  },
  /**
   * Lookup28: sp_arithmetic::ArithmeticError
   **/
  SpArithmeticArithmeticError: {
    _enum: ['Underflow', 'Overflow', 'DivisionByZero']
  },
  /**
   * Lookup29: sp_runtime::TransactionalError
   **/
  SpRuntimeTransactionalError: {
    _enum: ['LimitReached', 'NoLayer']
  },
  /**
   * Lookup30: pallet_indices::pallet::Event<T>
   **/
  PalletIndicesEvent: {
    _enum: {
      IndexAssigned: {
        who: 'AccountId32',
        index: 'u64',
      },
      IndexFreed: {
        index: 'u64',
      },
      IndexFrozen: {
        index: 'u64',
        who: 'AccountId32'
      }
    }
  },
  /**
   * Lookup31: pallet_balances::pallet::Event<T, I>
   **/
  PalletBalancesEvent: {
    _enum: {
      Endowed: {
        account: 'AccountId32',
        freeBalance: 'u128',
      },
      DustLost: {
        account: 'AccountId32',
        amount: 'u128',
      },
      Transfer: {
        from: 'AccountId32',
        to: 'AccountId32',
        amount: 'u128',
      },
      BalanceSet: {
        who: 'AccountId32',
        free: 'u128',
      },
      Reserved: {
        who: 'AccountId32',
        amount: 'u128',
      },
      Unreserved: {
        who: 'AccountId32',
        amount: 'u128',
      },
      ReserveRepatriated: {
        from: 'AccountId32',
        to: 'AccountId32',
        amount: 'u128',
        destinationStatus: 'FrameSupportTokensMiscBalanceStatus',
      },
      Deposit: {
        who: 'AccountId32',
        amount: 'u128',
      },
      Withdraw: {
        who: 'AccountId32',
        amount: 'u128',
      },
      Slashed: {
        who: 'AccountId32',
        amount: 'u128',
      },
      Minted: {
        who: 'AccountId32',
        amount: 'u128',
      },
      Burned: {
        who: 'AccountId32',
        amount: 'u128',
      },
      Suspended: {
        who: 'AccountId32',
        amount: 'u128',
      },
      Restored: {
        who: 'AccountId32',
        amount: 'u128',
      },
      Upgraded: {
        who: 'AccountId32',
      },
      Issued: {
        amount: 'u128',
      },
      Rescinded: {
        amount: 'u128',
      },
      Locked: {
        who: 'AccountId32',
        amount: 'u128',
      },
      Unlocked: {
        who: 'AccountId32',
        amount: 'u128',
      },
      Frozen: {
        who: 'AccountId32',
        amount: 'u128',
      },
      Thawed: {
        who: 'AccountId32',
        amount: 'u128'
      }
    }
  },
  /**
   * Lookup32: frame_support::traits::tokens::misc::BalanceStatus
   **/
  FrameSupportTokensMiscBalanceStatus: {
    _enum: ['Free', 'Reserved']
  },
  /**
   * Lookup33: pallet_transaction_payment::pallet::Event<T>
   **/
  PalletTransactionPaymentEvent: {
    _enum: {
      TransactionFeePaid: {
        who: 'AccountId32',
        actualFee: 'u128',
        tip: 'u128'
      }
    }
  },
  /**
   * Lookup34: pallet_session::pallet::Event
   **/
  PalletSessionEvent: {
    _enum: {
      NewSession: {
        sessionIndex: 'u32'
      }
    }
  },
  /**
   * Lookup35: parachain_staking::pallet::Event<T>
   **/
  ParachainStakingEvent: {
    _enum: {
      NewRound: '(u64,u32)',
      EnteredTopCandidates: 'AccountId32',
      LeftTopCandidates: 'AccountId32',
      JoinedCollatorCandidates: '(AccountId32,u128)',
      CollatorStakedMore: '(AccountId32,u128,u128)',
      CollatorStakedLess: '(AccountId32,u128,u128)',
      CollatorScheduledExit: '(u32,AccountId32,u32)',
      CollatorCanceledExit: 'AccountId32',
      CandidateLeft: '(AccountId32,u128)',
      CollatorRemoved: '(AccountId32,u128)',
      MaxCandidateStakeChanged: 'u128',
      DelegatorStakedMore: '(AccountId32,AccountId32,u128,u128)',
      DelegatorStakedLess: '(AccountId32,AccountId32,u128,u128)',
      DelegatorLeft: '(AccountId32,u128)',
      Delegation: '(AccountId32,u128,AccountId32,u128)',
      DelegationReplaced: '(AccountId32,u128,AccountId32,u128,AccountId32,u128)',
      DelegatorLeftCollator: '(AccountId32,AccountId32,u128,u128)',
      Rewarded: '(AccountId32,u128)',
      RoundInflationSet: '(Perquintill,Perquintill,Perquintill,Perquintill)',
      MaxSelectedCandidatesSet: '(u32,u32)',
      BlocksPerRoundSet: '(u32,u64,u64,u64)'
    }
  },
  /**
   * Lookup37: pallet_democracy::pallet::Event<T>
   **/
  PalletDemocracyEvent: {
    _enum: {
      Proposed: {
        proposalIndex: 'u32',
        deposit: 'u128',
      },
      Tabled: {
        proposalIndex: 'u32',
        deposit: 'u128',
      },
      ExternalTabled: 'Null',
      Started: {
        refIndex: 'u32',
        threshold: 'PalletDemocracyVoteThreshold',
      },
      Passed: {
        refIndex: 'u32',
      },
      NotPassed: {
        refIndex: 'u32',
      },
      Cancelled: {
        refIndex: 'u32',
      },
      Delegated: {
        who: 'AccountId32',
        target: 'AccountId32',
      },
      Undelegated: {
        account: 'AccountId32',
      },
      Vetoed: {
        who: 'AccountId32',
        proposalHash: 'H256',
        until: 'u64',
      },
      Blacklisted: {
        proposalHash: 'H256',
      },
      Voted: {
        voter: 'AccountId32',
        refIndex: 'u32',
        vote: 'PalletDemocracyVoteAccountVote',
      },
      Seconded: {
        seconder: 'AccountId32',
        propIndex: 'u32',
      },
      ProposalCanceled: {
        propIndex: 'u32',
      },
      MetadataSet: {
        _alias: {
          hash_: 'hash',
        },
        owner: 'PalletDemocracyMetadataOwner',
        hash_: 'H256',
      },
      MetadataCleared: {
        _alias: {
          hash_: 'hash',
        },
        owner: 'PalletDemocracyMetadataOwner',
        hash_: 'H256',
      },
      MetadataTransferred: {
        _alias: {
          hash_: 'hash',
        },
        prevOwner: 'PalletDemocracyMetadataOwner',
        owner: 'PalletDemocracyMetadataOwner',
        hash_: 'H256'
      }
    }
  },
  /**
   * Lookup38: pallet_democracy::vote_threshold::VoteThreshold
   **/
  PalletDemocracyVoteThreshold: {
    _enum: ['SuperMajorityApprove', 'SuperMajorityAgainst', 'SimpleMajority']
  },
  /**
   * Lookup39: pallet_democracy::vote::AccountVote<Balance>
   **/
  PalletDemocracyVoteAccountVote: {
    _enum: {
      Standard: {
        vote: 'Vote',
        balance: 'u128',
      },
      Split: {
        aye: 'u128',
        nay: 'u128'
      }
    }
  },
  /**
   * Lookup41: pallet_democracy::types::MetadataOwner
   **/
  PalletDemocracyMetadataOwner: {
    _enum: {
      External: 'Null',
      Proposal: 'u32',
      Referendum: 'u32'
    }
  },
  /**
   * Lookup42: pallet_collective::pallet::Event<T, I>
   **/
  PalletCollectiveEvent: {
    _enum: {
      Proposed: {
        account: 'AccountId32',
        proposalIndex: 'u32',
        proposalHash: 'H256',
        threshold: 'u32',
      },
      Voted: {
        account: 'AccountId32',
        proposalHash: 'H256',
        voted: 'bool',
        yes: 'u32',
        no: 'u32',
      },
      Approved: {
        proposalHash: 'H256',
      },
      Disapproved: {
        proposalHash: 'H256',
      },
      Executed: {
        proposalHash: 'H256',
        result: 'Result<Null, SpRuntimeDispatchError>',
      },
      MemberExecuted: {
        proposalHash: 'H256',
        result: 'Result<Null, SpRuntimeDispatchError>',
      },
      Closed: {
        proposalHash: 'H256',
        yes: 'u32',
        no: 'u32'
      }
    }
  },
  /**
   * Lookup47: pallet_membership::pallet::Event<T, I>
   **/
  PalletMembershipEvent: {
    _enum: ['MemberAdded', 'MemberRemoved', 'MembersSwapped', 'MembersReset', 'KeyChanged', 'Dummy']
  },
  /**
   * Lookup48: pallet_treasury::pallet::Event<T, I>
   **/
  PalletTreasuryEvent: {
    _enum: {
      Proposed: {
        proposalIndex: 'u32',
      },
      Spending: {
        budgetRemaining: 'u128',
      },
      Awarded: {
        proposalIndex: 'u32',
        award: 'u128',
        account: 'AccountId32',
      },
      Rejected: {
        proposalIndex: 'u32',
        slashed: 'u128',
      },
      Burnt: {
        burntFunds: 'u128',
      },
      Rollover: {
        rolloverBalance: 'u128',
      },
      Deposit: {
        value: 'u128',
      },
      SpendApproved: {
        proposalIndex: 'u32',
        amount: 'u128',
        beneficiary: 'AccountId32',
      },
      UpdatedInactive: {
        reactivated: 'u128',
        deactivated: 'u128'
      }
    }
  },
  /**
   * Lookup49: pallet_utility::pallet::Event
   **/
  PalletUtilityEvent: {
    _enum: {
      BatchInterrupted: {
        index: 'u32',
        error: 'SpRuntimeDispatchError',
      },
      BatchCompleted: 'Null',
      BatchCompletedWithErrors: 'Null',
      ItemCompleted: 'Null',
      ItemFailed: {
        error: 'SpRuntimeDispatchError',
      },
      DispatchedAs: {
        result: 'Result<Null, SpRuntimeDispatchError>'
      }
    }
  },
  /**
   * Lookup50: pallet_vesting::pallet::Event<T>
   **/
  PalletVestingEvent: {
    _enum: {
      VestingUpdated: {
        account: 'AccountId32',
        unvested: 'u128',
      },
      VestingCompleted: {
        account: 'AccountId32'
      }
    }
  },
  /**
   * Lookup51: pallet_scheduler::pallet::Event<T>
   **/
  PalletSchedulerEvent: {
    _enum: {
      Scheduled: {
        when: 'u64',
        index: 'u32',
      },
      Canceled: {
        when: 'u64',
        index: 'u32',
      },
      Dispatched: {
        task: '(u64,u32)',
        id: 'Option<[u8;32]>',
        result: 'Result<Null, SpRuntimeDispatchError>',
      },
      CallUnavailable: {
        task: '(u64,u32)',
        id: 'Option<[u8;32]>',
      },
      PeriodicFailed: {
        task: '(u64,u32)',
        id: 'Option<[u8;32]>',
      },
      PermanentlyOverweight: {
        task: '(u64,u32)',
        id: 'Option<[u8;32]>'
      }
    }
  },
  /**
   * Lookup54: pallet_proxy::pallet::Event<T>
   **/
  PalletProxyEvent: {
    _enum: {
      ProxyExecuted: {
        result: 'Result<Null, SpRuntimeDispatchError>',
      },
      PureCreated: {
        pure: 'AccountId32',
        who: 'AccountId32',
        proxyType: 'SpiritnetRuntimeProxyType',
        disambiguationIndex: 'u16',
      },
      Announced: {
        real: 'AccountId32',
        proxy: 'AccountId32',
        callHash: 'H256',
      },
      ProxyAdded: {
        delegator: 'AccountId32',
        delegatee: 'AccountId32',
        proxyType: 'SpiritnetRuntimeProxyType',
        delay: 'u64',
      },
      ProxyRemoved: {
        delegator: 'AccountId32',
        delegatee: 'AccountId32',
        proxyType: 'SpiritnetRuntimeProxyType',
        delay: 'u64'
      }
    }
  },
  /**
   * Lookup55: spiritnet_runtime::ProxyType
   **/
  SpiritnetRuntimeProxyType: {
    _enum: ['Any', 'NonTransfer', 'Governance', 'ParachainStaking', 'CancelProxy', 'NonDepositClaiming']
  },
  /**
   * Lookup57: pallet_preimage::pallet::Event<T>
   **/
  PalletPreimageEvent: {
    _enum: {
      Noted: {
        _alias: {
          hash_: 'hash',
        },
        hash_: 'H256',
      },
      Requested: {
        _alias: {
          hash_: 'hash',
        },
        hash_: 'H256',
      },
      Cleared: {
        _alias: {
          hash_: 'hash',
        },
        hash_: 'H256'
      }
    }
  },
  /**
   * Lookup59: pallet_tips::pallet::Event<T, I>
   **/
  PalletTipsEvent: {
    _enum: {
      NewTip: {
        tipHash: 'H256',
      },
      TipClosing: {
        tipHash: 'H256',
      },
      TipClosed: {
        tipHash: 'H256',
        who: 'AccountId32',
        payout: 'u128',
      },
      TipRetracted: {
        tipHash: 'H256',
      },
      TipSlashed: {
        tipHash: 'H256',
        finder: 'AccountId32',
        deposit: 'u128'
      }
    }
  },
  /**
   * Lookup60: pallet_multisig::pallet::Event<T>
   **/
  PalletMultisigEvent: {
    _enum: {
      NewMultisig: {
        approving: 'AccountId32',
        multisig: 'AccountId32',
        callHash: '[u8;32]',
      },
      MultisigApproval: {
        approving: 'AccountId32',
        timepoint: 'PalletMultisigTimepoint',
        multisig: 'AccountId32',
        callHash: '[u8;32]',
      },
      MultisigExecuted: {
        approving: 'AccountId32',
        timepoint: 'PalletMultisigTimepoint',
        multisig: 'AccountId32',
        callHash: '[u8;32]',
        result: 'Result<Null, SpRuntimeDispatchError>',
      },
      MultisigCancelled: {
        cancelling: 'AccountId32',
        timepoint: 'PalletMultisigTimepoint',
        multisig: 'AccountId32',
        callHash: '[u8;32]'
      }
    }
  },
  /**
   * Lookup61: pallet_multisig::Timepoint<BlockNumber>
   **/
  PalletMultisigTimepoint: {
    height: 'u64',
    index: 'u32'
  },
  /**
   * Lookup62: ctype::pallet::Event<T>
   **/
  CtypeEvent: {
    _enum: {
      CTypeCreated: '(AccountId32,H256)',
      CTypeUpdated: 'H256'
    }
  },
  /**
   * Lookup63: attestation::pallet::Event<T>
   **/
  AttestationEvent: {
    _enum: {
      AttestationCreated: {
        attester: 'AccountId32',
        claimHash: 'H256',
        ctypeHash: 'H256',
        authorization: 'Option<RuntimeCommonAuthorizationAuthorizationId>',
      },
      AttestationRevoked: {
        authorizedBy: 'AttestationAuthorizedBy',
        attester: 'AccountId32',
        ctypeHash: 'H256',
        claimHash: 'H256',
      },
      AttestationRemoved: {
        authorizedBy: 'AttestationAuthorizedBy',
        attester: 'AccountId32',
        ctypeHash: 'H256',
        claimHash: 'H256'
      }
    }
  },
  /**
   * Lookup65: runtime_common::authorization::AuthorizationId<primitive_types::H256>
   **/
  RuntimeCommonAuthorizationAuthorizationId: {
    _enum: {
      Delegation: 'H256'
    }
  },
  /**
   * Lookup66: attestation::authorized_by::AuthorizedBy<sp_core::crypto::AccountId32, sp_core::crypto::AccountId32>
   **/
  AttestationAuthorizedBy: {
    _enum: {
      DepositOwner: 'AccountId32',
      Attester: 'AccountId32',
      Authorization: 'AccountId32'
    }
  },
  /**
   * Lookup67: delegation::pallet::Event<T>
   **/
  DelegationEvent: {
    _enum: {
      HierarchyCreated: '(AccountId32,H256,H256)',
      HierarchyRevoked: '(AccountId32,H256)',
      HierarchyRemoved: '(AccountId32,H256)',
      DelegationCreated: '(AccountId32,H256,H256,H256,AccountId32,DelegationDelegationHierarchyPermissions)',
      DelegationRevoked: '(AccountId32,H256)',
      DelegationRemoved: '(AccountId32,H256)'
    }
  },
  /**
   * Lookup68: delegation::delegation_hierarchy::Permissions
   **/
  DelegationDelegationHierarchyPermissions: {
    bits: 'u32'
  },
  /**
   * Lookup69: did::pallet::Event<T>
   **/
  DidEvent: {
    _enum: {
      DidCreated: '(AccountId32,AccountId32)',
      DidUpdated: 'AccountId32',
      DidDeleted: 'AccountId32',
      DidCallDispatched: '(AccountId32,Result<Null, SpRuntimeDispatchError>)'
    }
  },
  /**
   * Lookup70: pallet_did_lookup::pallet::Event<T>
   **/
  PalletDidLookupEvent: {
    _enum: {
      AssociationEstablished: '(PalletDidLookupLinkableAccountLinkableAccountId,AccountId32)',
      AssociationRemoved: '(PalletDidLookupLinkableAccountLinkableAccountId,AccountId32)',
      MigrationProgress: 'Null',
      MigrationCompleted: 'Null'
    }
  },
  /**
   * Lookup71: pallet_did_lookup::linkable_account::LinkableAccountId
   **/
  PalletDidLookupLinkableAccountLinkableAccountId: {
    _enum: {
      AccountId20: 'PalletDidLookupAccountAccountId20',
      AccountId32: 'AccountId32'
    }
  },
  /**
   * Lookup72: pallet_did_lookup::account::AccountId20
   **/
  PalletDidLookupAccountAccountId20: '[u8;20]',
  /**
   * Lookup74: pallet_web3_names::pallet::Event<T>
   **/
  PalletWeb3NamesEvent: {
    _enum: {
      Web3NameClaimed: {
        owner: 'AccountId32',
        name: 'Bytes',
      },
      Web3NameReleased: {
        owner: 'AccountId32',
        name: 'Bytes',
      },
      Web3NameBanned: {
        name: 'Bytes',
      },
      Web3NameUnbanned: {
        name: 'Bytes'
      }
    }
  },
  /**
   * Lookup77: public_credentials::pallet::Event<T>
   **/
  PublicCredentialsEvent: {
    _enum: {
      CredentialStored: {
        subjectId: 'RuntimeCommonAssetsAssetDid',
        credentialId: 'H256',
      },
      CredentialRemoved: {
        subjectId: 'RuntimeCommonAssetsAssetDid',
        credentialId: 'H256',
      },
      CredentialRevoked: {
        credentialId: 'H256',
      },
      CredentialUnrevoked: {
        credentialId: 'H256'
      }
    }
  },
  /**
   * Lookup78: runtime_common::assets::AssetDid
   **/
  RuntimeCommonAssetsAssetDid: 'KiltAssetDidsV1AssetDid',
  /**
   * Lookup79: kilt_asset_dids::v1::AssetDid
   **/
  KiltAssetDidsV1AssetDid: {
    chainId: 'KiltAssetDidsChainV1ChainId',
    assetId: 'KiltAssetDidsAssetV1AssetId'
  },
  /**
   * Lookup80: kilt_asset_dids::chain::v1::ChainId
   **/
  KiltAssetDidsChainV1ChainId: {
    _enum: {
      Eip155: 'u128',
      Bip122: 'KiltAssetDidsChainV1GenesisHexHash32Reference',
      Dotsama: 'KiltAssetDidsChainV1GenesisHexHash32Reference',
      Solana: 'Bytes',
      Generic: 'KiltAssetDidsChainV1GenericChainId'
    }
  },
  /**
   * Lookup82: kilt_asset_dids::chain::v1::GenesisHexHash32Reference
   **/
  KiltAssetDidsChainV1GenesisHexHash32Reference: '[u8;16]',
  /**
   * Lookup86: kilt_asset_dids::chain::v1::GenericChainId
   **/
  KiltAssetDidsChainV1GenericChainId: {
    namespace: 'Bytes',
    reference: 'Bytes'
  },
  /**
   * Lookup90: kilt_asset_dids::asset::v1::AssetId
   **/
  KiltAssetDidsAssetV1AssetId: {
    _enum: {
      Slip44: 'U256',
      Erc20: 'KiltAssetDidsAssetV1EvmSmartContractFungibleReference',
      Erc721: 'KiltAssetDidsAssetV1EvmSmartContractNonFungibleReference',
      Erc1155: 'KiltAssetDidsAssetV1EvmSmartContractNonFungibleReference',
      Generic: 'KiltAssetDidsAssetV1GenericAssetId'
    }
  },
  /**
   * Lookup94: kilt_asset_dids::asset::v1::EvmSmartContractFungibleReference
   **/
  KiltAssetDidsAssetV1EvmSmartContractFungibleReference: '[u8;20]',
  /**
   * Lookup95: kilt_asset_dids::asset::v1::EvmSmartContractNonFungibleReference
   **/
  KiltAssetDidsAssetV1EvmSmartContractNonFungibleReference: '(KiltAssetDidsAssetV1EvmSmartContractFungibleReference,Option<Bytes>)',
  /**
   * Lookup99: kilt_asset_dids::asset::v1::GenericAssetId
   **/
  KiltAssetDidsAssetV1GenericAssetId: {
    namespace: 'Bytes',
    reference: 'Bytes',
    id: 'Option<Bytes>'
  },
  /**
   * Lookup105: pallet_migration::pallet::Event<T>
   **/
  PalletMigrationEvent: {
    _enum: {
      EntriesUpdated: 'PalletMigrationEntriesToMigrate'
    }
  },
  /**
   * Lookup106: pallet_migration::pallet::EntriesToMigrate<spiritnet_runtime::Runtime>
   **/
  PalletMigrationEntriesToMigrate: {
    attestation: 'Vec<H256>',
    delegation: 'Vec<H256>',
    did: 'Vec<AccountId32>',
    lookup: 'Vec<PalletDidLookupLinkableAccountLinkableAccountId>',
    w3n: 'Vec<Bytes>',
    publicCredentials: 'Vec<(RuntimeCommonAssetsAssetDid,H256)>'
  },
  /**
   * Lookup107: spiritnet_runtime::Runtime
   **/
  SpiritnetRuntimeRuntime: 'Null',
  /**
   * Lookup119: cumulus_pallet_parachain_system::pallet::Event<T>
   **/
  CumulusPalletParachainSystemEvent: {
    _enum: {
      ValidationFunctionStored: 'Null',
      ValidationFunctionApplied: {
        relayChainBlockNum: 'u32',
      },
      ValidationFunctionDiscarded: 'Null',
      UpgradeAuthorized: {
        codeHash: 'H256',
      },
      DownwardMessagesReceived: {
        count: 'u32',
      },
      DownwardMessagesProcessed: {
        weightUsed: 'SpWeightsWeightV2Weight',
        dmqHead: 'H256',
      },
      UpwardMessageSent: {
        messageHash: 'Option<[u8;32]>'
      }
    }
  },
  /**
   * Lookup120: cumulus_pallet_xcmp_queue::pallet::Event<T>
   **/
  CumulusPalletXcmpQueueEvent: {
    _enum: {
      Success: {
        messageHash: '[u8;32]',
        messageId: '[u8;32]',
        weight: 'SpWeightsWeightV2Weight',
      },
      Fail: {
        messageHash: '[u8;32]',
        messageId: '[u8;32]',
        error: 'XcmV3TraitsError',
        weight: 'SpWeightsWeightV2Weight',
      },
      BadVersion: {
        messageHash: '[u8;32]',
      },
      BadFormat: {
        messageHash: '[u8;32]',
      },
      XcmpMessageSent: {
        messageHash: '[u8;32]',
      },
      OverweightEnqueued: {
        sender: 'u32',
        sentAt: 'u32',
        index: 'u64',
        required: 'SpWeightsWeightV2Weight',
      },
      OverweightServiced: {
        index: 'u64',
        used: 'SpWeightsWeightV2Weight'
      }
    }
  },
  /**
   * Lookup121: xcm::v3::traits::Error
   **/
  XcmV3TraitsError: {
    _enum: {
      Overflow: 'Null',
      Unimplemented: 'Null',
      UntrustedReserveLocation: 'Null',
      UntrustedTeleportLocation: 'Null',
      LocationFull: 'Null',
      LocationNotInvertible: 'Null',
      BadOrigin: 'Null',
      InvalidLocation: 'Null',
      AssetNotFound: 'Null',
      FailedToTransactAsset: 'Null',
      NotWithdrawable: 'Null',
      LocationCannotHold: 'Null',
      ExceedsMaxMessageSize: 'Null',
      DestinationUnsupported: 'Null',
      Transport: 'Null',
      Unroutable: 'Null',
      UnknownClaim: 'Null',
      FailedToDecode: 'Null',
      MaxWeightInvalid: 'Null',
      NotHoldingFees: 'Null',
      TooExpensive: 'Null',
      Trap: 'u64',
      ExpectationFalse: 'Null',
      PalletNotFound: 'Null',
      NameMismatch: 'Null',
      VersionIncompatible: 'Null',
      HoldingWouldOverflow: 'Null',
      ExportError: 'Null',
      ReanchorFailed: 'Null',
      NoDeal: 'Null',
      FeesNotMet: 'Null',
      LockError: 'Null',
      NoPermission: 'Null',
      Unanchored: 'Null',
      NotDepositable: 'Null',
      UnhandledXcmVersion: 'Null',
      WeightLimitReached: 'SpWeightsWeightV2Weight',
      Barrier: 'Null',
      WeightNotComputable: 'Null',
      ExceedsStackLimit: 'Null'
    }
  },
  /**
   * Lookup123: pallet_xcm::pallet::Event<T>
   **/
  PalletXcmEvent: {
    _enum: {
      Attempted: {
        outcome: 'XcmV3TraitsOutcome',
      },
      Sent: {
        origin: 'XcmV3MultiLocation',
        destination: 'XcmV3MultiLocation',
        message: 'XcmV3Xcm',
        messageId: '[u8;32]',
      },
      UnexpectedResponse: {
        origin: 'XcmV3MultiLocation',
        queryId: 'u64',
      },
      ResponseReady: {
        queryId: 'u64',
        response: 'XcmV3Response',
      },
      Notified: {
        queryId: 'u64',
        palletIndex: 'u8',
        callIndex: 'u8',
      },
      NotifyOverweight: {
        queryId: 'u64',
        palletIndex: 'u8',
        callIndex: 'u8',
        actualWeight: 'SpWeightsWeightV2Weight',
        maxBudgetedWeight: 'SpWeightsWeightV2Weight',
      },
      NotifyDispatchError: {
        queryId: 'u64',
        palletIndex: 'u8',
        callIndex: 'u8',
      },
      NotifyDecodeFailed: {
        queryId: 'u64',
        palletIndex: 'u8',
        callIndex: 'u8',
      },
      InvalidResponder: {
        origin: 'XcmV3MultiLocation',
        queryId: 'u64',
        expectedLocation: 'Option<XcmV3MultiLocation>',
      },
      InvalidResponderVersion: {
        origin: 'XcmV3MultiLocation',
        queryId: 'u64',
      },
      ResponseTaken: {
        queryId: 'u64',
      },
      AssetsTrapped: {
        _alias: {
          hash_: 'hash',
        },
        hash_: 'H256',
        origin: 'XcmV3MultiLocation',
        assets: 'XcmVersionedMultiAssets',
      },
      VersionChangeNotified: {
        destination: 'XcmV3MultiLocation',
        result: 'u32',
        cost: 'XcmV3MultiassetMultiAssets',
        messageId: '[u8;32]',
      },
      SupportedVersionChanged: {
        location: 'XcmV3MultiLocation',
        version: 'u32',
      },
      NotifyTargetSendFail: {
        location: 'XcmV3MultiLocation',
        queryId: 'u64',
        error: 'XcmV3TraitsError',
      },
      NotifyTargetMigrationFail: {
        location: 'XcmVersionedMultiLocation',
        queryId: 'u64',
      },
      InvalidQuerierVersion: {
        origin: 'XcmV3MultiLocation',
        queryId: 'u64',
      },
      InvalidQuerier: {
        origin: 'XcmV3MultiLocation',
        queryId: 'u64',
        expectedQuerier: 'XcmV3MultiLocation',
        maybeActualQuerier: 'Option<XcmV3MultiLocation>',
      },
      VersionNotifyStarted: {
        destination: 'XcmV3MultiLocation',
        cost: 'XcmV3MultiassetMultiAssets',
        messageId: '[u8;32]',
      },
      VersionNotifyRequested: {
        destination: 'XcmV3MultiLocation',
        cost: 'XcmV3MultiassetMultiAssets',
        messageId: '[u8;32]',
      },
      VersionNotifyUnrequested: {
        destination: 'XcmV3MultiLocation',
        cost: 'XcmV3MultiassetMultiAssets',
        messageId: '[u8;32]',
      },
      FeesPaid: {
        paying: 'XcmV3MultiLocation',
        fees: 'XcmV3MultiassetMultiAssets',
      },
      AssetsClaimed: {
        _alias: {
          hash_: 'hash',
        },
        hash_: 'H256',
        origin: 'XcmV3MultiLocation',
        assets: 'XcmVersionedMultiAssets'
      }
    }
  },
  /**
   * Lookup124: xcm::v3::traits::Outcome
   **/
  XcmV3TraitsOutcome: {
    _enum: {
      Complete: 'SpWeightsWeightV2Weight',
      Incomplete: '(SpWeightsWeightV2Weight,XcmV3TraitsError)',
      Error: 'XcmV3TraitsError'
    }
  },
  /**
   * Lookup125: xcm::v3::multilocation::MultiLocation
   **/
  XcmV3MultiLocation: {
    parents: 'u8',
    interior: 'XcmV3Junctions'
  },
  /**
   * Lookup126: xcm::v3::junctions::Junctions
   **/
  XcmV3Junctions: {
    _enum: {
      Here: 'Null',
      X1: 'XcmV3Junction',
      X2: '(XcmV3Junction,XcmV3Junction)',
      X3: '(XcmV3Junction,XcmV3Junction,XcmV3Junction)',
      X4: '(XcmV3Junction,XcmV3Junction,XcmV3Junction,XcmV3Junction)',
      X5: '(XcmV3Junction,XcmV3Junction,XcmV3Junction,XcmV3Junction,XcmV3Junction)',
      X6: '(XcmV3Junction,XcmV3Junction,XcmV3Junction,XcmV3Junction,XcmV3Junction,XcmV3Junction)',
      X7: '(XcmV3Junction,XcmV3Junction,XcmV3Junction,XcmV3Junction,XcmV3Junction,XcmV3Junction,XcmV3Junction)',
      X8: '(XcmV3Junction,XcmV3Junction,XcmV3Junction,XcmV3Junction,XcmV3Junction,XcmV3Junction,XcmV3Junction,XcmV3Junction)'
    }
  },
  /**
   * Lookup127: xcm::v3::junction::Junction
   **/
  XcmV3Junction: {
    _enum: {
      Parachain: 'Compact<u32>',
      AccountId32: {
        network: 'Option<XcmV3JunctionNetworkId>',
        id: '[u8;32]',
      },
      AccountIndex64: {
        network: 'Option<XcmV3JunctionNetworkId>',
        index: 'Compact<u64>',
      },
      AccountKey20: {
        network: 'Option<XcmV3JunctionNetworkId>',
        key: '[u8;20]',
      },
      PalletInstance: 'u8',
      GeneralIndex: 'Compact<u128>',
      GeneralKey: {
        length: 'u8',
        data: '[u8;32]',
      },
      OnlyChild: 'Null',
      Plurality: {
        id: 'XcmV3JunctionBodyId',
        part: 'XcmV3JunctionBodyPart',
      },
      GlobalConsensus: 'XcmV3JunctionNetworkId'
    }
  },
  /**
   * Lookup130: xcm::v3::junction::NetworkId
   **/
  XcmV3JunctionNetworkId: {
    _enum: {
      ByGenesis: '[u8;32]',
      ByFork: {
        blockNumber: 'u64',
        blockHash: '[u8;32]',
      },
      Polkadot: 'Null',
      Kusama: 'Null',
      Westend: 'Null',
      Rococo: 'Null',
      Wococo: 'Null',
      Ethereum: {
        chainId: 'Compact<u64>',
      },
      BitcoinCore: 'Null',
      BitcoinCash: 'Null'
    }
  },
  /**
   * Lookup132: xcm::v3::junction::BodyId
   **/
  XcmV3JunctionBodyId: {
    _enum: {
      Unit: 'Null',
      Moniker: '[u8;4]',
      Index: 'Compact<u32>',
      Executive: 'Null',
      Technical: 'Null',
      Legislative: 'Null',
      Judicial: 'Null',
      Defense: 'Null',
      Administration: 'Null',
      Treasury: 'Null'
    }
  },
  /**
   * Lookup133: xcm::v3::junction::BodyPart
   **/
  XcmV3JunctionBodyPart: {
    _enum: {
      Voice: 'Null',
      Members: {
        count: 'Compact<u32>',
      },
      Fraction: {
        nom: 'Compact<u32>',
        denom: 'Compact<u32>',
      },
      AtLeastProportion: {
        nom: 'Compact<u32>',
        denom: 'Compact<u32>',
      },
      MoreThanProportion: {
        nom: 'Compact<u32>',
        denom: 'Compact<u32>'
      }
    }
  },
  /**
   * Lookup134: xcm::v3::Xcm<Call>
   **/
  XcmV3Xcm: 'Vec<XcmV3Instruction>',
  /**
   * Lookup136: xcm::v3::Instruction<Call>
   **/
  XcmV3Instruction: {
    _enum: {
      WithdrawAsset: 'XcmV3MultiassetMultiAssets',
      ReserveAssetDeposited: 'XcmV3MultiassetMultiAssets',
      ReceiveTeleportedAsset: 'XcmV3MultiassetMultiAssets',
      QueryResponse: {
        queryId: 'Compact<u64>',
        response: 'XcmV3Response',
        maxWeight: 'SpWeightsWeightV2Weight',
        querier: 'Option<XcmV3MultiLocation>',
      },
      TransferAsset: {
        assets: 'XcmV3MultiassetMultiAssets',
        beneficiary: 'XcmV3MultiLocation',
      },
      TransferReserveAsset: {
        assets: 'XcmV3MultiassetMultiAssets',
        dest: 'XcmV3MultiLocation',
        xcm: 'XcmV3Xcm',
      },
      Transact: {
        originKind: 'XcmV2OriginKind',
        requireWeightAtMost: 'SpWeightsWeightV2Weight',
        call: 'XcmDoubleEncoded',
      },
      HrmpNewChannelOpenRequest: {
        sender: 'Compact<u32>',
        maxMessageSize: 'Compact<u32>',
        maxCapacity: 'Compact<u32>',
      },
      HrmpChannelAccepted: {
        recipient: 'Compact<u32>',
      },
      HrmpChannelClosing: {
        initiator: 'Compact<u32>',
        sender: 'Compact<u32>',
        recipient: 'Compact<u32>',
      },
      ClearOrigin: 'Null',
      DescendOrigin: 'XcmV3Junctions',
      ReportError: 'XcmV3QueryResponseInfo',
      DepositAsset: {
        assets: 'XcmV3MultiassetMultiAssetFilter',
        beneficiary: 'XcmV3MultiLocation',
      },
      DepositReserveAsset: {
        assets: 'XcmV3MultiassetMultiAssetFilter',
        dest: 'XcmV3MultiLocation',
        xcm: 'XcmV3Xcm',
      },
      ExchangeAsset: {
        give: 'XcmV3MultiassetMultiAssetFilter',
        want: 'XcmV3MultiassetMultiAssets',
        maximal: 'bool',
      },
      InitiateReserveWithdraw: {
        assets: 'XcmV3MultiassetMultiAssetFilter',
        reserve: 'XcmV3MultiLocation',
        xcm: 'XcmV3Xcm',
      },
      InitiateTeleport: {
        assets: 'XcmV3MultiassetMultiAssetFilter',
        dest: 'XcmV3MultiLocation',
        xcm: 'XcmV3Xcm',
      },
      ReportHolding: {
        responseInfo: 'XcmV3QueryResponseInfo',
        assets: 'XcmV3MultiassetMultiAssetFilter',
      },
      BuyExecution: {
        fees: 'XcmV3MultiAsset',
        weightLimit: 'XcmV3WeightLimit',
      },
      RefundSurplus: 'Null',
      SetErrorHandler: 'XcmV3Xcm',
      SetAppendix: 'XcmV3Xcm',
      ClearError: 'Null',
      ClaimAsset: {
        assets: 'XcmV3MultiassetMultiAssets',
        ticket: 'XcmV3MultiLocation',
      },
      Trap: 'Compact<u64>',
      SubscribeVersion: {
        queryId: 'Compact<u64>',
        maxResponseWeight: 'SpWeightsWeightV2Weight',
      },
      UnsubscribeVersion: 'Null',
      BurnAsset: 'XcmV3MultiassetMultiAssets',
      ExpectAsset: 'XcmV3MultiassetMultiAssets',
      ExpectOrigin: 'Option<XcmV3MultiLocation>',
      ExpectError: 'Option<(u32,XcmV3TraitsError)>',
      ExpectTransactStatus: 'XcmV3MaybeErrorCode',
      QueryPallet: {
        moduleName: 'Bytes',
        responseInfo: 'XcmV3QueryResponseInfo',
      },
      ExpectPallet: {
        index: 'Compact<u32>',
        name: 'Bytes',
        moduleName: 'Bytes',
        crateMajor: 'Compact<u32>',
        minCrateMinor: 'Compact<u32>',
      },
      ReportTransactStatus: 'XcmV3QueryResponseInfo',
      ClearTransactStatus: 'Null',
      UniversalOrigin: 'XcmV3Junction',
      ExportMessage: {
        network: 'XcmV3JunctionNetworkId',
        destination: 'XcmV3Junctions',
        xcm: 'XcmV3Xcm',
      },
      LockAsset: {
        asset: 'XcmV3MultiAsset',
        unlocker: 'XcmV3MultiLocation',
      },
      UnlockAsset: {
        asset: 'XcmV3MultiAsset',
        target: 'XcmV3MultiLocation',
      },
      NoteUnlockable: {
        asset: 'XcmV3MultiAsset',
        owner: 'XcmV3MultiLocation',
      },
      RequestUnlock: {
        asset: 'XcmV3MultiAsset',
        locker: 'XcmV3MultiLocation',
      },
      SetFeesMode: {
        jitWithdraw: 'bool',
      },
      SetTopic: '[u8;32]',
      ClearTopic: 'Null',
      AliasOrigin: 'XcmV3MultiLocation',
      UnpaidExecution: {
        weightLimit: 'XcmV3WeightLimit',
        checkOrigin: 'Option<XcmV3MultiLocation>'
      }
    }
  },
  /**
   * Lookup137: xcm::v3::multiasset::MultiAssets
   **/
  XcmV3MultiassetMultiAssets: 'Vec<XcmV3MultiAsset>',
  /**
   * Lookup139: xcm::v3::multiasset::MultiAsset
   **/
  XcmV3MultiAsset: {
    id: 'XcmV3MultiassetAssetId',
    fun: 'XcmV3MultiassetFungibility'
  },
  /**
   * Lookup140: xcm::v3::multiasset::AssetId
   **/
  XcmV3MultiassetAssetId: {
    _enum: {
      Concrete: 'XcmV3MultiLocation',
      Abstract: '[u8;32]'
    }
  },
  /**
   * Lookup141: xcm::v3::multiasset::Fungibility
   **/
  XcmV3MultiassetFungibility: {
    _enum: {
      Fungible: 'Compact<u128>',
      NonFungible: 'XcmV3MultiassetAssetInstance'
    }
  },
  /**
   * Lookup142: xcm::v3::multiasset::AssetInstance
   **/
  XcmV3MultiassetAssetInstance: {
    _enum: {
      Undefined: 'Null',
      Index: 'Compact<u128>',
      Array4: '[u8;4]',
      Array8: '[u8;8]',
      Array16: '[u8;16]',
      Array32: '[u8;32]'
    }
  },
  /**
   * Lookup144: xcm::v3::Response
   **/
  XcmV3Response: {
    _enum: {
      Null: 'Null',
      Assets: 'XcmV3MultiassetMultiAssets',
      ExecutionResult: 'Option<(u32,XcmV3TraitsError)>',
      Version: 'u32',
      PalletsInfo: 'Vec<XcmV3PalletInfo>',
      DispatchResult: 'XcmV3MaybeErrorCode'
    }
  },
  /**
   * Lookup148: xcm::v3::PalletInfo
   **/
  XcmV3PalletInfo: {
    index: 'Compact<u32>',
    name: 'Bytes',
    moduleName: 'Bytes',
    major: 'Compact<u32>',
    minor: 'Compact<u32>',
    patch: 'Compact<u32>'
  },
  /**
   * Lookup151: xcm::v3::MaybeErrorCode
   **/
  XcmV3MaybeErrorCode: {
    _enum: {
      Success: 'Null',
      Error: 'Bytes',
      TruncatedError: 'Bytes'
    }
  },
  /**
   * Lookup154: xcm::v2::OriginKind
   **/
  XcmV2OriginKind: {
    _enum: ['Native', 'SovereignAccount', 'Superuser', 'Xcm']
  },
  /**
   * Lookup155: xcm::double_encoded::DoubleEncoded<T>
   **/
  XcmDoubleEncoded: {
    encoded: 'Bytes'
  },
  /**
   * Lookup156: xcm::v3::QueryResponseInfo
   **/
  XcmV3QueryResponseInfo: {
    destination: 'XcmV3MultiLocation',
    queryId: 'Compact<u64>',
    maxWeight: 'SpWeightsWeightV2Weight'
  },
  /**
   * Lookup157: xcm::v3::multiasset::MultiAssetFilter
   **/
  XcmV3MultiassetMultiAssetFilter: {
    _enum: {
      Definite: 'XcmV3MultiassetMultiAssets',
      Wild: 'XcmV3MultiassetWildMultiAsset'
    }
  },
  /**
   * Lookup158: xcm::v3::multiasset::WildMultiAsset
   **/
  XcmV3MultiassetWildMultiAsset: {
    _enum: {
      All: 'Null',
      AllOf: {
        id: 'XcmV3MultiassetAssetId',
        fun: 'XcmV3MultiassetWildFungibility',
      },
      AllCounted: 'Compact<u32>',
      AllOfCounted: {
        id: 'XcmV3MultiassetAssetId',
        fun: 'XcmV3MultiassetWildFungibility',
        count: 'Compact<u32>'
      }
    }
  },
  /**
   * Lookup159: xcm::v3::multiasset::WildFungibility
   **/
  XcmV3MultiassetWildFungibility: {
    _enum: ['Fungible', 'NonFungible']
  },
  /**
   * Lookup160: xcm::v3::WeightLimit
   **/
  XcmV3WeightLimit: {
    _enum: {
      Unlimited: 'Null',
      Limited: 'SpWeightsWeightV2Weight'
    }
  },
  /**
   * Lookup161: xcm::VersionedMultiAssets
   **/
  XcmVersionedMultiAssets: {
    _enum: {
      __Unused0: 'Null',
      V2: 'XcmV2MultiassetMultiAssets',
      __Unused2: 'Null',
      V3: 'XcmV3MultiassetMultiAssets'
    }
  },
  /**
   * Lookup162: xcm::v2::multiasset::MultiAssets
   **/
  XcmV2MultiassetMultiAssets: 'Vec<XcmV2MultiAsset>',
  /**
   * Lookup164: xcm::v2::multiasset::MultiAsset
   **/
  XcmV2MultiAsset: {
    id: 'XcmV2MultiassetAssetId',
    fun: 'XcmV2MultiassetFungibility'
  },
  /**
   * Lookup165: xcm::v2::multiasset::AssetId
   **/
  XcmV2MultiassetAssetId: {
    _enum: {
      Concrete: 'XcmV2MultiLocation',
      Abstract: 'Bytes'
    }
  },
  /**
   * Lookup166: xcm::v2::multilocation::MultiLocation
   **/
  XcmV2MultiLocation: {
    parents: 'u8',
    interior: 'XcmV2MultilocationJunctions'
  },
  /**
   * Lookup167: xcm::v2::multilocation::Junctions
   **/
  XcmV2MultilocationJunctions: {
    _enum: {
      Here: 'Null',
      X1: 'XcmV2Junction',
      X2: '(XcmV2Junction,XcmV2Junction)',
      X3: '(XcmV2Junction,XcmV2Junction,XcmV2Junction)',
      X4: '(XcmV2Junction,XcmV2Junction,XcmV2Junction,XcmV2Junction)',
      X5: '(XcmV2Junction,XcmV2Junction,XcmV2Junction,XcmV2Junction,XcmV2Junction)',
      X6: '(XcmV2Junction,XcmV2Junction,XcmV2Junction,XcmV2Junction,XcmV2Junction,XcmV2Junction)',
      X7: '(XcmV2Junction,XcmV2Junction,XcmV2Junction,XcmV2Junction,XcmV2Junction,XcmV2Junction,XcmV2Junction)',
      X8: '(XcmV2Junction,XcmV2Junction,XcmV2Junction,XcmV2Junction,XcmV2Junction,XcmV2Junction,XcmV2Junction,XcmV2Junction)'
    }
  },
  /**
   * Lookup168: xcm::v2::junction::Junction
   **/
  XcmV2Junction: {
    _enum: {
      Parachain: 'Compact<u32>',
      AccountId32: {
        network: 'XcmV2NetworkId',
        id: '[u8;32]',
      },
      AccountIndex64: {
        network: 'XcmV2NetworkId',
        index: 'Compact<u64>',
      },
      AccountKey20: {
        network: 'XcmV2NetworkId',
        key: '[u8;20]',
      },
      PalletInstance: 'u8',
      GeneralIndex: 'Compact<u128>',
      GeneralKey: 'Bytes',
      OnlyChild: 'Null',
      Plurality: {
        id: 'XcmV2BodyId',
        part: 'XcmV2BodyPart'
      }
    }
  },
  /**
   * Lookup169: xcm::v2::NetworkId
   **/
  XcmV2NetworkId: {
    _enum: {
      Any: 'Null',
      Named: 'Bytes',
      Polkadot: 'Null',
      Kusama: 'Null'
    }
  },
  /**
   * Lookup171: xcm::v2::BodyId
   **/
  XcmV2BodyId: {
    _enum: {
      Unit: 'Null',
      Named: 'Bytes',
      Index: 'Compact<u32>',
      Executive: 'Null',
      Technical: 'Null',
      Legislative: 'Null',
      Judicial: 'Null',
      Defense: 'Null',
      Administration: 'Null',
      Treasury: 'Null'
    }
  },
  /**
   * Lookup172: xcm::v2::BodyPart
   **/
  XcmV2BodyPart: {
    _enum: {
      Voice: 'Null',
      Members: {
        count: 'Compact<u32>',
      },
      Fraction: {
        nom: 'Compact<u32>',
        denom: 'Compact<u32>',
      },
      AtLeastProportion: {
        nom: 'Compact<u32>',
        denom: 'Compact<u32>',
      },
      MoreThanProportion: {
        nom: 'Compact<u32>',
        denom: 'Compact<u32>'
      }
    }
  },
  /**
   * Lookup173: xcm::v2::multiasset::Fungibility
   **/
  XcmV2MultiassetFungibility: {
    _enum: {
      Fungible: 'Compact<u128>',
      NonFungible: 'XcmV2MultiassetAssetInstance'
    }
  },
  /**
   * Lookup174: xcm::v2::multiasset::AssetInstance
   **/
  XcmV2MultiassetAssetInstance: {
    _enum: {
      Undefined: 'Null',
      Index: 'Compact<u128>',
      Array4: '[u8;4]',
      Array8: '[u8;8]',
      Array16: '[u8;16]',
      Array32: '[u8;32]',
      Blob: 'Bytes'
    }
  },
  /**
   * Lookup175: xcm::VersionedMultiLocation
   **/
  XcmVersionedMultiLocation: {
    _enum: {
      __Unused0: 'Null',
      V2: 'XcmV2MultiLocation',
      __Unused2: 'Null',
      V3: 'XcmV3MultiLocation'
    }
  },
  /**
   * Lookup176: cumulus_pallet_xcm::pallet::Event<T>
   **/
  CumulusPalletXcmEvent: {
    _enum: {
      InvalidFormat: '[u8;32]',
      UnsupportedVersion: '[u8;32]',
      ExecutedDownward: '([u8;32],XcmV3TraitsOutcome)'
    }
  },
  /**
   * Lookup177: cumulus_pallet_dmp_queue::pallet::Event<T>
   **/
  CumulusPalletDmpQueueEvent: {
    _enum: {
      InvalidFormat: {
        messageHash: '[u8;32]',
      },
      UnsupportedVersion: {
        messageHash: '[u8;32]',
      },
      ExecutedDownward: {
        messageHash: '[u8;32]',
        messageId: '[u8;32]',
        outcome: 'XcmV3TraitsOutcome',
      },
      WeightExhausted: {
        messageHash: '[u8;32]',
        messageId: '[u8;32]',
        remainingWeight: 'SpWeightsWeightV2Weight',
        requiredWeight: 'SpWeightsWeightV2Weight',
      },
      OverweightEnqueued: {
        messageHash: '[u8;32]',
        messageId: '[u8;32]',
        overweightIndex: 'u64',
        requiredWeight: 'SpWeightsWeightV2Weight',
      },
      OverweightServiced: {
        overweightIndex: 'u64',
        weightUsed: 'SpWeightsWeightV2Weight',
      },
      MaxMessagesExhausted: {
        messageHash: '[u8;32]'
      }
    }
  },
  /**
   * Lookup178: frame_system::Phase
   **/
  FrameSystemPhase: {
    _enum: {
      ApplyExtrinsic: 'u32',
      Finalization: 'Null',
      Initialization: 'Null'
    }
  },
  /**
   * Lookup180: frame_system::LastRuntimeUpgradeInfo
   **/
  FrameSystemLastRuntimeUpgradeInfo: {
    specVersion: 'Compact<u32>',
    specName: 'Text'
  },
  /**
   * Lookup182: frame_system::pallet::Call<T>
   **/
  FrameSystemCall: {
    _enum: {
      remark: {
        remark: 'Bytes',
      },
      set_heap_pages: {
        pages: 'u64',
      },
      set_code: {
        code: 'Bytes',
      },
      set_code_without_checks: {
        code: 'Bytes',
      },
      set_storage: {
        items: 'Vec<(Bytes,Bytes)>',
      },
      kill_storage: {
        _alias: {
          keys_: 'keys',
        },
        keys_: 'Vec<Bytes>',
      },
      kill_prefix: {
        prefix: 'Bytes',
        subkeys: 'u32',
      },
      remark_with_event: {
        remark: 'Bytes'
      }
    }
  },
  /**
   * Lookup186: frame_system::limits::BlockWeights
   **/
  FrameSystemLimitsBlockWeights: {
    baseBlock: 'SpWeightsWeightV2Weight',
    maxBlock: 'SpWeightsWeightV2Weight',
    perClass: 'FrameSupportDispatchPerDispatchClassWeightsPerClass'
  },
  /**
   * Lookup187: frame_support::dispatch::PerDispatchClass<frame_system::limits::WeightsPerClass>
   **/
  FrameSupportDispatchPerDispatchClassWeightsPerClass: {
    normal: 'FrameSystemLimitsWeightsPerClass',
    operational: 'FrameSystemLimitsWeightsPerClass',
    mandatory: 'FrameSystemLimitsWeightsPerClass'
  },
  /**
   * Lookup188: frame_system::limits::WeightsPerClass
   **/
  FrameSystemLimitsWeightsPerClass: {
    baseExtrinsic: 'SpWeightsWeightV2Weight',
    maxExtrinsic: 'Option<SpWeightsWeightV2Weight>',
    maxTotal: 'Option<SpWeightsWeightV2Weight>',
    reserved: 'Option<SpWeightsWeightV2Weight>'
  },
  /**
   * Lookup190: frame_system::limits::BlockLength
   **/
  FrameSystemLimitsBlockLength: {
    max: 'FrameSupportDispatchPerDispatchClassU32'
  },
  /**
   * Lookup191: frame_support::dispatch::PerDispatchClass<T>
   **/
  FrameSupportDispatchPerDispatchClassU32: {
    normal: 'u32',
    operational: 'u32',
    mandatory: 'u32'
  },
  /**
   * Lookup192: sp_weights::RuntimeDbWeight
   **/
  SpWeightsRuntimeDbWeight: {
    read: 'u64',
    write: 'u64'
  },
  /**
   * Lookup193: sp_version::RuntimeVersion
   **/
  SpVersionRuntimeVersion: {
    specName: 'Text',
    implName: 'Text',
    authoringVersion: 'u32',
    specVersion: 'u32',
    implVersion: 'u32',
    apis: 'Vec<([u8;8],u32)>',
    transactionVersion: 'u32',
    stateVersion: 'u8'
  },
  /**
   * Lookup197: frame_system::pallet::Error<T>
   **/
  FrameSystemError: {
    _enum: ['InvalidSpecName', 'SpecVersionNeedsToIncrease', 'FailedToExtractRuntimeVersion', 'NonDefaultComposite', 'NonZeroRefCount', 'CallFiltered']
  },
  /**
   * Lookup198: pallet_timestamp::pallet::Call<T>
   **/
  PalletTimestampCall: {
    _enum: {
      set: {
        now: 'Compact<u64>'
      }
    }
  },
  /**
   * Lookup200: pallet_indices::pallet::Call<T>
   **/
  PalletIndicesCall: {
    _enum: {
      claim: {
        index: 'u64',
      },
      transfer: {
        _alias: {
          new_: 'new',
        },
        new_: 'MultiAddress',
        index: 'u64',
      },
      free: {
        index: 'u64',
      },
      force_transfer: {
        _alias: {
          new_: 'new',
        },
        new_: 'MultiAddress',
        index: 'u64',
        freeze: 'bool',
      },
      freeze: {
        index: 'u64'
      }
    }
  },
  /**
   * Lookup203: pallet_indices::pallet::Error<T>
   **/
  PalletIndicesError: {
    _enum: ['NotAssigned', 'NotOwner', 'InUse', 'NotTransfer', 'Permanent']
  },
  /**
   * Lookup205: pallet_balances::types::BalanceLock<Balance>
   **/
  PalletBalancesBalanceLock: {
    id: '[u8;8]',
    amount: 'u128',
    reasons: 'PalletBalancesReasons'
  },
  /**
   * Lookup206: pallet_balances::types::Reasons
   **/
  PalletBalancesReasons: {
    _enum: ['Fee', 'Misc', 'All']
  },
  /**
   * Lookup209: pallet_balances::types::ReserveData<ReserveIdentifier, Balance>
   **/
  PalletBalancesReserveData: {
    id: '[u8;8]',
    amount: 'u128'
  },
  /**
   * Lookup212: pallet_balances::types::IdAmount<spiritnet_runtime::RuntimeHoldReason, Balance>
   **/
  PalletBalancesIdAmountRuntimeHoldReason: {
    id: 'SpiritnetRuntimeRuntimeHoldReason',
    amount: 'u128'
  },
  /**
   * Lookup213: spiritnet_runtime::RuntimeHoldReason
   **/
  SpiritnetRuntimeRuntimeHoldReason: {
    _enum: {
      __Unused0: 'Null',
      __Unused1: 'Null',
      __Unused2: 'Null',
      __Unused3: 'Null',
      __Unused4: 'Null',
      __Unused5: 'Null',
      __Unused6: 'Null',
      __Unused7: 'Null',
      __Unused8: 'Null',
      __Unused9: 'Null',
      __Unused10: 'Null',
      __Unused11: 'Null',
      __Unused12: 'Null',
      __Unused13: 'Null',
      __Unused14: 'Null',
      __Unused15: 'Null',
      __Unused16: 'Null',
      __Unused17: 'Null',
      __Unused18: 'Null',
      __Unused19: 'Null',
      __Unused20: 'Null',
      __Unused21: 'Null',
      __Unused22: 'Null',
      __Unused23: 'Null',
      __Unused24: 'Null',
      __Unused25: 'Null',
      __Unused26: 'Null',
      __Unused27: 'Null',
      __Unused28: 'Null',
      __Unused29: 'Null',
      __Unused30: 'Null',
      __Unused31: 'Null',
      __Unused32: 'Null',
      __Unused33: 'Null',
      __Unused34: 'Null',
      __Unused35: 'Null',
      __Unused36: 'Null',
      __Unused37: 'Null',
      __Unused38: 'Null',
      __Unused39: 'Null',
      __Unused40: 'Null',
      __Unused41: 'Null',
      __Unused42: 'Null',
      __Unused43: 'Null',
      __Unused44: 'Null',
      __Unused45: 'Null',
      __Unused46: 'Null',
      __Unused47: 'Null',
      __Unused48: 'Null',
      __Unused49: 'Null',
      __Unused50: 'Null',
      __Unused51: 'Null',
      __Unused52: 'Null',
      __Unused53: 'Null',
      __Unused54: 'Null',
      __Unused55: 'Null',
      __Unused56: 'Null',
      __Unused57: 'Null',
      __Unused58: 'Null',
      __Unused59: 'Null',
      __Unused60: 'Null',
      __Unused61: 'Null',
      Attestation: 'AttestationHoldReason',
      Delegation: 'DelegationHoldReason',
      Did: 'DidHoldReason',
      __Unused65: 'Null',
      __Unused66: 'Null',
      DidLookup: 'PalletDidLookupHoldReason',
      Web3Names: 'PalletWeb3NamesHoldReason',
      PublicCredentials: 'PublicCredentialsHoldReason'
    }
  },
  /**
   * Lookup214: attestation::pallet::HoldReason
   **/
  AttestationHoldReason: {
    _enum: ['Deposit']
  },
  /**
   * Lookup215: delegation::pallet::HoldReason
   **/
  DelegationHoldReason: {
    _enum: ['Deposit']
  },
  /**
   * Lookup216: did::pallet::HoldReason
   **/
  DidHoldReason: {
    _enum: ['Deposit']
  },
  /**
   * Lookup217: pallet_did_lookup::pallet::HoldReason
   **/
  PalletDidLookupHoldReason: {
    _enum: ['Deposit']
  },
  /**
   * Lookup218: pallet_web3_names::pallet::HoldReason
   **/
  PalletWeb3NamesHoldReason: {
    _enum: ['Deposit']
  },
  /**
   * Lookup219: public_credentials::pallet::HoldReason
   **/
  PublicCredentialsHoldReason: {
    _enum: ['Deposit']
  },
  /**
   * Lookup222: pallet_balances::types::IdAmount<spiritnet_runtime::RuntimeFreezeReason, Balance>
   **/
  PalletBalancesIdAmountRuntimeFreezeReason: {
    id: 'SpiritnetRuntimeRuntimeFreezeReason',
    amount: 'u128'
  },
  /**
   * Lookup223: spiritnet_runtime::RuntimeFreezeReason
   **/
  SpiritnetRuntimeRuntimeFreezeReason: {
    _enum: {
      __Unused0: 'Null',
      __Unused1: 'Null',
      __Unused2: 'Null',
      __Unused3: 'Null',
      __Unused4: 'Null',
      __Unused5: 'Null',
      __Unused6: 'Null',
      __Unused7: 'Null',
      __Unused8: 'Null',
      __Unused9: 'Null',
      __Unused10: 'Null',
      __Unused11: 'Null',
      __Unused12: 'Null',
      __Unused13: 'Null',
      __Unused14: 'Null',
      __Unused15: 'Null',
      __Unused16: 'Null',
      __Unused17: 'Null',
      __Unused18: 'Null',
      __Unused19: 'Null',
      __Unused20: 'Null',
      ParachainStaking: 'ParachainStakingFreezeReason'
    }
  },
  /**
   * Lookup224: parachain_staking::pallet::FreezeReason
   **/
  ParachainStakingFreezeReason: {
    _enum: ['Staking']
  },
  /**
   * Lookup226: pallet_balances::pallet::Call<T, I>
   **/
  PalletBalancesCall: {
    _enum: {
      transfer_allow_death: {
        dest: 'MultiAddress',
        value: 'Compact<u128>',
      },
      set_balance_deprecated: {
        who: 'MultiAddress',
        newFree: 'Compact<u128>',
        oldReserved: 'Compact<u128>',
      },
      force_transfer: {
        source: 'MultiAddress',
        dest: 'MultiAddress',
        value: 'Compact<u128>',
      },
      transfer_keep_alive: {
        dest: 'MultiAddress',
        value: 'Compact<u128>',
      },
      transfer_all: {
        dest: 'MultiAddress',
        keepAlive: 'bool',
      },
      force_unreserve: {
        who: 'MultiAddress',
        amount: 'u128',
      },
      upgrade_accounts: {
        who: 'Vec<AccountId32>',
      },
      transfer: {
        dest: 'MultiAddress',
        value: 'Compact<u128>',
      },
      force_set_balance: {
        who: 'MultiAddress',
        newFree: 'Compact<u128>'
      }
    }
  },
  /**
   * Lookup227: pallet_balances::pallet::Error<T, I>
   **/
  PalletBalancesError: {
    _enum: ['VestingBalance', 'LiquidityRestrictions', 'InsufficientBalance', 'ExistentialDeposit', 'Expendability', 'ExistingVestingSchedule', 'DeadAccount', 'TooManyReserves', 'TooManyHolds', 'TooManyFreezes']
  },
  /**
   * Lookup229: pallet_transaction_payment::Releases
   **/
  PalletTransactionPaymentReleases: {
    _enum: ['V1Ancient', 'V2']
  },
  /**
   * Lookup231: sp_consensus_aura::sr25519::app_sr25519::Public
   **/
  SpConsensusAuraSr25519AppSr25519Public: 'SpCoreSr25519Public',
  /**
   * Lookup232: sp_core::sr25519::Public
   **/
  SpCoreSr25519Public: '[u8;32]',
  /**
   * Lookup237: spiritnet_runtime::SessionKeys
   **/
  SpiritnetRuntimeSessionKeys: {
    aura: 'SpConsensusAuraSr25519AppSr25519Public'
  },
  /**
   * Lookup240: sp_core::crypto::KeyTypeId
   **/
  SpCoreCryptoKeyTypeId: '[u8;4]',
  /**
   * Lookup241: pallet_session::pallet::Call<T>
   **/
  PalletSessionCall: {
    _enum: {
      set_keys: {
        _alias: {
          keys_: 'keys',
        },
        keys_: 'SpiritnetRuntimeSessionKeys',
        proof: 'Bytes',
      },
      purge_keys: 'Null'
    }
  },
  /**
   * Lookup242: pallet_session::pallet::Error<T>
   **/
  PalletSessionError: {
    _enum: ['InvalidProof', 'NoAssociatedValidatorId', 'DuplicatedKey', 'NoKeys', 'NoAccount']
  },
  /**
   * Lookup243: parachain_staking::types::RoundInfo<BlockNumber>
   **/
  ParachainStakingRoundInfo: {
    current: 'u32',
    first: 'u64',
    length: 'u64'
  },
  /**
   * Lookup244: parachain_staking::types::DelegationCounter
   **/
  ParachainStakingDelegationCounter: {
    round: 'u32',
    counter: 'u32'
  },
  /**
   * Lookup245: parachain_staking::types::Stake<sp_core::crypto::AccountId32, Balance>
   **/
  ParachainStakingStake: {
    owner: 'AccountId32',
    amount: 'u128'
  },
  /**
   * Lookup246: parachain_staking::types::Candidate<sp_core::crypto::AccountId32, Balance, MaxDelegatorsPerCandidate>
   **/
  ParachainStakingCandidate: {
    id: 'AccountId32',
    stake: 'u128',
    delegators: 'ParachainStakingSetOrderedSet',
    total: 'u128',
    status: 'ParachainStakingCandidateStatus'
  },
  /**
   * Lookup247: parachain_staking::set::OrderedSet<parachain_staking::types::Stake<sp_core::crypto::AccountId32, Balance>, S>
   **/
  ParachainStakingSetOrderedSet: 'Vec<ParachainStakingStake>',
  /**
   * Lookup250: parachain_staking::types::CandidateStatus
   **/
  ParachainStakingCandidateStatus: {
    _enum: {
      Active: 'Null',
      Leaving: 'u32'
    }
  },
  /**
   * Lookup251: parachain_staking::types::TotalStake<Balance>
   **/
  ParachainStakingTotalStake: {
    collators: 'u128',
    delegators: 'u128'
  },
  /**
   * Lookup254: parachain_staking::inflation::InflationInfo
   **/
  ParachainStakingInflationInflationInfo: {
    collator: 'ParachainStakingInflationStakingInfo',
    delegator: 'ParachainStakingInflationStakingInfo'
  },
  /**
   * Lookup255: parachain_staking::inflation::StakingInfo
   **/
  ParachainStakingInflationStakingInfo: {
    maxRate: 'Perquintill',
    rewardRate: 'ParachainStakingInflationRewardRate'
  },
  /**
   * Lookup256: parachain_staking::inflation::RewardRate
   **/
  ParachainStakingInflationRewardRate: {
    annual: 'Perquintill',
    perBlock: 'Perquintill'
  },
  /**
   * Lookup261: parachain_staking::pallet::Call<T>
   **/
  ParachainStakingCall: {
    _enum: {
      force_new_round: 'Null',
      set_inflation: {
        collatorMaxRatePercentage: 'Perquintill',
        collatorAnnualRewardRatePercentage: 'Perquintill',
        delegatorMaxRatePercentage: 'Perquintill',
        delegatorAnnualRewardRatePercentage: 'Perquintill',
      },
      set_max_selected_candidates: {
        _alias: {
          new_: 'new',
        },
        new_: 'u32',
      },
      set_blocks_per_round: {
        _alias: {
          new_: 'new',
        },
        new_: 'u64',
      },
      set_max_candidate_stake: {
        _alias: {
          new_: 'new',
        },
        new_: 'u128',
      },
      force_remove_candidate: {
        collator: 'MultiAddress',
      },
      join_candidates: {
        stake: 'u128',
      },
      init_leave_candidates: 'Null',
      execute_leave_candidates: {
        collator: 'MultiAddress',
      },
      cancel_leave_candidates: 'Null',
      candidate_stake_more: {
        more: 'u128',
      },
      candidate_stake_less: {
        less: 'u128',
      },
      join_delegators: {
        collator: 'MultiAddress',
        amount: 'u128',
      },
      leave_delegators: 'Null',
      delegator_stake_more: {
        more: 'u128',
      },
      delegator_stake_less: {
        less: 'u128',
      },
      unlock_unstaked: {
        target: 'MultiAddress',
      },
      claim_rewards: 'Null',
      increment_collator_rewards: 'Null',
      increment_delegator_rewards: 'Null',
      execute_scheduled_reward_change: 'Null'
    }
  },
  /**
   * Lookup262: parachain_staking::pallet::Error<T>
   **/
  ParachainStakingError: {
    _enum: ['DelegatorNotFound', 'CandidateNotFound', 'DelegatorExists', 'CandidateExists', 'ValStakeZero', 'ValStakeBelowMin', 'ValStakeAboveMax', 'DelegationBelowMin', 'AlreadyLeaving', 'NotLeaving', 'CannotLeaveYet', 'CannotJoinBeforeUnlocking', 'AlreadyDelegating', 'NotYetDelegating', 'DelegationsPerRoundExceeded', 'TooManyDelegators', 'TooFewCollatorCandidates', 'CannotStakeIfLeaving', 'CannotDelegateIfLeaving', 'MaxCollatorsPerDelegatorExceeded', 'AlreadyDelegatedCollator', 'DelegationNotFound', 'Underflow', 'CannotSetAboveMax', 'CannotSetBelowMin', 'InvalidSchedule', 'NoMoreUnstaking', 'TooEarly', 'StakeNotFound', 'UnstakingIsEmpty', 'RewardsNotFound']
  },
  /**
   * Lookup265: frame_support::traits::preimages::Bounded<spiritnet_runtime::RuntimeCall>
   **/
  FrameSupportPreimagesBounded: {
    _enum: {
      Legacy: {
        _alias: {
          hash_: 'hash',
        },
        hash_: 'H256',
      },
      Inline: 'Bytes',
      Lookup: {
        _alias: {
          hash_: 'hash',
        },
        hash_: 'H256',
        len: 'u32'
      }
    }
  },
  /**
   * Lookup267: pallet_democracy::pallet::Call<T>
   **/
  PalletDemocracyCall: {
    _enum: {
      propose: {
        proposal: 'FrameSupportPreimagesBounded',
        value: 'Compact<u128>',
      },
      second: {
        proposal: 'Compact<u32>',
      },
      vote: {
        refIndex: 'Compact<u32>',
        vote: 'PalletDemocracyVoteAccountVote',
      },
      emergency_cancel: {
        refIndex: 'u32',
      },
      external_propose: {
        proposal: 'FrameSupportPreimagesBounded',
      },
      external_propose_majority: {
        proposal: 'FrameSupportPreimagesBounded',
      },
      external_propose_default: {
        proposal: 'FrameSupportPreimagesBounded',
      },
      fast_track: {
        proposalHash: 'H256',
        votingPeriod: 'u64',
        delay: 'u64',
      },
      veto_external: {
        proposalHash: 'H256',
      },
      cancel_referendum: {
        refIndex: 'Compact<u32>',
      },
      delegate: {
        to: 'MultiAddress',
        conviction: 'PalletDemocracyConviction',
        balance: 'u128',
      },
      undelegate: 'Null',
      clear_public_proposals: 'Null',
      unlock: {
        target: 'MultiAddress',
      },
      remove_vote: {
        index: 'u32',
      },
      remove_other_vote: {
        target: 'MultiAddress',
        index: 'u32',
      },
      blacklist: {
        proposalHash: 'H256',
        maybeRefIndex: 'Option<u32>',
      },
      cancel_proposal: {
        propIndex: 'Compact<u32>',
      },
      set_metadata: {
        owner: 'PalletDemocracyMetadataOwner',
        maybeHash: 'Option<H256>'
      }
    }
  },
  /**
   * Lookup268: pallet_democracy::conviction::Conviction
   **/
  PalletDemocracyConviction: {
    _enum: ['None', 'Locked1x', 'Locked2x', 'Locked3x', 'Locked4x', 'Locked5x', 'Locked6x']
  },
  /**
   * Lookup271: pallet_collective::pallet::Call<T, I>
   **/
  PalletCollectiveCall: {
    _enum: {
      set_members: {
        newMembers: 'Vec<AccountId32>',
        prime: 'Option<AccountId32>',
        oldCount: 'u32',
      },
      execute: {
        proposal: 'Call',
        lengthBound: 'Compact<u32>',
      },
      propose: {
        threshold: 'Compact<u32>',
        proposal: 'Call',
        lengthBound: 'Compact<u32>',
      },
      vote: {
        proposal: 'H256',
        index: 'Compact<u32>',
        approve: 'bool',
      },
      __Unused4: 'Null',
      disapprove_proposal: {
        proposalHash: 'H256',
      },
      close: {
        proposalHash: 'H256',
        index: 'Compact<u32>',
        proposalWeightBound: 'SpWeightsWeightV2Weight',
        lengthBound: 'Compact<u32>'
      }
    }
  },
  /**
   * Lookup274: pallet_membership::pallet::Call<T, I>
   **/
  PalletMembershipCall: {
    _enum: {
      add_member: {
        who: 'MultiAddress',
      },
      remove_member: {
        who: 'MultiAddress',
      },
      swap_member: {
        remove: 'MultiAddress',
        add: 'MultiAddress',
      },
      reset_members: {
        members: 'Vec<AccountId32>',
      },
      change_key: {
        _alias: {
          new_: 'new',
        },
        new_: 'MultiAddress',
      },
      set_prime: {
        who: 'MultiAddress',
      },
      clear_prime: 'Null'
    }
  },
  /**
   * Lookup275: pallet_treasury::pallet::Call<T, I>
   **/
  PalletTreasuryCall: {
    _enum: {
      propose_spend: {
        value: 'Compact<u128>',
        beneficiary: 'MultiAddress',
      },
      reject_proposal: {
        proposalId: 'Compact<u32>',
      },
      approve_proposal: {
        proposalId: 'Compact<u32>',
      },
      spend: {
        amount: 'Compact<u128>',
        beneficiary: 'MultiAddress',
      },
      remove_approval: {
        proposalId: 'Compact<u32>'
      }
    }
  },
  /**
   * Lookup276: pallet_utility::pallet::Call<T>
   **/
  PalletUtilityCall: {
    _enum: {
      batch: {
        calls: 'Vec<Call>',
      },
      as_derivative: {
        index: 'u16',
        call: 'Call',
      },
      batch_all: {
        calls: 'Vec<Call>',
      },
      dispatch_as: {
        asOrigin: 'SpiritnetRuntimeOriginCaller',
        call: 'Call',
      },
      force_batch: {
        calls: 'Vec<Call>',
      },
      with_weight: {
        call: 'Call',
        weight: 'SpWeightsWeightV2Weight'
      }
    }
  },
  /**
   * Lookup278: spiritnet_runtime::OriginCaller
   **/
  SpiritnetRuntimeOriginCaller: {
    _enum: {
      system: 'FrameSupportDispatchRawOrigin',
      __Unused1: 'Null',
      __Unused2: 'Null',
      __Unused3: 'Null',
      __Unused4: 'Null',
      __Unused5: 'Null',
      Void: 'SpCoreVoid',
      __Unused7: 'Null',
      __Unused8: 'Null',
      __Unused9: 'Null',
      __Unused10: 'Null',
      __Unused11: 'Null',
      __Unused12: 'Null',
      __Unused13: 'Null',
      __Unused14: 'Null',
      __Unused15: 'Null',
      __Unused16: 'Null',
      __Unused17: 'Null',
      __Unused18: 'Null',
      __Unused19: 'Null',
      __Unused20: 'Null',
      __Unused21: 'Null',
      __Unused22: 'Null',
      __Unused23: 'Null',
      __Unused24: 'Null',
      __Unused25: 'Null',
      __Unused26: 'Null',
      __Unused27: 'Null',
      __Unused28: 'Null',
      __Unused29: 'Null',
      __Unused30: 'Null',
      Council: 'PalletCollectiveRawOrigin',
      TechnicalCommittee: 'PalletCollectiveRawOrigin',
      __Unused33: 'Null',
      __Unused34: 'Null',
      __Unused35: 'Null',
      __Unused36: 'Null',
      __Unused37: 'Null',
      __Unused38: 'Null',
      __Unused39: 'Null',
      __Unused40: 'Null',
      __Unused41: 'Null',
      __Unused42: 'Null',
      __Unused43: 'Null',
      __Unused44: 'Null',
      __Unused45: 'Null',
      __Unused46: 'Null',
      __Unused47: 'Null',
      __Unused48: 'Null',
      __Unused49: 'Null',
      __Unused50: 'Null',
      __Unused51: 'Null',
      __Unused52: 'Null',
      __Unused53: 'Null',
      __Unused54: 'Null',
      __Unused55: 'Null',
      __Unused56: 'Null',
      __Unused57: 'Null',
      __Unused58: 'Null',
      __Unused59: 'Null',
      __Unused60: 'Null',
      __Unused61: 'Null',
      __Unused62: 'Null',
      __Unused63: 'Null',
      Did: 'DidOriginDidRawOrigin',
      __Unused65: 'Null',
      __Unused66: 'Null',
      __Unused67: 'Null',
      __Unused68: 'Null',
      __Unused69: 'Null',
      __Unused70: 'Null',
      __Unused71: 'Null',
      __Unused72: 'Null',
      __Unused73: 'Null',
      __Unused74: 'Null',
      __Unused75: 'Null',
      __Unused76: 'Null',
      __Unused77: 'Null',
      __Unused78: 'Null',
      __Unused79: 'Null',
      __Unused80: 'Null',
      __Unused81: 'Null',
      __Unused82: 'Null',
      PolkadotXcm: 'PalletXcmOrigin',
      CumulusXcm: 'CumulusPalletXcmOrigin'
    }
  },
  /**
   * Lookup279: frame_support::dispatch::RawOrigin<sp_core::crypto::AccountId32>
   **/
  FrameSupportDispatchRawOrigin: {
    _enum: {
      Root: 'Null',
      Signed: 'AccountId32',
      None: 'Null'
    }
  },
  /**
   * Lookup280: pallet_collective::RawOrigin<sp_core::crypto::AccountId32, I>
   **/
  PalletCollectiveRawOrigin: {
    _enum: {
      Members: '(u32,u32)',
      Member: 'AccountId32',
      _Phantom: 'Null'
    }
  },
  /**
   * Lookup282: did::origin::DidRawOrigin<sp_core::crypto::AccountId32, sp_core::crypto::AccountId32>
   **/
  DidOriginDidRawOrigin: {
    id: 'AccountId32',
    submitter: 'AccountId32'
  },
  /**
   * Lookup283: pallet_xcm::pallet::Origin
   **/
  PalletXcmOrigin: {
    _enum: {
      Xcm: 'XcmV3MultiLocation',
      Response: 'XcmV3MultiLocation'
    }
  },
  /**
   * Lookup284: cumulus_pallet_xcm::pallet::Origin
   **/
  CumulusPalletXcmOrigin: {
    _enum: {
      Relay: 'Null',
      SiblingParachain: 'u32'
    }
  },
  /**
   * Lookup285: sp_core::Void
   **/
  SpCoreVoid: 'Null',
  /**
   * Lookup286: pallet_vesting::pallet::Call<T>
   **/
  PalletVestingCall: {
    _enum: {
      vest: 'Null',
      vest_other: {
        target: 'MultiAddress',
      },
      vested_transfer: {
        target: 'MultiAddress',
        schedule: 'PalletVestingVestingInfo',
      },
      force_vested_transfer: {
        source: 'MultiAddress',
        target: 'MultiAddress',
        schedule: 'PalletVestingVestingInfo',
      },
      merge_schedules: {
        schedule1Index: 'u32',
        schedule2Index: 'u32'
      }
    }
  },
  /**
   * Lookup287: pallet_vesting::vesting_info::VestingInfo<Balance, BlockNumber>
   **/
  PalletVestingVestingInfo: {
    locked: 'u128',
    perBlock: 'u128',
    startingBlock: 'u64'
  },
  /**
   * Lookup288: pallet_scheduler::pallet::Call<T>
   **/
  PalletSchedulerCall: {
    _enum: {
      schedule: {
        when: 'u64',
        maybePeriodic: 'Option<(u64,u32)>',
        priority: 'u8',
        call: 'Call',
      },
      cancel: {
        when: 'u64',
        index: 'u32',
      },
      schedule_named: {
        id: '[u8;32]',
        when: 'u64',
        maybePeriodic: 'Option<(u64,u32)>',
        priority: 'u8',
        call: 'Call',
      },
      cancel_named: {
        id: '[u8;32]',
      },
      schedule_after: {
        after: 'u64',
        maybePeriodic: 'Option<(u64,u32)>',
        priority: 'u8',
        call: 'Call',
      },
      schedule_named_after: {
        id: '[u8;32]',
        after: 'u64',
        maybePeriodic: 'Option<(u64,u32)>',
        priority: 'u8',
        call: 'Call'
      }
    }
  },
  /**
   * Lookup290: pallet_proxy::pallet::Call<T>
   **/
  PalletProxyCall: {
    _enum: {
      proxy: {
        real: 'MultiAddress',
        forceProxyType: 'Option<SpiritnetRuntimeProxyType>',
        call: 'Call',
      },
      add_proxy: {
        delegate: 'MultiAddress',
        proxyType: 'SpiritnetRuntimeProxyType',
        delay: 'u64',
      },
      remove_proxy: {
        delegate: 'MultiAddress',
        proxyType: 'SpiritnetRuntimeProxyType',
        delay: 'u64',
      },
      remove_proxies: 'Null',
      create_pure: {
        proxyType: 'SpiritnetRuntimeProxyType',
        delay: 'u64',
        index: 'u16',
      },
      kill_pure: {
        spawner: 'MultiAddress',
        proxyType: 'SpiritnetRuntimeProxyType',
        index: 'u16',
        height: 'Compact<u64>',
        extIndex: 'Compact<u32>',
      },
      announce: {
        real: 'MultiAddress',
        callHash: 'H256',
      },
      remove_announcement: {
        real: 'MultiAddress',
        callHash: 'H256',
      },
      reject_announcement: {
        delegate: 'MultiAddress',
        callHash: 'H256',
      },
      proxy_announced: {
        delegate: 'MultiAddress',
        real: 'MultiAddress',
        forceProxyType: 'Option<SpiritnetRuntimeProxyType>',
        call: 'Call'
      }
    }
  },
  /**
   * Lookup292: pallet_preimage::pallet::Call<T>
   **/
  PalletPreimageCall: {
    _enum: {
      note_preimage: {
        bytes: 'Bytes',
      },
      unnote_preimage: {
        _alias: {
          hash_: 'hash',
        },
        hash_: 'H256',
      },
      request_preimage: {
        _alias: {
          hash_: 'hash',
        },
        hash_: 'H256',
      },
      unrequest_preimage: {
        _alias: {
          hash_: 'hash',
        },
        hash_: 'H256'
      }
    }
  },
  /**
   * Lookup294: pallet_tips::pallet::Call<T, I>
   **/
  PalletTipsCall: {
    _enum: {
      report_awesome: {
        reason: 'Bytes',
        who: 'MultiAddress',
      },
      retract_tip: {
        _alias: {
          hash_: 'hash',
        },
        hash_: 'H256',
      },
      tip_new: {
        reason: 'Bytes',
        who: 'MultiAddress',
        tipValue: 'Compact<u128>',
      },
      tip: {
        _alias: {
          hash_: 'hash',
        },
        hash_: 'H256',
        tipValue: 'Compact<u128>',
      },
      close_tip: {
        _alias: {
          hash_: 'hash',
        },
        hash_: 'H256',
      },
      slash_tip: {
        _alias: {
          hash_: 'hash',
        },
        hash_: 'H256'
      }
    }
  },
  /**
   * Lookup295: pallet_multisig::pallet::Call<T>
   **/
  PalletMultisigCall: {
    _enum: {
      as_multi_threshold_1: {
        otherSignatories: 'Vec<AccountId32>',
        call: 'Call',
      },
      as_multi: {
        threshold: 'u16',
        otherSignatories: 'Vec<AccountId32>',
        maybeTimepoint: 'Option<PalletMultisigTimepoint>',
        call: 'Call',
        maxWeight: 'SpWeightsWeightV2Weight',
      },
      approve_as_multi: {
        threshold: 'u16',
        otherSignatories: 'Vec<AccountId32>',
        maybeTimepoint: 'Option<PalletMultisigTimepoint>',
        callHash: '[u8;32]',
        maxWeight: 'SpWeightsWeightV2Weight',
      },
      cancel_as_multi: {
        threshold: 'u16',
        otherSignatories: 'Vec<AccountId32>',
        timepoint: 'PalletMultisigTimepoint',
        callHash: '[u8;32]'
      }
    }
  },
  /**
   * Lookup297: ctype::pallet::Call<T>
   **/
  CtypeCall: {
    _enum: {
      add: {
        ctype: 'Bytes',
      },
      set_block_number: {
        ctypeHash: 'H256',
        blockNumber: 'u64'
      }
    }
  },
  /**
   * Lookup298: attestation::pallet::Call<T>
   **/
  AttestationCall: {
    _enum: {
      add: {
        claimHash: 'H256',
        ctypeHash: 'H256',
        authorization: 'Option<RuntimeCommonAuthorizationPalletAuthorize>',
      },
      revoke: {
        claimHash: 'H256',
        authorization: 'Option<RuntimeCommonAuthorizationPalletAuthorize>',
      },
      remove: {
        claimHash: 'H256',
        authorization: 'Option<RuntimeCommonAuthorizationPalletAuthorize>',
      },
      reclaim_deposit: {
        claimHash: 'H256',
      },
      change_deposit_owner: {
        claimHash: 'H256',
      },
      update_deposit: {
        claimHash: 'H256'
      }
    }
  },
  /**
   * Lookup300: runtime_common::authorization::PalletAuthorize<delegation::access_control::DelegationAc<spiritnet_runtime::Runtime>>
   **/
  RuntimeCommonAuthorizationPalletAuthorize: {
    _enum: {
      Delegation: 'DelegationAccessControlDelegationAc'
    }
  },
  /**
   * Lookup301: delegation::access_control::DelegationAc<spiritnet_runtime::Runtime>
   **/
  DelegationAccessControlDelegationAc: {
    subjectNodeId: 'H256',
    maxChecks: 'u32'
  },
  /**
   * Lookup302: delegation::pallet::Call<T>
   **/
  DelegationCall: {
    _enum: {
      create_hierarchy: {
        rootNodeId: 'H256',
        ctypeHash: 'H256',
      },
      add_delegation: {
        delegationId: 'H256',
        parentId: 'H256',
        delegate: 'AccountId32',
        permissions: 'DelegationDelegationHierarchyPermissions',
        delegateSignature: 'DidDidDetailsDidSignature',
      },
      revoke_delegation: {
        delegationId: 'H256',
        maxParentChecks: 'u32',
        maxRevocations: 'u32',
      },
      remove_delegation: {
        delegationId: 'H256',
        maxRemovals: 'u32',
      },
      reclaim_deposit: {
        delegationId: 'H256',
        maxRemovals: 'u32',
      },
      change_deposit_owner: {
        delegationId: 'H256',
      },
      update_deposit: {
        delegationId: 'H256'
      }
    }
  },
  /**
   * Lookup303: did::did_details::DidSignature
   **/
  DidDidDetailsDidSignature: {
    _enum: {
      Ed25519: 'SpCoreEd25519Signature',
      Sr25519: 'SpCoreSr25519Signature',
      Ecdsa: 'SpCoreEcdsaSignature'
    }
  },
  /**
   * Lookup304: sp_core::ed25519::Signature
   **/
  SpCoreEd25519Signature: '[u8;64]',
  /**
   * Lookup306: sp_core::sr25519::Signature
   **/
  SpCoreSr25519Signature: '[u8;64]',
  /**
   * Lookup307: sp_core::ecdsa::Signature
   **/
  SpCoreEcdsaSignature: '[u8;65]',
  /**
   * Lookup309: did::pallet::Call<T>
   **/
  DidCall: {
    _enum: {
      create: {
        details: 'DidDidDetailsDidCreationDetails',
        signature: 'DidDidDetailsDidSignature',
      },
      set_authentication_key: {
        newKey: 'DidDidDetailsDidVerificationKey',
      },
      set_delegation_key: {
        newKey: 'DidDidDetailsDidVerificationKey',
      },
      remove_delegation_key: 'Null',
      set_attestation_key: {
        newKey: 'DidDidDetailsDidVerificationKey',
      },
      remove_attestation_key: 'Null',
      add_key_agreement_key: {
        newKey: 'DidDidDetailsDidEncryptionKey',
      },
      remove_key_agreement_key: {
        keyId: 'H256',
      },
      add_service_endpoint: {
        serviceEndpoint: 'DidServiceEndpointsDidEndpoint',
      },
      remove_service_endpoint: {
        serviceId: 'Bytes',
      },
      delete: {
        endpointsToRemove: 'u32',
      },
      reclaim_deposit: {
        didSubject: 'AccountId32',
        endpointsToRemove: 'u32',
      },
      submit_did_call: {
        didCall: 'DidDidDetailsDidAuthorizedCallOperation',
        signature: 'DidDidDetailsDidSignature',
      },
      change_deposit_owner: 'Null',
      update_deposit: {
        did: 'AccountId32',
      },
      dispatch_as: {
        didIdentifier: 'AccountId32',
        call: 'Call',
      },
      create_from_account: {
        authenticationKey: 'DidDidDetailsDidVerificationKey'
      }
    }
  },
  /**
   * Lookup310: did::did_details::DidCreationDetails<sp_core::crypto::AccountId32, sp_core::crypto::AccountId32, runtime_common::constants::did::MaxNewKeyAgreementKeys, did::service_endpoints::DidEndpoint<T>>
   **/
  DidDidDetailsDidCreationDetails: {
    did: 'AccountId32',
    submitter: 'AccountId32',
    newKeyAgreementKeys: 'BTreeSet<DidDidDetailsDidEncryptionKey>',
    newAttestationKey: 'Option<DidDidDetailsDidVerificationKey>',
    newDelegationKey: 'Option<DidDidDetailsDidVerificationKey>',
    newServiceDetails: 'Vec<DidServiceEndpointsDidEndpoint>'
  },
  /**
   * Lookup311: runtime_common::constants::did::MaxNewKeyAgreementKeys
   **/
  RuntimeCommonConstantsDidMaxNewKeyAgreementKeys: 'Null',
  /**
   * Lookup312: did::service_endpoints::DidEndpoint<T>
   **/
  DidServiceEndpointsDidEndpoint: {
    id: 'Bytes',
    serviceTypes: 'Vec<Bytes>',
    urls: 'Vec<Bytes>'
  },
  /**
   * Lookup321: did::did_details::DidEncryptionKey
   **/
  DidDidDetailsDidEncryptionKey: {
    _enum: {
      X25519: '[u8;32]'
    }
  },
  /**
   * Lookup325: did::did_details::DidVerificationKey<sp_core::crypto::AccountId32>
   **/
  DidDidDetailsDidVerificationKey: {
    _enum: {
      Ed25519: 'SpCoreEd25519Public',
      Sr25519: 'SpCoreSr25519Public',
      Ecdsa: 'SpCoreEcdsaPublic',
      Account: 'AccountId32'
    }
  },
  /**
   * Lookup326: sp_core::ed25519::Public
   **/
  SpCoreEd25519Public: '[u8;32]',
  /**
   * Lookup327: sp_core::ecdsa::Public
   **/
  SpCoreEcdsaPublic: '[u8;33]',
  /**
   * Lookup330: did::did_details::DidAuthorizedCallOperation<sp_core::crypto::AccountId32, spiritnet_runtime::RuntimeCall, BlockNumber, sp_core::crypto::AccountId32, TxCounter>
   **/
  DidDidDetailsDidAuthorizedCallOperation: {
    did: 'AccountId32',
    txCounter: 'u64',
    call: 'Call',
    blockNumber: 'u64',
    submitter: 'AccountId32'
  },
  /**
   * Lookup331: pallet_did_lookup::pallet::Call<T>
   **/
  PalletDidLookupCall: {
    _enum: {
      associate_account: {
        req: 'PalletDidLookupAssociateAccountRequest',
        expiration: 'u64',
      },
      associate_sender: 'Null',
      remove_sender_association: 'Null',
      remove_account_association: {
        account: 'PalletDidLookupLinkableAccountLinkableAccountId',
      },
      reclaim_deposit: {
        account: 'PalletDidLookupLinkableAccountLinkableAccountId',
      },
      change_deposit_owner: {
        account: 'PalletDidLookupLinkableAccountLinkableAccountId',
      },
      update_deposit: {
        account: 'PalletDidLookupLinkableAccountLinkableAccountId'
      }
    }
  },
  /**
   * Lookup332: pallet_did_lookup::associate_account_request::AssociateAccountRequest
   **/
  PalletDidLookupAssociateAccountRequest: {
    _enum: {
      Polkadot: '(AccountId32,SpRuntimeMultiSignature)',
      Ethereum: '(PalletDidLookupAccountAccountId20,PalletDidLookupAccountEthereumSignature)'
    }
  },
  /**
   * Lookup333: sp_runtime::MultiSignature
   **/
  SpRuntimeMultiSignature: {
    _enum: {
      Ed25519: 'SpCoreEd25519Signature',
      Sr25519: 'SpCoreSr25519Signature',
      Ecdsa: 'SpCoreEcdsaSignature'
    }
  },
  /**
   * Lookup334: pallet_did_lookup::account::EthereumSignature
   **/
  PalletDidLookupAccountEthereumSignature: 'SpCoreEcdsaSignature',
  /**
   * Lookup335: pallet_web3_names::pallet::Call<T>
   **/
  PalletWeb3NamesCall: {
    _enum: {
      claim: {
        name: 'Bytes',
      },
      release_by_owner: 'Null',
      reclaim_deposit: {
        name: 'Bytes',
      },
      ban: {
        name: 'Bytes',
      },
      unban: {
        name: 'Bytes',
      },
      change_deposit_owner: 'Null',
      update_deposit: {
        nameInput: 'Bytes'
      }
    }
  },
  /**
   * Lookup336: public_credentials::pallet::Call<T>
   **/
  PublicCredentialsCall: {
    _enum: {
      add: {
        credential: 'PublicCredentialsCredentialsCredential',
      },
      revoke: {
        credentialId: 'H256',
        authorization: 'Option<RuntimeCommonAuthorizationPalletAuthorize>',
      },
      unrevoke: {
        credentialId: 'H256',
        authorization: 'Option<RuntimeCommonAuthorizationPalletAuthorize>',
      },
      remove: {
        credentialId: 'H256',
        authorization: 'Option<RuntimeCommonAuthorizationPalletAuthorize>',
      },
      reclaim_deposit: {
        credentialId: 'H256',
      },
      change_deposit_owner: {
        credentialId: 'H256',
      },
      update_deposit: {
        credentialId: 'H256'
      }
    }
  },
  /**
   * Lookup337: public_credentials::credentials::Credential<primitive_types::H256, bounded_collections::bounded_vec::BoundedVec<T, S>, bounded_collections::bounded_vec::BoundedVec<T, S>, runtime_common::authorization::PalletAuthorize<delegation::access_control::DelegationAc<spiritnet_runtime::Runtime>>>
   **/
  PublicCredentialsCredentialsCredential: {
    ctypeHash: 'H256',
    subject: 'Bytes',
    claims: 'Bytes',
    authorization: 'Option<RuntimeCommonAuthorizationPalletAuthorize>'
  },
  /**
   * Lookup340: pallet_migration::pallet::Call<T>
   **/
  PalletMigrationCall: {
    _enum: {
      update_balance: {
        requestedMigrations: 'PalletMigrationEntriesToMigrate'
      }
    }
  },
  /**
   * Lookup341: cumulus_pallet_parachain_system::pallet::Call<T>
   **/
  CumulusPalletParachainSystemCall: {
    _enum: {
      set_validation_data: {
        data: 'CumulusPrimitivesParachainInherentParachainInherentData',
      },
      sudo_send_upward_message: {
        message: 'Bytes',
      },
      authorize_upgrade: {
        codeHash: 'H256',
        checkVersion: 'bool',
      },
      enact_authorized_upgrade: {
        code: 'Bytes'
      }
    }
  },
  /**
   * Lookup342: cumulus_primitives_parachain_inherent::ParachainInherentData
   **/
  CumulusPrimitivesParachainInherentParachainInherentData: {
    validationData: 'PolkadotPrimitivesV5PersistedValidationData',
    relayChainState: 'SpTrieStorageProof',
    downwardMessages: 'Vec<PolkadotCorePrimitivesInboundDownwardMessage>',
    horizontalMessages: 'BTreeMap<u32, Vec<PolkadotCorePrimitivesInboundHrmpMessage>>'
  },
  /**
   * Lookup343: polkadot_primitives::v5::PersistedValidationData<primitive_types::H256, N>
   **/
  PolkadotPrimitivesV5PersistedValidationData: {
    parentHead: 'Bytes',
    relayParentNumber: 'u32',
    relayParentStorageRoot: 'H256',
    maxPovSize: 'u32'
  },
  /**
   * Lookup345: sp_trie::storage_proof::StorageProof
   **/
  SpTrieStorageProof: {
    trieNodes: 'BTreeSet<Bytes>'
  },
  /**
   * Lookup348: polkadot_core_primitives::InboundDownwardMessage<BlockNumber>
   **/
  PolkadotCorePrimitivesInboundDownwardMessage: {
    sentAt: 'u32',
    msg: 'Bytes'
  },
  /**
   * Lookup351: polkadot_core_primitives::InboundHrmpMessage<BlockNumber>
   **/
  PolkadotCorePrimitivesInboundHrmpMessage: {
    sentAt: 'u32',
    data: 'Bytes'
  },
  /**
   * Lookup354: parachain_info::pallet::Call<T>
   **/
  ParachainInfoCall: 'Null',
  /**
   * Lookup355: cumulus_pallet_xcmp_queue::pallet::Call<T>
   **/
  CumulusPalletXcmpQueueCall: {
    _enum: {
      service_overweight: {
        index: 'u64',
        weightLimit: 'SpWeightsWeightV2Weight',
      },
      suspend_xcm_execution: 'Null',
      resume_xcm_execution: 'Null',
      update_suspend_threshold: {
        _alias: {
          new_: 'new',
        },
        new_: 'u32',
      },
      update_drop_threshold: {
        _alias: {
          new_: 'new',
        },
        new_: 'u32',
      },
      update_resume_threshold: {
        _alias: {
          new_: 'new',
        },
        new_: 'u32',
      },
      update_threshold_weight: {
        _alias: {
          new_: 'new',
        },
        new_: 'SpWeightsWeightV2Weight',
      },
      update_weight_restrict_decay: {
        _alias: {
          new_: 'new',
        },
        new_: 'SpWeightsWeightV2Weight',
      },
      update_xcmp_max_individual_weight: {
        _alias: {
          new_: 'new',
        },
        new_: 'SpWeightsWeightV2Weight'
      }
    }
  },
  /**
   * Lookup356: pallet_xcm::pallet::Call<T>
   **/
  PalletXcmCall: {
    _enum: {
      send: {
        dest: 'XcmVersionedMultiLocation',
        message: 'XcmVersionedXcm',
      },
      teleport_assets: {
        dest: 'XcmVersionedMultiLocation',
        beneficiary: 'XcmVersionedMultiLocation',
        assets: 'XcmVersionedMultiAssets',
        feeAssetItem: 'u32',
      },
      reserve_transfer_assets: {
        dest: 'XcmVersionedMultiLocation',
        beneficiary: 'XcmVersionedMultiLocation',
        assets: 'XcmVersionedMultiAssets',
        feeAssetItem: 'u32',
      },
      execute: {
        message: 'XcmVersionedXcm',
        maxWeight: 'SpWeightsWeightV2Weight',
      },
      force_xcm_version: {
        location: 'XcmV3MultiLocation',
        version: 'u32',
      },
      force_default_xcm_version: {
        maybeXcmVersion: 'Option<u32>',
      },
      force_subscribe_version_notify: {
        location: 'XcmVersionedMultiLocation',
      },
      force_unsubscribe_version_notify: {
        location: 'XcmVersionedMultiLocation',
      },
      limited_reserve_transfer_assets: {
        dest: 'XcmVersionedMultiLocation',
        beneficiary: 'XcmVersionedMultiLocation',
        assets: 'XcmVersionedMultiAssets',
        feeAssetItem: 'u32',
        weightLimit: 'XcmV3WeightLimit',
      },
      limited_teleport_assets: {
        dest: 'XcmVersionedMultiLocation',
        beneficiary: 'XcmVersionedMultiLocation',
        assets: 'XcmVersionedMultiAssets',
        feeAssetItem: 'u32',
        weightLimit: 'XcmV3WeightLimit',
      },
      force_suspension: {
        suspended: 'bool'
      }
    }
  },
  /**
   * Lookup357: xcm::VersionedXcm<RuntimeCall>
   **/
  XcmVersionedXcm: {
    _enum: {
      __Unused0: 'Null',
      __Unused1: 'Null',
      V2: 'XcmV2Xcm',
      V3: 'XcmV3Xcm'
    }
  },
  /**
   * Lookup358: xcm::v2::Xcm<RuntimeCall>
   **/
  XcmV2Xcm: 'Vec<XcmV2Instruction>',
  /**
   * Lookup360: xcm::v2::Instruction<RuntimeCall>
   **/
  XcmV2Instruction: {
    _enum: {
      WithdrawAsset: 'XcmV2MultiassetMultiAssets',
      ReserveAssetDeposited: 'XcmV2MultiassetMultiAssets',
      ReceiveTeleportedAsset: 'XcmV2MultiassetMultiAssets',
      QueryResponse: {
        queryId: 'Compact<u64>',
        response: 'XcmV2Response',
        maxWeight: 'Compact<u64>',
      },
      TransferAsset: {
        assets: 'XcmV2MultiassetMultiAssets',
        beneficiary: 'XcmV2MultiLocation',
      },
      TransferReserveAsset: {
        assets: 'XcmV2MultiassetMultiAssets',
        dest: 'XcmV2MultiLocation',
        xcm: 'XcmV2Xcm',
      },
      Transact: {
        originType: 'XcmV2OriginKind',
        requireWeightAtMost: 'Compact<u64>',
        call: 'XcmDoubleEncoded',
      },
      HrmpNewChannelOpenRequest: {
        sender: 'Compact<u32>',
        maxMessageSize: 'Compact<u32>',
        maxCapacity: 'Compact<u32>',
      },
      HrmpChannelAccepted: {
        recipient: 'Compact<u32>',
      },
      HrmpChannelClosing: {
        initiator: 'Compact<u32>',
        sender: 'Compact<u32>',
        recipient: 'Compact<u32>',
      },
      ClearOrigin: 'Null',
      DescendOrigin: 'XcmV2MultilocationJunctions',
      ReportError: {
        queryId: 'Compact<u64>',
        dest: 'XcmV2MultiLocation',
        maxResponseWeight: 'Compact<u64>',
      },
      DepositAsset: {
        assets: 'XcmV2MultiassetMultiAssetFilter',
        maxAssets: 'Compact<u32>',
        beneficiary: 'XcmV2MultiLocation',
      },
      DepositReserveAsset: {
        assets: 'XcmV2MultiassetMultiAssetFilter',
        maxAssets: 'Compact<u32>',
        dest: 'XcmV2MultiLocation',
        xcm: 'XcmV2Xcm',
      },
      ExchangeAsset: {
        give: 'XcmV2MultiassetMultiAssetFilter',
        receive: 'XcmV2MultiassetMultiAssets',
      },
      InitiateReserveWithdraw: {
        assets: 'XcmV2MultiassetMultiAssetFilter',
        reserve: 'XcmV2MultiLocation',
        xcm: 'XcmV2Xcm',
      },
      InitiateTeleport: {
        assets: 'XcmV2MultiassetMultiAssetFilter',
        dest: 'XcmV2MultiLocation',
        xcm: 'XcmV2Xcm',
      },
      QueryHolding: {
        queryId: 'Compact<u64>',
        dest: 'XcmV2MultiLocation',
        assets: 'XcmV2MultiassetMultiAssetFilter',
        maxResponseWeight: 'Compact<u64>',
      },
      BuyExecution: {
        fees: 'XcmV2MultiAsset',
        weightLimit: 'XcmV2WeightLimit',
      },
      RefundSurplus: 'Null',
      SetErrorHandler: 'XcmV2Xcm',
      SetAppendix: 'XcmV2Xcm',
      ClearError: 'Null',
      ClaimAsset: {
        assets: 'XcmV2MultiassetMultiAssets',
        ticket: 'XcmV2MultiLocation',
      },
      Trap: 'Compact<u64>',
      SubscribeVersion: {
        queryId: 'Compact<u64>',
        maxResponseWeight: 'Compact<u64>',
      },
      UnsubscribeVersion: 'Null'
    }
  },
  /**
   * Lookup361: xcm::v2::Response
   **/
  XcmV2Response: {
    _enum: {
      Null: 'Null',
      Assets: 'XcmV2MultiassetMultiAssets',
      ExecutionResult: 'Option<(u32,XcmV2TraitsError)>',
      Version: 'u32'
    }
  },
  /**
   * Lookup364: xcm::v2::traits::Error
   **/
  XcmV2TraitsError: {
    _enum: {
      Overflow: 'Null',
      Unimplemented: 'Null',
      UntrustedReserveLocation: 'Null',
      UntrustedTeleportLocation: 'Null',
      MultiLocationFull: 'Null',
      MultiLocationNotInvertible: 'Null',
      BadOrigin: 'Null',
      InvalidLocation: 'Null',
      AssetNotFound: 'Null',
      FailedToTransactAsset: 'Null',
      NotWithdrawable: 'Null',
      LocationCannotHold: 'Null',
      ExceedsMaxMessageSize: 'Null',
      DestinationUnsupported: 'Null',
      Transport: 'Null',
      Unroutable: 'Null',
      UnknownClaim: 'Null',
      FailedToDecode: 'Null',
      MaxWeightInvalid: 'Null',
      NotHoldingFees: 'Null',
      TooExpensive: 'Null',
      Trap: 'u64',
      UnhandledXcmVersion: 'Null',
      WeightLimitReached: 'u64',
      Barrier: 'Null',
      WeightNotComputable: 'Null'
    }
  },
  /**
   * Lookup365: xcm::v2::multiasset::MultiAssetFilter
   **/
  XcmV2MultiassetMultiAssetFilter: {
    _enum: {
      Definite: 'XcmV2MultiassetMultiAssets',
      Wild: 'XcmV2MultiassetWildMultiAsset'
    }
  },
  /**
   * Lookup366: xcm::v2::multiasset::WildMultiAsset
   **/
  XcmV2MultiassetWildMultiAsset: {
    _enum: {
      All: 'Null',
      AllOf: {
        id: 'XcmV2MultiassetAssetId',
        fun: 'XcmV2MultiassetWildFungibility'
      }
    }
  },
  /**
   * Lookup367: xcm::v2::multiasset::WildFungibility
   **/
  XcmV2MultiassetWildFungibility: {
    _enum: ['Fungible', 'NonFungible']
  },
  /**
   * Lookup368: xcm::v2::WeightLimit
   **/
  XcmV2WeightLimit: {
    _enum: {
      Unlimited: 'Null',
      Limited: 'Compact<u64>'
    }
  },
  /**
   * Lookup377: cumulus_pallet_dmp_queue::pallet::Call<T>
   **/
  CumulusPalletDmpQueueCall: {
    _enum: {
      service_overweight: {
        index: 'u64',
        weightLimit: 'SpWeightsWeightV2Weight'
      }
    }
  },
  /**
   * Lookup381: pallet_democracy::types::ReferendumInfo<BlockNumber, frame_support::traits::preimages::Bounded<spiritnet_runtime::RuntimeCall>, Balance>
   **/
  PalletDemocracyReferendumInfo: {
    _enum: {
      Ongoing: 'PalletDemocracyReferendumStatus',
      Finished: {
        approved: 'bool',
        end: 'u64'
      }
    }
  },
  /**
   * Lookup382: pallet_democracy::types::ReferendumStatus<BlockNumber, frame_support::traits::preimages::Bounded<spiritnet_runtime::RuntimeCall>, Balance>
   **/
  PalletDemocracyReferendumStatus: {
    end: 'u64',
    proposal: 'FrameSupportPreimagesBounded',
    threshold: 'PalletDemocracyVoteThreshold',
    delay: 'u64',
    tally: 'PalletDemocracyTally'
  },
  /**
   * Lookup383: pallet_democracy::types::Tally<Balance>
   **/
  PalletDemocracyTally: {
    ayes: 'u128',
    nays: 'u128',
    turnout: 'u128'
  },
  /**
   * Lookup384: pallet_democracy::vote::Voting<Balance, sp_core::crypto::AccountId32, BlockNumber, MaxVotes>
   **/
  PalletDemocracyVoteVoting: {
    _enum: {
      Direct: {
        votes: 'Vec<(u32,PalletDemocracyVoteAccountVote)>',
        delegations: 'PalletDemocracyDelegations',
        prior: 'PalletDemocracyVotePriorLock',
      },
      Delegating: {
        balance: 'u128',
        target: 'AccountId32',
        conviction: 'PalletDemocracyConviction',
        delegations: 'PalletDemocracyDelegations',
        prior: 'PalletDemocracyVotePriorLock'
      }
    }
  },
  /**
   * Lookup388: pallet_democracy::types::Delegations<Balance>
   **/
  PalletDemocracyDelegations: {
    votes: 'u128',
    capital: 'u128'
  },
  /**
   * Lookup389: pallet_democracy::vote::PriorLock<BlockNumber, Balance>
   **/
  PalletDemocracyVotePriorLock: '(u64,u128)',
  /**
   * Lookup392: pallet_democracy::pallet::Error<T>
   **/
  PalletDemocracyError: {
    _enum: ['ValueLow', 'ProposalMissing', 'AlreadyCanceled', 'DuplicateProposal', 'ProposalBlacklisted', 'NotSimpleMajority', 'InvalidHash', 'NoProposal', 'AlreadyVetoed', 'ReferendumInvalid', 'NoneWaiting', 'NotVoter', 'NoPermission', 'AlreadyDelegating', 'InsufficientFunds', 'NotDelegating', 'VotesExist', 'InstantNotAllowed', 'Nonsense', 'WrongUpperBound', 'MaxVotesReached', 'TooMany', 'VotingPeriodLow', 'PreimageNotExist']
  },
  /**
   * Lookup394: pallet_collective::Votes<sp_core::crypto::AccountId32, BlockNumber>
   **/
  PalletCollectiveVotes: {
    index: 'u32',
    threshold: 'u32',
    ayes: 'Vec<AccountId32>',
    nays: 'Vec<AccountId32>',
    end: 'u64'
  },
  /**
   * Lookup395: pallet_collective::pallet::Error<T, I>
   **/
  PalletCollectiveError: {
    _enum: ['NotMember', 'DuplicateProposal', 'ProposalMissing', 'WrongIndex', 'DuplicateVote', 'AlreadyInitialized', 'TooEarly', 'TooManyProposals', 'WrongProposalWeight', 'WrongProposalLength']
  },
  /**
   * Lookup399: pallet_membership::pallet::Error<T, I>
   **/
  PalletMembershipError: {
    _enum: ['AlreadyMember', 'NotMember', 'TooManyMembers']
  },
  /**
   * Lookup400: pallet_treasury::Proposal<sp_core::crypto::AccountId32, Balance>
   **/
  PalletTreasuryProposal: {
    proposer: 'AccountId32',
    value: 'u128',
    beneficiary: 'AccountId32',
    bond: 'u128'
  },
  /**
   * Lookup404: frame_support::PalletId
   **/
  FrameSupportPalletId: '[u8;8]',
  /**
   * Lookup405: pallet_treasury::pallet::Error<T, I>
   **/
  PalletTreasuryError: {
    _enum: ['InsufficientProposersBalance', 'InvalidIndex', 'TooManyApprovals', 'InsufficientPermission', 'ProposalNotApproved']
  },
  /**
   * Lookup406: pallet_utility::pallet::Error<T>
   **/
  PalletUtilityError: {
    _enum: ['TooManyCalls']
  },
  /**
   * Lookup409: pallet_vesting::Releases
   **/
  PalletVestingReleases: {
    _enum: ['V0', 'V1']
  },
  /**
   * Lookup410: pallet_vesting::pallet::Error<T>
   **/
  PalletVestingError: {
    _enum: ['NotVesting', 'AtMaxVestingSchedules', 'AmountLow', 'ScheduleIndexOutOfBounds', 'InvalidScheduleParams']
  },
  /**
   * Lookup413: pallet_scheduler::Scheduled<Name, frame_support::traits::preimages::Bounded<spiritnet_runtime::RuntimeCall>, BlockNumber, spiritnet_runtime::OriginCaller, sp_core::crypto::AccountId32>
   **/
  PalletSchedulerScheduled: {
    maybeId: 'Option<[u8;32]>',
    priority: 'u8',
    call: 'FrameSupportPreimagesBounded',
    maybePeriodic: 'Option<(u64,u32)>',
    origin: 'SpiritnetRuntimeOriginCaller'
  },
  /**
   * Lookup415: pallet_scheduler::pallet::Error<T>
   **/
  PalletSchedulerError: {
    _enum: ['FailedToSchedule', 'NotFound', 'TargetBlockNumberInPast', 'RescheduleNoChange', 'Named']
  },
  /**
   * Lookup418: pallet_proxy::ProxyDefinition<sp_core::crypto::AccountId32, spiritnet_runtime::ProxyType, BlockNumber>
   **/
  PalletProxyProxyDefinition: {
    delegate: 'AccountId32',
    proxyType: 'SpiritnetRuntimeProxyType',
    delay: 'u64'
  },
  /**
   * Lookup422: pallet_proxy::Announcement<sp_core::crypto::AccountId32, primitive_types::H256, BlockNumber>
   **/
  PalletProxyAnnouncement: {
    real: 'AccountId32',
    callHash: 'H256',
    height: 'u64'
  },
  /**
   * Lookup424: pallet_proxy::pallet::Error<T>
   **/
  PalletProxyError: {
    _enum: ['TooMany', 'NotFound', 'NotProxy', 'Unproxyable', 'Duplicate', 'NoPermission', 'Unannounced', 'NoSelfProxy']
  },
  /**
   * Lookup425: pallet_preimage::RequestStatus<sp_core::crypto::AccountId32, Balance>
   **/
  PalletPreimageRequestStatus: {
    _enum: {
      Unrequested: {
        deposit: '(AccountId32,u128)',
        len: 'u32',
      },
      Requested: {
        deposit: 'Option<(AccountId32,u128)>',
        count: 'u32',
        len: 'Option<u32>'
      }
    }
  },
  /**
   * Lookup430: pallet_preimage::pallet::Error<T>
   **/
  PalletPreimageError: {
    _enum: ['TooBig', 'AlreadyNoted', 'NotAuthorized', 'NotNoted', 'Requested', 'NotRequested']
  },
  /**
   * Lookup433: pallet_tips::OpenTip<sp_core::crypto::AccountId32, Balance, BlockNumber, primitive_types::H256>
   **/
  PalletTipsOpenTip: {
    reason: 'H256',
    who: 'AccountId32',
    finder: 'AccountId32',
    deposit: 'u128',
    closes: 'Option<u64>',
    tips: 'Vec<(AccountId32,u128)>',
    findersFee: 'bool'
  },
  /**
   * Lookup437: pallet_tips::pallet::Error<T, I>
   **/
  PalletTipsError: {
    _enum: ['ReasonTooBig', 'AlreadyKnown', 'UnknownTip', 'NotFinder', 'StillOpen', 'Premature']
  },
  /**
   * Lookup439: pallet_multisig::Multisig<BlockNumber, Balance, sp_core::crypto::AccountId32, MaxApprovals>
   **/
  PalletMultisigMultisig: {
    when: 'PalletMultisigTimepoint',
    deposit: 'u128',
    depositor: 'AccountId32',
    approvals: 'Vec<AccountId32>'
  },
  /**
   * Lookup441: pallet_multisig::pallet::Error<T>
   **/
  PalletMultisigError: {
    _enum: ['MinimumThreshold', 'AlreadyApproved', 'NoApprovalsNeeded', 'TooFewSignatories', 'TooManySignatories', 'SignatoriesOutOfOrder', 'SenderInSignatories', 'NotFound', 'NotOwner', 'NoTimepoint', 'WrongTimepoint', 'UnexpectedTimepoint', 'MaxWeightTooLow', 'AlreadyStored']
  },
  /**
   * Lookup442: ctype::ctype_entry::CtypeEntry<sp_core::crypto::AccountId32, BlockNumber>
   **/
  CtypeCtypeEntry: {
    creator: 'AccountId32',
    createdAt: 'u64'
  },
  /**
   * Lookup443: ctype::pallet::Error<T>
   **/
  CtypeError: {
    _enum: ['NotFound', 'AlreadyExists', 'UnableToPayFees']
  },
  /**
   * Lookup444: attestation::attestations::AttestationDetails<primitive_types::H256, sp_core::crypto::AccountId32, runtime_common::authorization::AuthorizationId<primitive_types::H256>, sp_core::crypto::AccountId32, Balance>
   **/
  AttestationAttestationsAttestationDetails: {
    ctypeHash: 'H256',
    attester: 'AccountId32',
    authorizationId: 'Option<RuntimeCommonAuthorizationAuthorizationId>',
    revoked: 'bool',
    deposit: 'KiltSupportDeposit'
  },
  /**
   * Lookup445: kilt_support::deposit::Deposit<sp_core::crypto::AccountId32, Balance>
   **/
  KiltSupportDeposit: {
    owner: 'AccountId32',
    amount: 'u128'
  },
  /**
   * Lookup447: attestation::pallet::Error<T>
   **/
  AttestationError: {
    _enum: ['AlreadyAttested', 'AlreadyRevoked', 'NotFound', 'CTypeMismatch', 'NotAuthorized', 'MaxDelegatedAttestationsExceeded']
  },
  /**
   * Lookup448: delegation::delegation_hierarchy::DelegationNode<primitive_types::H256, runtime_common::constants::delegation::MaxChildren, delegation::delegation_hierarchy::DelegationDetails<sp_core::crypto::AccountId32>, sp_core::crypto::AccountId32, Balance>
   **/
  DelegationDelegationHierarchyDelegationNode: {
    hierarchyRootId: 'H256',
    parent: 'Option<H256>',
    children: 'BTreeSet<H256>',
    details: 'DelegationDelegationHierarchyDelegationDetails',
    deposit: 'KiltSupportDeposit'
  },
  /**
   * Lookup449: runtime_common::constants::delegation::MaxChildren
   **/
  RuntimeCommonConstantsDelegationMaxChildren: 'Null',
  /**
   * Lookup450: delegation::delegation_hierarchy::DelegationDetails<sp_core::crypto::AccountId32>
   **/
  DelegationDelegationHierarchyDelegationDetails: {
    owner: 'AccountId32',
    revoked: 'bool',
    permissions: 'DelegationDelegationHierarchyPermissions'
  },
  /**
   * Lookup453: delegation::delegation_hierarchy::DelegationHierarchyDetails<primitive_types::H256>
   **/
  DelegationDelegationHierarchyDelegationHierarchyDetails: {
    ctypeHash: 'H256'
  },
  /**
   * Lookup454: delegation::pallet::Error<T>
   **/
  DelegationError: {
    _enum: ['DelegationAlreadyExists', 'InvalidDelegateSignature', 'DelegationNotFound', 'DelegateNotFound', 'HierarchyAlreadyExists', 'HierarchyNotFound', 'MaxSearchDepthReached', 'NotOwnerOfParentDelegation', 'NotOwnerOfDelegationHierarchy', 'ParentDelegationNotFound', 'ParentDelegationRevoked', 'UnauthorizedRevocation', 'UnauthorizedRemoval', 'UnauthorizedDelegation', 'AccessDenied', 'ExceededRevocationBounds', 'ExceededRemovalBounds', 'MaxRevocationsTooLarge', 'MaxRemovalsTooLarge', 'MaxParentChecksTooLarge', 'Internal', 'MaxChildrenExceeded']
  },
  /**
   * Lookup455: did::did_details::DidDetails<T>
   **/
  DidDidDetails: {
    authenticationKey: 'H256',
    keyAgreementKeys: 'BTreeSet<H256>',
    delegationKey: 'Option<H256>',
    attestationKey: 'Option<H256>',
    publicKeys: 'BTreeMap<H256, DidDidDetailsDidPublicKeyDetails>',
    lastTxCounter: 'u64',
    deposit: 'KiltSupportDeposit'
  },
  /**
   * Lookup458: did::did_details::DidPublicKeyDetails<BlockNumber, sp_core::crypto::AccountId32>
   **/
  DidDidDetailsDidPublicKeyDetails: {
    key: 'DidDidDetailsDidPublicKey',
    blockNumber: 'u64'
  },
  /**
   * Lookup459: did::did_details::DidPublicKey<sp_core::crypto::AccountId32>
   **/
  DidDidDetailsDidPublicKey: {
    _enum: {
      PublicVerificationKey: 'DidDidDetailsDidVerificationKey',
      PublicEncryptionKey: 'DidDidDetailsDidEncryptionKey'
    }
  },
  /**
   * Lookup464: did::pallet::Error<T>
   **/
  DidError: {
    _enum: ['InvalidSignatureFormat', 'InvalidSignature', 'AlreadyExists', 'NotFound', 'VerificationKeyNotFound', 'InvalidNonce', 'UnsupportedDidAuthorizationCall', 'InvalidDidAuthorizationCall', 'MaxNewKeyAgreementKeysLimitExceeded', 'MaxPublicKeysExceeded', 'MaxKeyAgreementKeysExceeded', 'BadDidOrigin', 'TransactionExpired', 'AlreadyDeleted', 'NotOwnerOfDeposit', 'UnableToPayFees', 'MaxNumberOfServicesExceeded', 'MaxServiceIdLengthExceeded', 'MaxServiceTypeLengthExceeded', 'MaxNumberOfTypesPerServiceExceeded', 'MaxServiceUrlLengthExceeded', 'MaxNumberOfUrlsPerServiceExceeded', 'ServiceAlreadyExists', 'ServiceNotFound', 'InvalidServiceEncoding', 'MaxStoredEndpointsCountExceeded', 'Internal']
  },
  /**
   * Lookup465: pallet_did_lookup::connection_record::ConnectionRecord<sp_core::crypto::AccountId32, sp_core::crypto::AccountId32, Balance>
   **/
  PalletDidLookupConnectionRecord: {
    did: 'AccountId32',
    deposit: 'KiltSupportDeposit'
  },
  /**
   * Lookup467: pallet_did_lookup::pallet::Error<T>
   **/
  PalletDidLookupError: {
    _enum: ['NotFound', 'NotAuthorized', 'OutdatedProof', 'InsufficientFunds', 'Migration']
  },
  /**
   * Lookup468: pallet_web3_names::web3_name::Web3NameOwnership<sp_core::crypto::AccountId32, kilt_support::deposit::Deposit<sp_core::crypto::AccountId32, Balance>, BlockNumber>
   **/
  PalletWeb3NamesWeb3NameWeb3NameOwnership: {
    owner: 'AccountId32',
    claimedAt: 'u64',
    deposit: 'KiltSupportDeposit'
  },
  /**
   * Lookup469: pallet_web3_names::pallet::Error<T>
   **/
  PalletWeb3NamesError: {
    _enum: ['InsufficientFunds', 'AlreadyExists', 'NotFound', 'OwnerAlreadyExists', 'OwnerNotFound', 'Banned', 'NotBanned', 'AlreadyBanned', 'NotAuthorized', 'TooShort', 'TooLong', 'InvalidCharacter']
  },
  /**
   * Lookup470: public_credentials::credentials::CredentialEntry<primitive_types::H256, sp_core::crypto::AccountId32, BlockNumber, sp_core::crypto::AccountId32, Balance, runtime_common::authorization::AuthorizationId<primitive_types::H256>>
   **/
  PublicCredentialsCredentialsCredentialEntry: {
    ctypeHash: 'H256',
    attester: 'AccountId32',
    revoked: 'bool',
    blockNumber: 'u64',
    deposit: 'KiltSupportDeposit',
    authorizationId: 'Option<RuntimeCommonAuthorizationAuthorizationId>'
  },
  /**
   * Lookup471: public_credentials::pallet::Error<T>
   **/
  PublicCredentialsError: {
    _enum: ['AlreadyAttested', 'NotFound', 'UnableToPayFees', 'InvalidInput', 'NotAuthorized', 'Internal']
  },
  /**
   * Lookup472: pallet_migration::pallet::Error<T>
   **/
  PalletMigrationError: {
    _enum: ['KeyParse']
  },
  /**
   * Lookup474: polkadot_primitives::v5::UpgradeRestriction
   **/
  PolkadotPrimitivesV5UpgradeRestriction: {
    _enum: ['Present']
  },
  /**
   * Lookup475: cumulus_pallet_parachain_system::relay_state_snapshot::MessagingStateSnapshot
   **/
  CumulusPalletParachainSystemRelayStateSnapshotMessagingStateSnapshot: {
    dmqMqcHead: 'H256',
    relayDispatchQueueSize: 'CumulusPalletParachainSystemRelayStateSnapshotRelayDispachQueueSize',
    ingressChannels: 'Vec<(u32,PolkadotPrimitivesV5AbridgedHrmpChannel)>',
    egressChannels: 'Vec<(u32,PolkadotPrimitivesV5AbridgedHrmpChannel)>'
  },
  /**
   * Lookup476: cumulus_pallet_parachain_system::relay_state_snapshot::RelayDispachQueueSize
   **/
  CumulusPalletParachainSystemRelayStateSnapshotRelayDispachQueueSize: {
    remainingCount: 'u32',
    remainingSize: 'u32'
  },
  /**
   * Lookup479: polkadot_primitives::v5::AbridgedHrmpChannel
   **/
  PolkadotPrimitivesV5AbridgedHrmpChannel: {
    maxCapacity: 'u32',
    maxTotalSize: 'u32',
    maxMessageSize: 'u32',
    msgCount: 'u32',
    totalSize: 'u32',
    mqcHead: 'Option<H256>'
  },
  /**
   * Lookup480: polkadot_primitives::v5::AbridgedHostConfiguration
   **/
  PolkadotPrimitivesV5AbridgedHostConfiguration: {
    maxCodeSize: 'u32',
    maxHeadDataSize: 'u32',
    maxUpwardQueueCount: 'u32',
    maxUpwardQueueSize: 'u32',
    maxUpwardMessageSize: 'u32',
    maxUpwardMessageNumPerCandidate: 'u32',
    hrmpMaxMessageNumPerCandidate: 'u32',
    validationUpgradeCooldown: 'u32',
    validationUpgradeDelay: 'u32'
  },
  /**
   * Lookup486: polkadot_core_primitives::OutboundHrmpMessage<polkadot_parachain::primitives::Id>
   **/
  PolkadotCorePrimitivesOutboundHrmpMessage: {
    recipient: 'u32',
    data: 'Bytes'
  },
  /**
   * Lookup487: cumulus_pallet_parachain_system::CodeUpgradeAuthorization<T>
   **/
  CumulusPalletParachainSystemCodeUpgradeAuthorization: {
    codeHash: 'H256',
    checkVersion: 'bool'
  },
  /**
   * Lookup488: cumulus_pallet_parachain_system::pallet::Error<T>
   **/
  CumulusPalletParachainSystemError: {
    _enum: ['OverlappingUpgrades', 'ProhibitedByPolkadot', 'TooBig', 'ValidationDataNotAvailable', 'HostConfigurationNotAvailable', 'NotScheduled', 'NothingAuthorized', 'Unauthorized']
  },
  /**
   * Lookup490: cumulus_pallet_xcmp_queue::InboundChannelDetails
   **/
  CumulusPalletXcmpQueueInboundChannelDetails: {
    sender: 'u32',
    state: 'CumulusPalletXcmpQueueInboundState',
    messageMetadata: 'Vec<(u32,PolkadotParachainPrimitivesXcmpMessageFormat)>'
  },
  /**
   * Lookup491: cumulus_pallet_xcmp_queue::InboundState
   **/
  CumulusPalletXcmpQueueInboundState: {
    _enum: ['Ok', 'Suspended']
  },
  /**
   * Lookup494: polkadot_parachain::primitives::XcmpMessageFormat
   **/
  PolkadotParachainPrimitivesXcmpMessageFormat: {
    _enum: ['ConcatenatedVersionedXcm', 'ConcatenatedEncodedBlob', 'Signals']
  },
  /**
   * Lookup497: cumulus_pallet_xcmp_queue::OutboundChannelDetails
   **/
  CumulusPalletXcmpQueueOutboundChannelDetails: {
    recipient: 'u32',
    state: 'CumulusPalletXcmpQueueOutboundState',
    signalsExist: 'bool',
    firstIndex: 'u16',
    lastIndex: 'u16'
  },
  /**
   * Lookup498: cumulus_pallet_xcmp_queue::OutboundState
   **/
  CumulusPalletXcmpQueueOutboundState: {
    _enum: ['Ok', 'Suspended']
  },
  /**
   * Lookup500: cumulus_pallet_xcmp_queue::QueueConfigData
   **/
  CumulusPalletXcmpQueueQueueConfigData: {
    suspendThreshold: 'u32',
    dropThreshold: 'u32',
    resumeThreshold: 'u32',
    thresholdWeight: 'SpWeightsWeightV2Weight',
    weightRestrictDecay: 'SpWeightsWeightV2Weight',
    xcmpMaxIndividualWeight: 'SpWeightsWeightV2Weight'
  },
  /**
   * Lookup502: cumulus_pallet_xcmp_queue::pallet::Error<T>
   **/
  CumulusPalletXcmpQueueError: {
    _enum: ['FailedToSend', 'BadXcmOrigin', 'BadXcm', 'BadOverweightIndex', 'WeightOverLimit']
  },
  /**
   * Lookup503: pallet_xcm::pallet::QueryStatus<BlockNumber>
   **/
  PalletXcmQueryStatus: {
    _enum: {
      Pending: {
        responder: 'XcmVersionedMultiLocation',
        maybeMatchQuerier: 'Option<XcmVersionedMultiLocation>',
        maybeNotify: 'Option<(u8,u8)>',
        timeout: 'u64',
      },
      VersionNotifier: {
        origin: 'XcmVersionedMultiLocation',
        isActive: 'bool',
      },
      Ready: {
        response: 'XcmVersionedResponse',
        at: 'u64'
      }
    }
  },
  /**
   * Lookup507: xcm::VersionedResponse
   **/
  XcmVersionedResponse: {
    _enum: {
      __Unused0: 'Null',
      __Unused1: 'Null',
      V2: 'XcmV2Response',
      V3: 'XcmV3Response'
    }
  },
  /**
   * Lookup513: pallet_xcm::pallet::VersionMigrationStage
   **/
  PalletXcmVersionMigrationStage: {
    _enum: {
      MigrateSupportedVersion: 'Null',
      MigrateVersionNotifiers: 'Null',
      NotifyCurrentTargets: 'Option<Bytes>',
      MigrateAndNotifyOldTargets: 'Null'
    }
  },
  /**
   * Lookup516: xcm::VersionedAssetId
   **/
  XcmVersionedAssetId: {
    _enum: {
      __Unused0: 'Null',
      __Unused1: 'Null',
      __Unused2: 'Null',
      V3: 'XcmV3MultiassetAssetId'
    }
  },
  /**
   * Lookup517: pallet_xcm::pallet::RemoteLockedFungibleRecord<ConsumerIdentifier, MaxConsumers>
   **/
  PalletXcmRemoteLockedFungibleRecord: {
    amount: 'u128',
    owner: 'XcmVersionedMultiLocation',
    locker: 'XcmVersionedMultiLocation',
    consumers: 'Vec<([u8;8],u128)>'
  },
  /**
   * Lookup524: pallet_xcm::pallet::Error<T>
   **/
  PalletXcmError: {
    _enum: ['Unreachable', 'SendFailure', 'Filtered', 'UnweighableMessage', 'DestinationNotInvertible', 'Empty', 'CannotReanchor', 'TooManyAssets', 'InvalidOrigin', 'BadVersion', 'BadLocation', 'NoSubscription', 'AlreadySubscribed', 'InvalidAsset', 'LowBalance', 'TooManyLocks', 'AccountNotSovereign', 'FeesNotMet', 'LockNotFound', 'InUse']
  },
  /**
   * Lookup525: cumulus_pallet_xcm::pallet::Error<T>
   **/
  CumulusPalletXcmError: 'Null',
  /**
   * Lookup526: cumulus_pallet_dmp_queue::ConfigData
   **/
  CumulusPalletDmpQueueConfigData: {
    maxIndividual: 'SpWeightsWeightV2Weight'
  },
  /**
   * Lookup527: cumulus_pallet_dmp_queue::PageIndexData
   **/
  CumulusPalletDmpQueuePageIndexData: {
    beginUsed: 'u32',
    endUsed: 'u32',
    overweightCount: 'u64'
  },
  /**
   * Lookup530: cumulus_pallet_dmp_queue::pallet::Error<T>
   **/
  CumulusPalletDmpQueueError: {
    _enum: ['Unknown', 'OverLimit']
  },
  /**
   * Lookup533: frame_system::extensions::check_non_zero_sender::CheckNonZeroSender<T>
   **/
  FrameSystemExtensionsCheckNonZeroSender: 'Null',
  /**
   * Lookup534: frame_system::extensions::check_spec_version::CheckSpecVersion<T>
   **/
  FrameSystemExtensionsCheckSpecVersion: 'Null',
  /**
   * Lookup535: frame_system::extensions::check_tx_version::CheckTxVersion<T>
   **/
  FrameSystemExtensionsCheckTxVersion: 'Null',
  /**
   * Lookup536: frame_system::extensions::check_genesis::CheckGenesis<T>
   **/
  FrameSystemExtensionsCheckGenesis: 'Null',
  /**
   * Lookup539: frame_system::extensions::check_nonce::CheckNonce<T>
   **/
  FrameSystemExtensionsCheckNonce: 'Compact<u64>',
  /**
   * Lookup540: frame_system::extensions::check_weight::CheckWeight<T>
   **/
  FrameSystemExtensionsCheckWeight: 'Null',
  /**
   * Lookup541: pallet_transaction_payment::ChargeTransactionPayment<T>
   **/
  PalletTransactionPaymentChargeTransactionPayment: 'Compact<u128>'
};
