// Auto-generated via `yarn polkadot-types-from-defs`, do not edit
/* eslint-disable */

/* eslint-disable sort-keys */

export default {
  /**
   * Lookup3: frame_system::AccountInfo<Index, pallet_balances::AccountData<Balance>>
   **/
  FrameSystemAccountInfo: {
    nonce: 'u64',
    consumers: 'u32',
    providers: 'u32',
    sufficients: 'u32',
    data: 'PalletBalancesAccountData'
  },
  /**
   * Lookup5: pallet_balances::AccountData<Balance>
   **/
  PalletBalancesAccountData: {
    free: 'u128',
    reserved: 'u128',
    miscFrozen: 'u128',
    feeFrozen: 'u128'
  },
  /**
   * Lookup8: frame_support::weights::PerDispatchClass<frame_support::weights::weight_v2::Weight>
   **/
  FrameSupportWeightsPerDispatchClassWeight: {
    normal: 'Weight',
    operational: 'Weight',
    mandatory: 'Weight'
  },
  /**
   * Lookup12: sp_runtime::generic::digest::Digest
   **/
  SpRuntimeDigest: {
    logs: 'Vec<SpRuntimeDigestDigestItem>'
  },
  /**
   * Lookup14: sp_runtime::generic::digest::DigestItem
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
   * Lookup17: frame_system::EventRecord<mashnet_node_runtime::Event, primitive_types::H256>
   **/
  FrameSystemEventRecord: {
    phase: 'FrameSystemPhase',
    event: 'Event',
    topics: 'Vec<H256>'
  },
  /**
   * Lookup19: frame_system::pallet::Event<T>
   **/
  FrameSystemEvent: {
    _enum: {
      ExtrinsicSuccess: {
        dispatchInfo: 'FrameSupportWeightsDispatchInfo',
      },
      ExtrinsicFailed: {
        dispatchError: 'SpRuntimeDispatchError',
        dispatchInfo: 'FrameSupportWeightsDispatchInfo',
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
   * Lookup20: frame_support::weights::DispatchInfo
   **/
  FrameSupportWeightsDispatchInfo: {
    weight: 'Weight',
    class: 'FrameSupportWeightsDispatchClass',
    paysFee: 'FrameSupportWeightsPays'
  },
  /**
   * Lookup21: frame_support::weights::DispatchClass
   **/
  FrameSupportWeightsDispatchClass: {
    _enum: ['Normal', 'Operational', 'Mandatory']
  },
  /**
   * Lookup22: frame_support::weights::Pays
   **/
  FrameSupportWeightsPays: {
    _enum: ['Yes', 'No']
  },
  /**
   * Lookup23: sp_runtime::DispatchError
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
      Arithmetic: 'SpRuntimeArithmeticError',
      Transactional: 'SpRuntimeTransactionalError'
    }
  },
  /**
   * Lookup24: sp_runtime::ModuleError
   **/
  SpRuntimeModuleError: {
    index: 'u8',
    error: '[u8;4]'
  },
  /**
   * Lookup25: sp_runtime::TokenError
   **/
  SpRuntimeTokenError: {
    _enum: ['NoFunds', 'WouldDie', 'BelowMinimum', 'CannotCreate', 'UnknownAsset', 'Frozen', 'Unsupported']
  },
  /**
   * Lookup26: sp_runtime::ArithmeticError
   **/
  SpRuntimeArithmeticError: {
    _enum: ['Underflow', 'Overflow', 'DivisionByZero']
  },
  /**
   * Lookup27: sp_runtime::TransactionalError
   **/
  SpRuntimeTransactionalError: {
    _enum: ['LimitReached', 'NoLayer']
  },
  /**
   * Lookup28: pallet_grandpa::pallet::Event
   **/
  PalletGrandpaEvent: {
    _enum: {
      NewAuthorities: {
        authoritySet: 'Vec<(SpFinalityGrandpaAppPublic,u64)>',
      },
      Paused: 'Null',
      Resumed: 'Null'
    }
  },
  /**
   * Lookup31: sp_finality_grandpa::app::Public
   **/
  SpFinalityGrandpaAppPublic: 'SpCoreEd25519Public',
  /**
   * Lookup32: sp_core::ed25519::Public
   **/
  SpCoreEd25519Public: '[u8;32]',
  /**
   * Lookup33: pallet_indices::pallet::Event<T>
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
   * Lookup34: pallet_balances::pallet::Event<T, I>
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
        reserved: 'u128',
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
        amount: 'u128'
      }
    }
  },
  /**
   * Lookup35: frame_support::traits::tokens::misc::BalanceStatus
   **/
  FrameSupportTokensMiscBalanceStatus: {
    _enum: ['Free', 'Reserved']
  },
  /**
   * Lookup36: pallet_transaction_payment::pallet::Event<T>
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
   * Lookup37: pallet_sudo::pallet::Event<T>
   **/
  PalletSudoEvent: {
    _enum: {
      Sudid: {
        sudoResult: 'Result<Null, SpRuntimeDispatchError>',
      },
      KeyChanged: {
        oldSudoer: 'Option<AccountId32>',
      },
      SudoAsDone: {
        sudoResult: 'Result<Null, SpRuntimeDispatchError>'
      }
    }
  },
  /**
   * Lookup41: ctype::pallet::Event<T>
   **/
  CtypeEvent: {
    _enum: {
      CTypeCreated: '(AccountId32,H256)'
    }
  },
  /**
   * Lookup42: attestation::pallet::Event<T>
   **/
  AttestationEvent: {
    _enum: {
      AttestationCreated: '(AccountId32,H256,H256,Option<RuntimeCommonAuthorizationAuthorizationId>)',
      AttestationRevoked: '(AccountId32,H256)',
      AttestationRemoved: '(AccountId32,H256)',
      DepositReclaimed: '(AccountId32,H256)'
    }
  },
  /**
   * Lookup44: runtime_common::authorization::AuthorizationId<primitive_types::H256>
   **/
  RuntimeCommonAuthorizationAuthorizationId: {
    _enum: {
      Delegation: 'H256'
    }
  },
  /**
   * Lookup45: delegation::pallet::Event<T>
   **/
  DelegationEvent: {
    _enum: {
      HierarchyCreated: '(AccountId32,H256,H256)',
      HierarchyRevoked: '(AccountId32,H256)',
      HierarchyRemoved: '(AccountId32,H256)',
      DelegationCreated: '(AccountId32,H256,H256,H256,AccountId32,DelegationDelegationHierarchyPermissions)',
      DelegationRevoked: '(AccountId32,H256)',
      DelegationRemoved: '(AccountId32,H256)',
      DepositReclaimed: '(AccountId32,H256)'
    }
  },
  /**
   * Lookup46: delegation::delegation_hierarchy::Permissions
   **/
  DelegationDelegationHierarchyPermissions: {
    bits: 'u32'
  },
  /**
   * Lookup47: did::pallet::Event<T>
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
   * Lookup48: pallet_did_lookup::pallet::Event<T>
   **/
  PalletDidLookupEvent: {
    _enum: {
      AssociationEstablished: '(PalletDidLookupLinkableAccountLinkableAccountId,AccountId32)',
      AssociationRemoved: '(PalletDidLookupLinkableAccountLinkableAccountId,AccountId32)'
    }
  },
  /**
   * Lookup49: pallet_did_lookup::linkable_account::LinkableAccountId
   **/
  PalletDidLookupLinkableAccountLinkableAccountId: {
    _enum: {
      AccountId20: 'PalletDidLookupAccountAccountId20',
      AccountId32: 'AccountId32'
    }
  },
  /**
   * Lookup50: pallet_did_lookup::account::AccountId20
   **/
  PalletDidLookupAccountAccountId20: '[u8;20]',
  /**
   * Lookup52: pallet_session::pallet::Event
   **/
  PalletSessionEvent: {
    _enum: {
      NewSession: {
        sessionIndex: 'u32'
      }
    }
  },
  /**
   * Lookup53: pallet_utility::pallet::Event
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
   * Lookup54: pallet_proxy::pallet::Event<T>
   **/
  PalletProxyEvent: {
    _enum: {
      ProxyExecuted: {
        result: 'Result<Null, SpRuntimeDispatchError>',
      },
      AnonymousCreated: {
        anonymous: 'AccountId32',
        who: 'AccountId32',
        proxyType: 'MashnetNodeRuntimeProxyType',
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
        proxyType: 'MashnetNodeRuntimeProxyType',
        delay: 'u64',
      },
      ProxyRemoved: {
        delegator: 'AccountId32',
        delegatee: 'AccountId32',
        proxyType: 'MashnetNodeRuntimeProxyType',
        delay: 'u64'
      }
    }
  },
  /**
   * Lookup55: mashnet_node_runtime::ProxyType
   **/
  MashnetNodeRuntimeProxyType: {
    _enum: ['Any', 'NonTransfer', 'CancelProxy', 'NonDepositClaiming']
  },
  /**
   * Lookup57: pallet_web3_names::pallet::Event<T>
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
   * Lookup60: public_credentials::pallet::Event<T>
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
   * Lookup61: runtime_common::assets::AssetDid
   **/
  RuntimeCommonAssetsAssetDid: 'KiltAssetDidsV1AssetDid',
  /**
   * Lookup62: kilt_asset_dids::v1::AssetDid
   **/
  KiltAssetDidsV1AssetDid: {
    chainId: 'KiltAssetDidsChainV1ChainId',
    assetId: 'KiltAssetDidsAssetV1AssetId'
  },
  /**
   * Lookup63: kilt_asset_dids::chain::v1::ChainId
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
   * Lookup65: kilt_asset_dids::chain::v1::GenesisHexHash32Reference
   **/
  KiltAssetDidsChainV1GenesisHexHash32Reference: '[u8;16]',
  /**
   * Lookup69: kilt_asset_dids::chain::v1::GenericChainId
   **/
  KiltAssetDidsChainV1GenericChainId: {
    namespace: 'Bytes',
    reference: 'Bytes'
  },
  /**
   * Lookup73: kilt_asset_dids::asset::v1::AssetId
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
   * Lookup77: kilt_asset_dids::asset::v1::EvmSmartContractFungibleReference
   **/
  KiltAssetDidsAssetV1EvmSmartContractFungibleReference: '[u8;20]',
  /**
   * Lookup78: kilt_asset_dids::asset::v1::EvmSmartContractNonFungibleReference
   **/
  KiltAssetDidsAssetV1EvmSmartContractNonFungibleReference: '(KiltAssetDidsAssetV1EvmSmartContractFungibleReference,Option<Bytes>)',
  /**
   * Lookup82: kilt_asset_dids::asset::v1::GenericAssetId
   **/
  KiltAssetDidsAssetV1GenericAssetId: {
    namespace: 'Bytes',
    reference: 'Bytes',
    id: 'Option<Bytes>'
  },
  /**
   * Lookup88: frame_system::Phase
   **/
  FrameSystemPhase: {
    _enum: {
      ApplyExtrinsic: 'u32',
      Finalization: 'Null',
      Initialization: 'Null'
    }
  },
  /**
   * Lookup92: frame_system::LastRuntimeUpgradeInfo
   **/
  FrameSystemLastRuntimeUpgradeInfo: {
    specVersion: 'Compact<u32>',
    specName: 'Text'
  },
  /**
   * Lookup96: frame_system::pallet::Call<T>
   **/
  FrameSystemCall: {
    _enum: {
      fill_block: {
        ratio: 'Perbill',
      },
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
   * Lookup101: frame_system::limits::BlockWeights
   **/
  FrameSystemLimitsBlockWeights: {
    baseBlock: 'Weight',
    maxBlock: 'Weight',
    perClass: 'FrameSupportWeightsPerDispatchClassWeightsPerClass'
  },
  /**
   * Lookup102: frame_support::weights::PerDispatchClass<frame_system::limits::WeightsPerClass>
   **/
  FrameSupportWeightsPerDispatchClassWeightsPerClass: {
    normal: 'FrameSystemLimitsWeightsPerClass',
    operational: 'FrameSystemLimitsWeightsPerClass',
    mandatory: 'FrameSystemLimitsWeightsPerClass'
  },
  /**
   * Lookup103: frame_system::limits::WeightsPerClass
   **/
  FrameSystemLimitsWeightsPerClass: {
    baseExtrinsic: 'Weight',
    maxExtrinsic: 'Option<Weight>',
    maxTotal: 'Option<Weight>',
    reserved: 'Option<Weight>'
  },
  /**
   * Lookup105: frame_system::limits::BlockLength
   **/
  FrameSystemLimitsBlockLength: {
    max: 'FrameSupportWeightsPerDispatchClassU32'
  },
  /**
   * Lookup106: frame_support::weights::PerDispatchClass<T>
   **/
  FrameSupportWeightsPerDispatchClassU32: {
    normal: 'u32',
    operational: 'u32',
    mandatory: 'u32'
  },
  /**
   * Lookup107: frame_support::weights::RuntimeDbWeight
   **/
  FrameSupportWeightsRuntimeDbWeight: {
    read: 'u64',
    write: 'u64'
  },
  /**
   * Lookup108: sp_version::RuntimeVersion
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
   * Lookup113: frame_system::pallet::Error<T>
   **/
  FrameSystemError: {
    _enum: ['InvalidSpecName', 'SpecVersionNeedsToIncrease', 'FailedToExtractRuntimeVersion', 'NonDefaultComposite', 'NonZeroRefCount', 'CallFiltered']
  },
  /**
   * Lookup115: pallet_timestamp::pallet::Call<T>
   **/
  PalletTimestampCall: {
    _enum: {
      set: {
        now: 'Compact<u64>'
      }
    }
  },
  /**
   * Lookup118: sp_consensus_aura::ed25519::app_ed25519::Public
   **/
  SpConsensusAuraEd25519AppEd25519Public: 'SpCoreEd25519Public',
  /**
   * Lookup121: pallet_grandpa::StoredState<N>
   **/
  PalletGrandpaStoredState: {
    _enum: {
      Live: 'Null',
      PendingPause: {
        scheduledAt: 'u64',
        delay: 'u64',
      },
      Paused: 'Null',
      PendingResume: {
        scheduledAt: 'u64',
        delay: 'u64'
      }
    }
  },
  /**
   * Lookup122: pallet_grandpa::StoredPendingChange<N, Limit>
   **/
  PalletGrandpaStoredPendingChange: {
    scheduledAt: 'u64',
    delay: 'u64',
    nextAuthorities: 'Vec<(SpFinalityGrandpaAppPublic,u64)>',
    forced: 'Option<u64>'
  },
  /**
   * Lookup126: pallet_grandpa::pallet::Call<T>
   **/
  PalletGrandpaCall: {
    _enum: {
      report_equivocation: {
        equivocationProof: 'SpFinalityGrandpaEquivocationProof',
        keyOwnerProof: 'SpCoreVoid',
      },
      report_equivocation_unsigned: {
        equivocationProof: 'SpFinalityGrandpaEquivocationProof',
        keyOwnerProof: 'SpCoreVoid',
      },
      note_stalled: {
        delay: 'u64',
        bestFinalizedBlockNumber: 'u64'
      }
    }
  },
  /**
   * Lookup127: sp_finality_grandpa::EquivocationProof<primitive_types::H256, N>
   **/
  SpFinalityGrandpaEquivocationProof: {
    setId: 'u64',
    equivocation: 'SpFinalityGrandpaEquivocation'
  },
  /**
   * Lookup128: sp_finality_grandpa::Equivocation<primitive_types::H256, N>
   **/
  SpFinalityGrandpaEquivocation: {
    _enum: {
      Prevote: 'FinalityGrandpaEquivocationPrevote',
      Precommit: 'FinalityGrandpaEquivocationPrecommit'
    }
  },
  /**
   * Lookup129: finality_grandpa::Equivocation<sp_finality_grandpa::app::Public, finality_grandpa::Prevote<primitive_types::H256, N>, sp_finality_grandpa::app::Signature>
   **/
  FinalityGrandpaEquivocationPrevote: {
    roundNumber: 'u64',
    identity: 'SpFinalityGrandpaAppPublic',
    first: '(FinalityGrandpaPrevote,SpFinalityGrandpaAppSignature)',
    second: '(FinalityGrandpaPrevote,SpFinalityGrandpaAppSignature)'
  },
  /**
   * Lookup130: finality_grandpa::Prevote<primitive_types::H256, N>
   **/
  FinalityGrandpaPrevote: {
    targetHash: 'H256',
    targetNumber: 'u64'
  },
  /**
   * Lookup131: sp_finality_grandpa::app::Signature
   **/
  SpFinalityGrandpaAppSignature: 'SpCoreEd25519Signature',
  /**
   * Lookup132: sp_core::ed25519::Signature
   **/
  SpCoreEd25519Signature: '[u8;64]',
  /**
   * Lookup135: finality_grandpa::Equivocation<sp_finality_grandpa::app::Public, finality_grandpa::Precommit<primitive_types::H256, N>, sp_finality_grandpa::app::Signature>
   **/
  FinalityGrandpaEquivocationPrecommit: {
    roundNumber: 'u64',
    identity: 'SpFinalityGrandpaAppPublic',
    first: '(FinalityGrandpaPrecommit,SpFinalityGrandpaAppSignature)',
    second: '(FinalityGrandpaPrecommit,SpFinalityGrandpaAppSignature)'
  },
  /**
   * Lookup136: finality_grandpa::Precommit<primitive_types::H256, N>
   **/
  FinalityGrandpaPrecommit: {
    targetHash: 'H256',
    targetNumber: 'u64'
  },
  /**
   * Lookup138: sp_core::Void
   **/
  SpCoreVoid: 'Null',
  /**
   * Lookup139: pallet_grandpa::pallet::Error<T>
   **/
  PalletGrandpaError: {
    _enum: ['PauseFailed', 'ResumeFailed', 'ChangePending', 'TooSoon', 'InvalidKeyOwnershipProof', 'InvalidEquivocationProof', 'DuplicateOffenceReport']
  },
  /**
   * Lookup141: pallet_indices::pallet::Call<T>
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
   * Lookup144: pallet_indices::pallet::Error<T>
   **/
  PalletIndicesError: {
    _enum: ['NotAssigned', 'NotOwner', 'InUse', 'NotTransfer', 'Permanent']
  },
  /**
   * Lookup146: pallet_balances::BalanceLock<Balance>
   **/
  PalletBalancesBalanceLock: {
    id: '[u8;8]',
    amount: 'u128',
    reasons: 'PalletBalancesReasons'
  },
  /**
   * Lookup147: pallet_balances::Reasons
   **/
  PalletBalancesReasons: {
    _enum: ['Fee', 'Misc', 'All']
  },
  /**
   * Lookup150: pallet_balances::ReserveData<ReserveIdentifier, Balance>
   **/
  PalletBalancesReserveData: {
    id: '[u8;8]',
    amount: 'u128'
  },
  /**
   * Lookup152: pallet_balances::Releases
   **/
  PalletBalancesReleases: {
    _enum: ['V1_0_0', 'V2_0_0']
  },
  /**
   * Lookup153: pallet_balances::pallet::Call<T, I>
   **/
  PalletBalancesCall: {
    _enum: {
      transfer: {
        dest: 'MultiAddress',
        value: 'Compact<u128>',
      },
      set_balance: {
        who: 'MultiAddress',
        newFree: 'Compact<u128>',
        newReserved: 'Compact<u128>',
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
        amount: 'u128'
      }
    }
  },
  /**
   * Lookup155: pallet_balances::pallet::Error<T, I>
   **/
  PalletBalancesError: {
    _enum: ['VestingBalance', 'LiquidityRestrictions', 'InsufficientBalance', 'ExistentialDeposit', 'KeepAlive', 'ExistingVestingSchedule', 'DeadAccount', 'TooManyReserves']
  },
  /**
   * Lookup157: pallet_transaction_payment::Releases
   **/
  PalletTransactionPaymentReleases: {
    _enum: ['V1Ancient', 'V2']
  },
  /**
   * Lookup158: pallet_sudo::pallet::Call<T>
   **/
  PalletSudoCall: {
    _enum: {
      sudo: {
        call: 'Call',
      },
      sudo_unchecked_weight: {
        call: 'Call',
        weight: 'Weight',
      },
      set_key: {
        _alias: {
          new_: 'new',
        },
        new_: 'MultiAddress',
      },
      sudo_as: {
        who: 'MultiAddress',
        call: 'Call'
      }
    }
  },
  /**
   * Lookup160: ctype::pallet::Call<T>
   **/
  CtypeCall: {
    _enum: {
      add: {
        ctype: 'Bytes'
      }
    }
  },
  /**
   * Lookup161: attestation::pallet::Call<T>
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
      transfer_deposit: {
        claimHash: 'H256'
      }
    }
  },
  /**
   * Lookup163: runtime_common::authorization::PalletAuthorize<delegation::access_control::DelegationAc<mashnet_node_runtime::Runtime>>
   **/
  RuntimeCommonAuthorizationPalletAuthorize: {
    _enum: {
      Delegation: 'DelegationAccessControlDelegationAc'
    }
  },
  /**
   * Lookup164: delegation::access_control::DelegationAc<mashnet_node_runtime::Runtime>
   **/
  DelegationAccessControlDelegationAc: {
    subjectNodeId: 'H256',
    maxChecks: 'u32'
  },
  /**
   * Lookup165: mashnet_node_runtime::Runtime
   **/
  MashnetNodeRuntimeRuntime: 'Null',
  /**
   * Lookup166: delegation::pallet::Call<T>
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
      transfer_deposit: {
        delegationId: 'H256'
      }
    }
  },
  /**
   * Lookup167: did::did_details::DidSignature
   **/
  DidDidDetailsDidSignature: {
    _enum: {
      Ed25519: 'SpCoreEd25519Signature',
      Sr25519: 'SpCoreSr25519Signature',
      Ecdsa: 'SpCoreEcdsaSignature'
    }
  },
  /**
   * Lookup168: sp_core::sr25519::Signature
   **/
  SpCoreSr25519Signature: '[u8;64]',
  /**
   * Lookup169: sp_core::ecdsa::Signature
   **/
  SpCoreEcdsaSignature: '[u8;65]',
  /**
   * Lookup171: did::pallet::Call<T>
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
      transfer_deposit: 'Null'
    }
  },
  /**
   * Lookup172: did::did_details::DidCreationDetails<T>
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
   * Lookup174: did::did_details::DidEncryptionKey
   **/
  DidDidDetailsDidEncryptionKey: {
    _enum: {
      X25519: '[u8;32]'
    }
  },
  /**
   * Lookup178: did::did_details::DidVerificationKey
   **/
  DidDidDetailsDidVerificationKey: {
    _enum: {
      Ed25519: 'SpCoreEd25519Public',
      Sr25519: 'SpCoreSr25519Public',
      Ecdsa: 'SpCoreEcdsaPublic'
    }
  },
  /**
   * Lookup179: sp_core::sr25519::Public
   **/
  SpCoreSr25519Public: '[u8;32]',
  /**
   * Lookup180: sp_core::ecdsa::Public
   **/
  SpCoreEcdsaPublic: '[u8;33]',
  /**
   * Lookup183: did::service_endpoints::DidEndpoint<T>
   **/
  DidServiceEndpointsDidEndpoint: {
    id: 'Bytes',
    serviceTypes: 'Vec<Bytes>',
    urls: 'Vec<Bytes>'
  },
  /**
   * Lookup191: did::did_details::DidAuthorizedCallOperation<T>
   **/
  DidDidDetailsDidAuthorizedCallOperation: {
    did: 'AccountId32',
    txCounter: 'u64',
    call: 'Call',
    blockNumber: 'u64',
    submitter: 'AccountId32'
  },
  /**
   * Lookup192: pallet_did_lookup::pallet::Call<T>
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
      transfer_deposit: {
        account: 'PalletDidLookupLinkableAccountLinkableAccountId'
      }
    }
  },
  /**
   * Lookup193: pallet_did_lookup::associate_account_request::AssociateAccountRequest
   **/
  PalletDidLookupAssociateAccountRequest: {
    _enum: {
      Dotsama: '(AccountId32,SpRuntimeMultiSignature)',
      Ethereum: '(PalletDidLookupAccountAccountId20,PalletDidLookupAccountEthereumSignature)'
    }
  },
  /**
   * Lookup194: sp_runtime::MultiSignature
   **/
  SpRuntimeMultiSignature: {
    _enum: {
      Ed25519: 'SpCoreEd25519Signature',
      Sr25519: 'SpCoreSr25519Signature',
      Ecdsa: 'SpCoreEcdsaSignature'
    }
  },
  /**
   * Lookup195: pallet_did_lookup::account::EthereumSignature
   **/
  PalletDidLookupAccountEthereumSignature: 'SpCoreEcdsaSignature',
  /**
   * Lookup196: pallet_session::pallet::Call<T>
   **/
  PalletSessionCall: {
    _enum: {
      set_keys: {
        _alias: {
          keys_: 'keys',
        },
        keys_: 'MashnetNodeRuntimeOpaqueSessionKeys',
        proof: 'Bytes',
      },
      purge_keys: 'Null'
    }
  },
  /**
   * Lookup197: mashnet_node_runtime::opaque::SessionKeys
   **/
  MashnetNodeRuntimeOpaqueSessionKeys: {
    aura: 'SpConsensusAuraEd25519AppEd25519Public',
    grandpa: 'SpFinalityGrandpaAppPublic'
  },
  /**
   * Lookup198: pallet_authorship::pallet::Call<T>
   **/
  PalletAuthorshipCall: {
    _enum: {
      set_uncles: {
        newUncles: 'Vec<SpRuntimeHeader>'
      }
    }
  },
  /**
   * Lookup200: sp_runtime::generic::header::Header<Number, sp_runtime::traits::BlakeTwo256>
   **/
  SpRuntimeHeader: {
    parentHash: 'H256',
    number: 'Compact<u64>',
    stateRoot: 'H256',
    extrinsicsRoot: 'H256',
    digest: 'SpRuntimeDigest'
  },
  /**
   * Lookup201: sp_runtime::traits::BlakeTwo256
   **/
  SpRuntimeBlakeTwo256: 'Null',
  /**
   * Lookup202: pallet_utility::pallet::Call<T>
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
        asOrigin: 'MashnetNodeRuntimeOriginCaller',
        call: 'Call',
      },
      force_batch: {
        calls: 'Vec<Call>'
      }
    }
  },
  /**
   * Lookup204: mashnet_node_runtime::OriginCaller
   **/
  MashnetNodeRuntimeOriginCaller: {
    _enum: {
      system: 'FrameSupportDispatchRawOrigin',
      __Unused1: 'Null',
      Void: 'SpCoreVoid',
      __Unused3: 'Null',
      __Unused4: 'Null',
      __Unused5: 'Null',
      __Unused6: 'Null',
      __Unused7: 'Null',
      __Unused8: 'Null',
      __Unused9: 'Null',
      __Unused10: 'Null',
      __Unused11: 'Null',
      Did: 'DidOriginDidRawOrigin'
    }
  },
  /**
   * Lookup205: frame_support::dispatch::RawOrigin<sp_core::crypto::AccountId32>
   **/
  FrameSupportDispatchRawOrigin: {
    _enum: {
      Root: 'Null',
      Signed: 'AccountId32',
      None: 'Null'
    }
  },
  /**
   * Lookup206: did::origin::DidRawOrigin<sp_core::crypto::AccountId32, sp_core::crypto::AccountId32>
   **/
  DidOriginDidRawOrigin: {
    id: 'AccountId32',
    submitter: 'AccountId32'
  },
  /**
   * Lookup207: pallet_proxy::pallet::Call<T>
   **/
  PalletProxyCall: {
    _enum: {
      proxy: {
        real: 'MultiAddress',
        forceProxyType: 'Option<MashnetNodeRuntimeProxyType>',
        call: 'Call',
      },
      add_proxy: {
        delegate: 'MultiAddress',
        proxyType: 'MashnetNodeRuntimeProxyType',
        delay: 'u64',
      },
      remove_proxy: {
        delegate: 'MultiAddress',
        proxyType: 'MashnetNodeRuntimeProxyType',
        delay: 'u64',
      },
      remove_proxies: 'Null',
      anonymous: {
        proxyType: 'MashnetNodeRuntimeProxyType',
        delay: 'u64',
        index: 'u16',
      },
      kill_anonymous: {
        spawner: 'MultiAddress',
        proxyType: 'MashnetNodeRuntimeProxyType',
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
        forceProxyType: 'Option<MashnetNodeRuntimeProxyType>',
        call: 'Call'
      }
    }
  },
  /**
   * Lookup209: pallet_web3_names::pallet::Call<T>
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
      transfer_deposit: 'Null'
    }
  },
  /**
   * Lookup210: public_credentials::pallet::Call<T>
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
        credentialId: 'H256'
      }
    }
  },
  /**
   * Lookup211: public_credentials::credentials::Credential<primitive_types::H256, sp_runtime::bounded::bounded_vec::BoundedVec<T, S>, sp_runtime::bounded::bounded_vec::BoundedVec<T, S>, runtime_common::authorization::PalletAuthorize<delegation::access_control::DelegationAc<mashnet_node_runtime::Runtime>>>
   **/
  PublicCredentialsCredentialsCredential: {
    ctypeHash: 'H256',
    subject: 'Bytes',
    claims: 'Bytes',
    authorization: 'Option<RuntimeCommonAuthorizationPalletAuthorize>'
  },
  /**
   * Lookup214: pallet_sudo::pallet::Error<T>
   **/
  PalletSudoError: {
    _enum: ['RequireSudo']
  },
  /**
   * Lookup215: ctype::pallet::Error<T>
   **/
  CtypeError: {
    _enum: ['CTypeNotFound', 'CTypeAlreadyExists', 'UnableToPayFees']
  },
  /**
   * Lookup216: attestation::attestations::AttestationDetails<T>
   **/
  AttestationAttestationsAttestationDetails: {
    ctypeHash: 'H256',
    attester: 'AccountId32',
    authorizationId: 'Option<RuntimeCommonAuthorizationAuthorizationId>',
    revoked: 'bool',
    deposit: 'KiltSupportDeposit'
  },
  /**
   * Lookup217: kilt_support::deposit::Deposit<sp_core::crypto::AccountId32, Balance>
   **/
  KiltSupportDeposit: {
    owner: 'AccountId32',
    amount: 'u128'
  },
  /**
   * Lookup219: attestation::pallet::Error<T>
   **/
  AttestationError: {
    _enum: ['AlreadyAttested', 'AlreadyRevoked', 'AttestationNotFound', 'CTypeMismatch', 'Unauthorized', 'MaxDelegatedAttestationsExceeded']
  },
  /**
   * Lookup220: delegation::delegation_hierarchy::DelegationNode<T>
   **/
  DelegationDelegationHierarchyDelegationNode: {
    hierarchyRootId: 'H256',
    parent: 'Option<H256>',
    children: 'BTreeSet<H256>',
    details: 'DelegationDelegationHierarchyDelegationDetails',
    deposit: 'KiltSupportDeposit'
  },
  /**
   * Lookup224: delegation::delegation_hierarchy::DelegationDetails<T>
   **/
  DelegationDelegationHierarchyDelegationDetails: {
    owner: 'AccountId32',
    revoked: 'bool',
    permissions: 'DelegationDelegationHierarchyPermissions'
  },
  /**
   * Lookup225: delegation::delegation_hierarchy::DelegationHierarchyDetails<T>
   **/
  DelegationDelegationHierarchyDelegationHierarchyDetails: {
    ctypeHash: 'H256'
  },
  /**
   * Lookup226: delegation::pallet::Error<T>
   **/
  DelegationError: {
    _enum: ['DelegationAlreadyExists', 'InvalidDelegateSignature', 'DelegationNotFound', 'DelegateNotFound', 'HierarchyAlreadyExists', 'HierarchyNotFound', 'MaxSearchDepthReached', 'NotOwnerOfParentDelegation', 'NotOwnerOfDelegationHierarchy', 'ParentDelegationNotFound', 'ParentDelegationRevoked', 'UnauthorizedRevocation', 'UnauthorizedRemoval', 'UnauthorizedDelegation', 'AccessDenied', 'ExceededRevocationBounds', 'ExceededRemovalBounds', 'MaxRevocationsTooLarge', 'MaxRemovalsTooLarge', 'MaxParentChecksTooLarge', 'InternalError', 'MaxChildrenExceeded']
  },
  /**
   * Lookup227: did::did_details::DidDetails<T>
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
   * Lookup230: did::did_details::DidPublicKeyDetails<BlockNumber>
   **/
  DidDidDetailsDidPublicKeyDetails: {
    key: 'DidDidDetailsDidPublicKey',
    blockNumber: 'u64'
  },
  /**
   * Lookup231: did::did_details::DidPublicKey
   **/
  DidDidDetailsDidPublicKey: {
    _enum: {
      PublicVerificationKey: 'DidDidDetailsDidVerificationKey',
      PublicEncryptionKey: 'DidDidDetailsDidEncryptionKey'
    }
  },
  /**
   * Lookup236: did::pallet::Error<T>
   **/
  DidError: {
    _enum: ['InvalidSignatureFormat', 'InvalidSignature', 'DidAlreadyPresent', 'DidNotPresent', 'VerificationKeyNotPresent', 'InvalidNonce', 'UnsupportedDidAuthorizationCall', 'InvalidDidAuthorizationCall', 'MaxKeyAgreementKeysLimitExceeded', 'MaxPublicKeysPerDidExceeded', 'MaxTotalKeyAgreementKeysExceeded', 'BadDidOrigin', 'TransactionExpired', 'DidAlreadyDeleted', 'NotOwnerOfDeposit', 'UnableToPayFees', 'MaxNumberOfServicesPerDidExceeded', 'MaxServiceIdLengthExceeded', 'MaxServiceTypeLengthExceeded', 'MaxNumberOfTypesPerServiceExceeded', 'MaxServiceUrlLengthExceeded', 'MaxNumberOfUrlsPerServiceExceeded', 'ServiceAlreadyPresent', 'ServiceNotPresent', 'InvalidServiceEncoding', 'StoredEndpointsCountTooLarge', 'InternalError']
  },
  /**
   * Lookup237: pallet_did_lookup::connection_record::ConnectionRecord<sp_core::crypto::AccountId32, sp_core::crypto::AccountId32, Balance>
   **/
  PalletDidLookupConnectionRecord: {
    did: 'AccountId32',
    deposit: 'KiltSupportDeposit'
  },
  /**
   * Lookup239: pallet_did_lookup::pallet::Error<T>
   **/
  PalletDidLookupError: {
    _enum: ['AssociationNotFound', 'NotAuthorized', 'OutdatedProof', 'InsufficientFunds']
  },
  /**
   * Lookup245: sp_core::crypto::KeyTypeId
   **/
  SpCoreCryptoKeyTypeId: '[u8;4]',
  /**
   * Lookup246: pallet_session::pallet::Error<T>
   **/
  PalletSessionError: {
    _enum: ['InvalidProof', 'NoAssociatedValidatorId', 'DuplicatedKey', 'NoKeys', 'NoAccount']
  },
  /**
   * Lookup248: pallet_authorship::UncleEntryItem<BlockNumber, primitive_types::H256, sp_core::crypto::AccountId32>
   **/
  PalletAuthorshipUncleEntryItem: {
    _enum: {
      InclusionHeight: 'u64',
      Uncle: '(H256,Option<AccountId32>)'
    }
  },
  /**
   * Lookup250: pallet_authorship::pallet::Error<T>
   **/
  PalletAuthorshipError: {
    _enum: ['InvalidUncleParent', 'UnclesAlreadySet', 'TooManyUncles', 'GenesisUncle', 'TooHighUncle', 'UncleAlreadyIncluded', 'OldUncle']
  },
  /**
   * Lookup251: pallet_utility::pallet::Error<T>
   **/
  PalletUtilityError: {
    _enum: ['TooManyCalls']
  },
  /**
   * Lookup254: pallet_proxy::ProxyDefinition<sp_core::crypto::AccountId32, mashnet_node_runtime::ProxyType, BlockNumber>
   **/
  PalletProxyProxyDefinition: {
    delegate: 'AccountId32',
    proxyType: 'MashnetNodeRuntimeProxyType',
    delay: 'u64'
  },
  /**
   * Lookup258: pallet_proxy::Announcement<sp_core::crypto::AccountId32, primitive_types::H256, BlockNumber>
   **/
  PalletProxyAnnouncement: {
    real: 'AccountId32',
    callHash: 'H256',
    height: 'u64'
  },
  /**
   * Lookup260: pallet_proxy::pallet::Error<T>
   **/
  PalletProxyError: {
    _enum: ['TooMany', 'NotFound', 'NotProxy', 'Unproxyable', 'Duplicate', 'NoPermission', 'Unannounced', 'NoSelfProxy']
  },
  /**
   * Lookup261: pallet_web3_names::web3_name::Web3NameOwnership<sp_core::crypto::AccountId32, kilt_support::deposit::Deposit<sp_core::crypto::AccountId32, Balance>, BlockNumber>
   **/
  PalletWeb3NamesWeb3NameWeb3NameOwnership: {
    owner: 'AccountId32',
    claimedAt: 'u64',
    deposit: 'KiltSupportDeposit'
  },
  /**
   * Lookup262: pallet_web3_names::pallet::Error<T>
   **/
  PalletWeb3NamesError: {
    _enum: ['InsufficientFunds', 'Web3NameAlreadyClaimed', 'Web3NameNotFound', 'OwnerAlreadyExists', 'OwnerNotFound', 'Web3NameBanned', 'Web3NameNotBanned', 'Web3NameAlreadyBanned', 'NotAuthorized', 'Web3NameTooShort', 'Web3NameTooLong', 'InvalidWeb3NameCharacter']
  },
  /**
   * Lookup264: public_credentials::credentials::CredentialEntry<primitive_types::H256, sp_core::crypto::AccountId32, BlockNumber, sp_core::crypto::AccountId32, Balance, runtime_common::authorization::AuthorizationId<primitive_types::H256>>
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
   * Lookup265: public_credentials::pallet::Error<T>
   **/
  PublicCredentialsError: {
    _enum: ['CredentialAlreadyIssued', 'CredentialNotFound', 'UnableToPayFees', 'InvalidInput', 'Unauthorized', 'InternalError']
  },
  /**
   * Lookup268: frame_system::extensions::check_non_zero_sender::CheckNonZeroSender<T>
   **/
  FrameSystemExtensionsCheckNonZeroSender: 'Null',
  /**
   * Lookup269: frame_system::extensions::check_spec_version::CheckSpecVersion<T>
   **/
  FrameSystemExtensionsCheckSpecVersion: 'Null',
  /**
   * Lookup270: frame_system::extensions::check_tx_version::CheckTxVersion<T>
   **/
  FrameSystemExtensionsCheckTxVersion: 'Null',
  /**
   * Lookup271: frame_system::extensions::check_genesis::CheckGenesis<T>
   **/
  FrameSystemExtensionsCheckGenesis: 'Null',
  /**
   * Lookup274: frame_system::extensions::check_nonce::CheckNonce<T>
   **/
  FrameSystemExtensionsCheckNonce: 'Compact<u64>',
  /**
   * Lookup275: frame_system::extensions::check_weight::CheckWeight<T>
   **/
  FrameSystemExtensionsCheckWeight: 'Null',
  /**
   * Lookup276: pallet_transaction_payment::ChargeTransactionPayment<T>
   **/
  PalletTransactionPaymentChargeTransactionPayment: 'Compact<u128>'
};
