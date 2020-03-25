import { Text, Tuple, Vec, Option, TypeRegistry } from '@polkadot/types'
import Bool from '@polkadot/types/primitive/Bool'
import U32 from '@polkadot/types/primitive/U32'
import AccountId from '@polkadot/types/generic/AccountId'
import { Crypto, Identity } from '..'
import DelegationNode from './DelegationNode'
import { getAttestationHashes } from './Delegation.chain'
import { Permission } from '../types/Delegation'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('Delegation', () => {
  const registry = new TypeRegistry()

  const identityAlice = Identity.buildFromURI('//Alice')

  const ctypeHash = Crypto.hashStr('testCtype')
  const blockchain = require('../blockchain/Blockchain').default
  blockchain.api.tx.delegation.createRoot = jest.fn(() => {
    return Promise.resolve()
  })
  blockchain.api.query.attestation.delegatedAttestations = jest.fn(() => {
    const vector = new Vec(
      registry,
      //  (claim-hash)
      Text,
      ['0x123', '0x456', '0x789']
    )
    return Promise.resolve(vector)
  })
  blockchain.api.query.delegation.root = jest.fn(() => {
    const tuple = new Option(
      registry,
      Tuple,
      new Tuple(
        registry,
        // Root-Delegation: root-id -> (ctype-hash, account, revoked)
        [Text, AccountId, Bool],
        [[ctypeHash, identityAlice.address, false]]
      )
    )
    return Promise.resolve(tuple)
  })
  blockchain.api.query.delegation.delegations = jest.fn((delegationId) => {
    let result = null
    if (delegationId === 'firstChild') {
      result = new Option(
        registry,
        Tuple,
        new Tuple(
          registry,
          // Delegation: delegation-id -> (root-id, parent-id?, account, permissions, revoked)
          [Text, Text, AccountId, U32, Bool],
          [
            'rootId',
            'myNodeId',
            identityAlice.getPublicIdentity().address,
            2,
            false,
          ]
        )
      )
    } else if (delegationId === 'secondChild') {
      result = new Option(
        registry,
        Tuple,
        new Tuple(
          registry,
          // Delegation: delegation-id -> (root-id, parent-id?, account, permissions, revoked)
          [Text, Text, AccountId, U32, Bool],
          [
            'rootId',
            'myNodeId',
            identityAlice.getPublicIdentity().address,
            1,
            false,
          ]
        )
      )
    } else if (delegationId === 'thirdChild') {
      result = new Option(
        registry,
        Tuple,
        new Tuple(
          registry,
          // Delegation: delegation-id -> (root-id, parent-id?, account, permissions, revoked)
          [Text, Text, AccountId, U32, Bool],
          [
            'rootId',
            'myNodeId',
            identityAlice.getPublicIdentity().address,
            0,
            false,
          ]
        )
      )
    }
    return Promise.resolve(result)
  })
  blockchain.api.query.delegation.children = jest.fn(() => {
    const vector = new Vec(
      registry,
      // Children: delegation-id -> [delegation-ids]
      Text,
      ['firstChild', 'secondChild', 'thirdChild']
    )
    return Promise.resolve(vector)
  })

  it('get children', async () => {
    const myDelegation = new DelegationNode(
      'myNodeId',
      'rootId',
      identityAlice.getPublicIdentity().address,
      [Permission.ATTEST],
      undefined
    )
    const children: DelegationNode[] = await myDelegation.getChildren()
    expect(children).toHaveLength(3)
    expect(children[0]).toEqual({
      id: 'firstChild',
      rootId: 'rootId',
      parentId: 'myNodeId',
      account: identityAlice.getPublicIdentity().address,
      permissions: [Permission.DELEGATE],
      revoked: false,
    })
    expect(children[1]).toEqual({
      id: 'secondChild',
      rootId: 'rootId',
      parentId: 'myNodeId',
      account: identityAlice.getPublicIdentity().address,
      permissions: [Permission.ATTEST],
      revoked: false,
    })
    expect(children[2]).toEqual({
      id: 'thirdChild',
      rootId: 'rootId',
      parentId: 'myNodeId',
      account: identityAlice.getPublicIdentity().address,
      permissions: [],
      revoked: false,
    })
  })
  it('get attestation hashes', async () => {
    const attestationHashes = await getAttestationHashes('myDelegationId')
    expect(attestationHashes).toHaveLength(3)
    expect(attestationHashes).toContain('0x123')
  })
})
