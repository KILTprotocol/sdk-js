import { RegistryTypes } from '@polkadot/types/types'

export default {
  RefCount: 'u32',

  Address: 'AccountId',
  Index: 'u64',
  LookupSource: 'Address',
  BlockNumber: 'u64',
  Signature: 'MultiSignature',
  AccountIndex: 'u32',
  Hash: 'H256',

  DelegationNodeId: 'Hash',
  PublicSigningKey: 'Hash',
  PublicBoxKey: 'Hash',
  Permissions: 'u32',
  ErrorCode: 'u16',
} as RegistryTypes
