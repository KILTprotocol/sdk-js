/**
 * @packageDocumentation
 * @group unit/delegation
 * @ignore
 */

import { Permission } from '@kiltprotocol/types'
import TYPE_REGISTRY, {
  mockChainQueryReturn,
} from '@kiltprotocol/chain-helpers/lib/blockchainApiConnection/__mocks__/BlockchainQuery'
import { BlockchainUtils } from '@kiltprotocol/chain-helpers/'
import Identity from '../identity/Identity'
import DelegationNode from './DelegationNode'
import permissionsAsBitset from './DelegationNode.utils'
import Kilt from '../kilt/Kilt'

jest.mock(
  '@kiltprotocol/chain-helpers/lib/blockchainApiConnection/BlockchainApiConnection'
)

let identityAlice: Identity
Kilt.config({ address: 'ws://testString' })
beforeAll(async () => {
  identityAlice = Identity.buildFromURI('//Alice')
})

describe('Delegation', () => {
  const api = require('@kiltprotocol/chain-helpers/lib/blockchainApiConnection/BlockchainApiConnection')
    .__mocked_api
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
    const permissions: Uint8Array = permissionsAsBitset(node)
    const expected: Uint8Array = new Uint8Array(4)
    expected[0] = 3
    expect(permissions.toString()).toBe(expected.toString())
  })

  it('delegation verify / revoke', async () => {
    api.query.delegation.delegations = jest.fn(async (id) => {
      if (id === 'success') {
        return mockChainQueryReturn('delegation', 'delegations', [
          'myRootId',
          null,
          identityAlice.address,
          1,
          false,
        ])
      }
      return mockChainQueryReturn('delegation', 'delegations', [
        'myRootId',
        null,
        identityAlice.address,
        1,
        true,
      ])
    })
    api.registry = TYPE_REGISTRY

    expect(
      await new DelegationNode(
        'success',
        'myRootId',
        identityAlice.address,
        []
      ).verify()
    ).toBe(true)

    expect(
      await new DelegationNode(
        'failure',
        'myRootId',
        identityAlice.address,
        []
      ).verify()
    ).toBe(false)

    const aDelegationNode = new DelegationNode(
      'myDelegationNode',
      'myRootId',
      'myAccount',
      []
    )
    const revokeStatus = await aDelegationNode
      .revoke(identityAlice)
      .then((tx) => BlockchainUtils.submitTxWithReSign(tx, identityAlice))

    expect(revokeStatus).toBeDefined()
  })

  it('get delegation root', async () => {
    require('@kiltprotocol/chain-helpers/lib/blockchainApiConnection/BlockchainApiConnection').__mocked_api.query.delegation.root.mockReturnValue(
      mockChainQueryReturn('delegation', 'root', [
        '0x1234000000000000000000000000000000000000000000000000000000000000',
        identityAlice.address,
        false,
      ])
    )

    const node: DelegationNode = new DelegationNode(
      'nodeId',
      'rootNodeId',
      identityAlice.address,
      []
    )
    const rootNode = await node.getRoot()

    expect(rootNode).toBeDefined()
    expect(rootNode.cTypeHash).toBe(
      '0x1234000000000000000000000000000000000000000000000000000000000000'
    )
  })
})
