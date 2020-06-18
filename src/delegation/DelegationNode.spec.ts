import { Option, Text, Tuple, TypeRegistry } from '@polkadot/types'
import Bool from '@polkadot/types/primitive/Bool'
import U32 from '@polkadot/types/primitive/U32'
import Identity from '../identity/Identity'
import { Permission } from '../types/Delegation'
import DelegationNode from './DelegationNode'
import permissionsAsBitset from './DelegationNode.utils'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('Delegation', () => {
  const registry = new TypeRegistry()
  it('delegation generate hash', () => {
    const node = new DelegationNode(
      '0x0000000000000000000000000000000000000000000000000000000000000001',
      '0x0000000000000000000000000000000000000000000000000000000000000002',
      'myAccount',
      [Permission.ATTEST],
      '0x0000000000000000000000000000000000000000000000000000000000000003'
    )
    const hash: string = node.generateHash()
    expect(hash).toBe(
      '0x20c5b0ba186b1eef2eabdb10a5e6399cc8eaa865ad0aaed6d3583c97746392aa'
    )
  })

  it('delegation permissionsAsBitset', () => {
    const node = new DelegationNode(
      'myId',
      'myRootId',
      'myAccount',
      [Permission.ATTEST, Permission.DELEGATE],
      'myParentNodeId'
    )
    // @ts-ignore
    const permissions: Uint8Array = permissionsAsBitset(node)
    const expected: Uint8Array = new Uint8Array(4)
    expected[0] = 3
    expect(permissions.toString()).toBe(expected.toString())
  })

  it('delegation verify / revoke', async () => {
    require('../blockchainApiConnection/BlockchainApiConnection').__mocked_api.query.delegation.delegations = jest.fn(
      async id => {
        if (id === 'success') {
          return new Option(
            registry,
            Tuple,
            new Tuple(
              registry,
              // (root-id, parent-id?, account, permissions, revoked)
              [Text, Option, Text, U32, Bool],
              ['myRootId', null, 'myAccount', 1, 0]
            )
          )
        }
        return new Option(
          registry,
          Tuple,
          new Tuple(
            registry,
            // (root-id, parent-id?, account, permissions, revoked)
            [Text, Option, Text, U32, Bool],
            ['myRootId', null, 'myAccount', 1, 1]
          )
        )
      }
    )

    expect(
      await new DelegationNode('success', 'myRootId', 'myAccount', []).verify()
    ).toBe(true)

    expect(
      await new DelegationNode('failure', 'myRootId', 'myAccount', []).verify()
    ).toBe(false)

    const identityAlice = await Identity.buildFromURI('//Alice')
    const aDelegationNode = new DelegationNode(
      'myDelegationNode',
      'myRootId',
      'myAccount',
      []
    )
    const revokeStatus = await aDelegationNode.revoke(identityAlice)
    expect(revokeStatus).toBeDefined()
  })

  it('get delegation root', async () => {
    const identityAlice = await Identity.buildFromURI('//Alice')

    require('../blockchainApiConnection/BlockchainApiConnection').__mocked_api.query.delegation.root.mockReturnValue(
      new Option(
        registry,
        Tuple,
        new Tuple(
          registry,
          // Root-Delegation: root-id -> (ctype-hash, account, revoked)
          ['H256', Text, Bool],
          [
            '0x1234000000000000000000000000000000000000000000000000000000000000',
            identityAlice.getAddress(),
            0,
          ]
        )
      )
    )

    const node: DelegationNode = new DelegationNode(
      'nodeId',
      'rootNodeId',
      identityAlice.getAddress(),
      []
    )
    const rootNode = await node.getRoot()

    expect(rootNode).toBeDefined()
    expect(rootNode.cTypeHash).toBe(
      '0x1234000000000000000000000000000000000000000000000000000000000000'
    )
  })
})
