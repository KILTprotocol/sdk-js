import { RegistryTypes } from '@polkadot/types/types'

export default {
  ValidationDataType: 'ValidationData',
  HrmpChannelId: {
    sender: 'u32',
    receiver: 'u32',
  },
  SignedAvailabilityBitfield: {
    payload: 'BitVec',
    validator_index: 'u32',
    signature: 'Signature',
  },
  SignedAvailabilityBitfields: 'Vec<SignedAvailabilityBitfield>',
  ValidatorSignature: 'Signature',
  HeadData: 'Vec<u8>',
  CandidateDescriptor: {
    para_id: 'u32',
    relay_parent: 'Hash',
    collator_id: 'Hash',
    persisted_validation_data_hash: 'Hash',
    pov_hash: 'Hash',
    signature: 'Signature',
  },
  CandidateReceipt: {
    descriptor: 'CandidateDescriptor',
    commitments_hash: 'Hash',
  },
  UpwardMessage: 'Vec<u8>',
  OutboundHrmpMessage: {
    recipient: 'u32',
    data: 'Vec<u8>',
  },
  ValidationCode: 'Vec<u8>',
  CandidateCommitments: {
    upward_messages: 'Vec<UpwardMessage>',
    horizontal_messages: 'Vec<OutboundHrmpMessage>',
    erasure_root: 'Hash',
    new_validation_code: 'Option<ValidationCode>',
    head_data: 'HeadData',
    processed_downward_messages: 'u32',
    hrmp_watermark: 'BlockNumber',
  },
  CommittedCandidateReceipt: {
    descriptor: 'CandidateDescriptor',
    commitments: 'CandidateCommitments',
  },
  ValidityAttestation: {
    _enum: {
      DummyOffsetBy1: 'Raw',
      Implicit: 'ValidatorSignature',
      Explicit: 'ValidatorSignature',
    },
  },
  BackedCandidate: {
    candidate: 'CommittedCandidateReceipt',
    validity_votes: 'Vec<ValidityAttestation>',
    validator_indices: 'BitVec',
  },
  OriginKind: {
    _enum: {
      Native: null,
      SovereignAccount: null,
      Superuser: null,
    },
  },
  NetworkId: {
    _enum: {
      Any: null,
      Named: 'Vec<u8>',
      Polkadot: null,
      Kusama: null,
    },
  },
  MultiLocation: {
    _enum: {
      Null: null,
      X1: 'Junction',
      X2: '(Junction, Junction)',
      X3: '(Junction, Junction, Junction)',
      X4: '(Junction, Junction, Junction, Junction)',
    },
  },
  AccountId32Junction: {
    network: 'NetworkId',
    id: 'AccountId',
  },
  AccountIndex64Junction: {
    network: 'NetworkId',
    index: 'Compact<u64>',
  },
  AccountKey20Junction: {
    network: 'NetworkId',
    index: '[u8; 20]',
  },
  Junction: {
    _enum: {
      Parent: null,
      Parachain: 'Compact<u32>',
      AccountId32: 'AccountId32Junction',
      AccountIndex64: 'AccountIndex64Junction',
      AccountKey20: 'AccountKey20Junction',
      PalletInstance: 'u8',
      GeneralIndex: 'Compact<u128>',
      GeneralKey: 'Vec<u8>',
      OnlyChild: null,
    },
  },
  VersionedMultiLocation: {
    _enum: {
      V0: 'MultiLocation',
    },
  },
  AssetInstance: {
    _enum: {
      Undefined: null,
      Index8: 'u8',
      Index16: 'Compact<u16>',
      Index32: 'Compact<u32>',
      Index64: 'Compact<u64>',
      Index128: 'Compact<u128>',
      Array4: '[u8; 4]',
      Array8: '[u8; 8]',
      Array16: '[u8; 16]',
      Array32: '[u8; 32]',
      Blob: 'Vec<u8>',
    },
  },
  AbstractFungible: {
    id: 'Vec<u8>',
    instance: 'Compact<u128>',
  },
  AbstractNonFungible: {
    class: 'Vec<u8>',
    instance: 'AssetInstance',
  },
  ConcreteFungible: {
    id: 'MultiLocation',
    amount: 'Compact<u128>',
  },
  ConcreteNonFungible: {
    class: 'MultiLocation',
    instance: 'AssetInstance',
  },
  MultiAsset: {
    _enum: {
      None: null,
      All: null,
      AllFungible: null,
      AllNonFungible: null,
      AllAbstractFungible: 'Vec<u8>',
      AllAbstractNonFungible: 'Vec<u8>',
      AllConcreteFungible: 'MultiLocation',
      AllConcreteNonFungible: 'MultiLocation',
      AbstractFungible: 'AbstractFungible',
      AbstractNonFungible: 'AbstractNonFungible',
      ConcreteFungible: 'ConcreteFungible',
      ConcreteNonFungible: 'ConcreteNonFungible',
    },
  },
  VersionedMultiAsset: {
    _enum: {
      V0: 'MultiAsset',
    },
  },
  DepositAsset: {
    assets: 'Vec<MultiAsset>',
    dest: 'MultiLocation',
  },
  DepositReserveAsset: {
    assets: 'Vec<MultiAsset>',
    dest: 'MultiLocation',
    effects: 'Vec<Order>',
  },
  ExchangeAsset: {
    give: 'Vec<MultiAsset>',
    receive: 'Vec<MultiAsset>',
  },
  InitiateReserveWithdraw: {
    assets: 'Vec<MultiAsset>',
    reserve: 'MultiLocation',
    effects: 'Vec<Order>',
  },
  InitiateTeleport: {
    assets: 'Vec<MultiAsset>',
    dest: 'MultiLocation',
    effects: 'Vec<Order>',
  },
  QueryHolding: {
    query_id: 'Compact<u64>',
    dest: 'MultiLocation',
    assets: 'Vec<MultiAsset>',
  },
  Order: {
    _enum: {
      Null: null,
      DepositAsset: 'DepositAsset',
      DepositReserveAsset: 'DepositReserveAsset',
      ExchangeAsset: 'ExchangeAsset',
      InitiateReserveWithdraw: 'InitiateReserveWithdraw',
      InitiateTeleport: 'InitiateTeleport',
      QueryHolding: 'QueryHolding',
    },
  },
  WithdrawAsset: {
    assets: 'Vec<MultiAsset>',
    effects: 'Vec<Order>',
  },
  ReserveAssetDeposit: {
    assets: 'Vec<MultiAsset>',
    effects: 'Vec<Order>',
  },
  TeleportAsset: {
    assets: 'Vec<MultiAsset>',
    effects: 'Vec<Order>',
  },
  Balances: {
    query_id: 'Compact<u64>',
    assets: 'Vec<MultiAsset>',
  },
  Transact: {
    origin_type: 'OriginKind',
    call: 'Vec<u8>',
  },
  RelayTo: {
    dest: 'MultiLocation',
    inner: 'VersionedXcm',
  },
  RelayedFrom: {
    superorigin: 'MultiLocation',
    inner: 'VersionedXcm',
  },
  Xcm: {
    _enum: {
      WithdrawAsset: 'WithdrawAsset',
      ReserveAssetDeposit: 'ReserveAssetDeposit',
      TeleportAsset: 'TeleportAsset',
      Balances: 'Balances',
      Transact: 'Transact',
      RelayTo: 'RelayTo',
      RelayedFrom: 'RelayedFrom',
    },
  },
  VersionedXcm: {
    _enum: {
      V0: 'Xcm',
    },
  },
  XcmError: {
    _enum: [
      'Undefined',
      'Unimplemented',
      'UnhandledXcmVersion',
      'UnhandledXcmMessage',
      'UnhandledEffect',
      'EscalationOfPrivilege',
      'UntrustedReserveLocation',
      'UntrustedTeleportLocation',
      'DestinationBufferOverflow',
      'CannotReachDestination',
      'MultiLocationFull',
      'FailedToDecode',
      'BadOrigin',
    ],
  },
  XcmResult: {
    _enum: {
      Ok: '()',
      Err: 'XcmError',
    },
  },
  BlockWeights: {
    base_block: 'Weight',
    max_block: 'Weight',
    per_class: 'PerDispatchClass<WeightsPerClass>',
  },
  WeightsPerClass: {
    base_extrinsic: 'Weight',
    max_extrinsic: 'Option<Weight>',
    max_total: 'Option<Weight>',
    reserved: 'Option<Weight>',
  },
  'PerDispatchClass<WeightsPerClass>': {
    normal: 'WeightsPerClass',
    operational: 'WeightsPerClass',
    mandatory: 'WeightsPerClass',
  },
  PerDispatchClass: {
    normal: 'u32',
    operational: 'u32',
    mandatory: 'u32',
  },
  ConsumedWeight: 'PerDispatchClass<Weight>',
} as RegistryTypes
