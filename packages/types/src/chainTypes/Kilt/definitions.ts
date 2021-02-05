export default {
  types: {
    PublicSigningKey: 'Hash',
    PublicBoxKey: 'Hash',
    Signature: 'MultiSignature',
    Address: 'AccountId',
    LookupSource: 'AccountId',
    BlockNumber: 'u64',
    Index: 'u64',
    RefCount: 'u32',

    ErrorCode: 'u16',
    Permissions: 'u32',
    DelegationNodeId: 'Hash',
    DelegationNode: {
      rootId: 'DelegationNodeId',
      parent: 'Option<DelegationNodeId>',
      owner: 'AccountId',
      permissions: 'Permissions',
      revoked: 'bool',
    },
    DelegationRoot: {
      ctypeHash: 'Hash',
      owner: 'AccountId',
      revoked: 'bool',
    },
    Attestation: {
      ctypeHash: 'Hash',
      attester: 'AccountId',
      delegationId: 'Option<DelegationNodeId>',
      revoked: 'bool',
    },
  },
}
