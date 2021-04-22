/**
 * @group unit/delegation
 */

import { Permission } from '@kiltprotocol/types'
import { encodeAddress } from '@polkadot/keyring'
import { Crypto } from '@kiltprotocol/utils'
import Identity from '../identity'
import DelegationNode from './DelegationNode'
import DelegationRootNode from './DelegationRootNode'
import { permissionsAsBitset } from './DelegationNode.utils'

let childMap: Record<string, DelegationNode[]> = {}
let nodes: Record<string, DelegationNode> = {}
let rootNodes: Record<string, DelegationRootNode> = {}

jest.mock('./DelegationNode.chain', () => ({
  getChildren: jest.fn(async (id: string) => {
    return childMap[id] || []
  }),
  query: jest.fn(async (id: string) => nodes[id] || null),
}))

jest.mock('./DelegationRootNode.chain', () => ({
  query: jest.fn(async (id: string) => rootNodes[id] || null),
}))

const rootId = 'root'
let identityAlice: Identity

beforeAll(() => {
  identityAlice = Identity.buildFromURI('//Alice')
})

describe('Delegation', () => {
  it('delegation generate hash', () => {
    const node = new DelegationNode({
      id: '0x0000000000000000000000000000000000000000000000000000000000000001',
      rootId:
        '0x0000000000000000000000000000000000000000000000000000000000000002',
      account: 'myAccount',
      permissions: [Permission.ATTEST],
      parentId:
        '0x0000000000000000000000000000000000000000000000000000000000000003',
      revoked: false,
    })
    const hash: string = node.generateHash()
    expect(hash).toBe(
      '0x20c5b0ba186b1eef2eabdb10a5e6399cc8eaa865ad0aaed6d3583c97746392aa'
    )
  })

  it('delegation permissionsAsBitset', () => {
    const node = new DelegationNode({
      id: 'myId',
      rootId: 'myRootId',
      account: 'myAccount',
      permissions: [Permission.ATTEST, Permission.DELEGATE],
      parentId: 'myParentNodeId',
      revoked: false,
    })
    const permissions: Uint8Array = permissionsAsBitset(node)
    const expected: Uint8Array = new Uint8Array(4)
    expected[0] = 3
    expect(permissions.toString()).toBe(expected.toString())
  })

  it('delegation verify', async () => {
    nodes = {
      success: new DelegationNode({
        id: 'success',
        rootId: 'myRootId',
        account: identityAlice.address,
        permissions: [],
        parentId: undefined,
        revoked: false,
      }),
      failure: {
        ...nodes.success,
        revoked: true,
        id: 'failure',
      } as DelegationNode,
    }

    expect(
      await new DelegationNode({
        id: 'success',
        rootId: 'myRootId',
        account: identityAlice.address,
        permissions: [],
        parentId: undefined,
        revoked: false,
      }).verify()
    ).toBe(true)

    expect(
      await new DelegationNode({
        id: 'failure',
        rootId: 'myRootId',
        account: identityAlice.address,
        permissions: [],
        parentId: undefined,
        revoked: false,
      }).verify()
    ).toBe(false)
  })

  it('get delegation root', async () => {
    rootNodes = {
      rootNodeId: new DelegationRootNode({
        id: 'rootNodeId',
        cTypeHash:
          '0x1234000000000000000000000000000000000000000000000000000000000000',
        account: identityAlice.address,
        revoked: false,
      }),
    }

    const node: DelegationNode = new DelegationNode({
      id: 'nodeId',
      rootId: 'rootNodeId',
      account: identityAlice.address,
      permissions: [],
      revoked: false,
    })
    const rootNode = await node.getRoot()

    expect(rootNode).toBeDefined()
    expect(rootNode.cTypeHash).toBe(
      '0x1234000000000000000000000000000000000000000000000000000000000000'
    )
  })
})

describe('count subtree', () => {
  let topNode: DelegationNode

  beforeAll(() => {
    topNode = new DelegationNode({
      id: 'a1',
      rootId,
      account: identityAlice.address,
      permissions: [Permission.ATTEST, Permission.DELEGATE],
      revoked: false,
    })

    nodes = {
      b1: new DelegationNode({
        id: 'b1',
        rootId,
        account: identityAlice.address,
        permissions: [Permission.ATTEST, Permission.DELEGATE],
        parentId: 'a1',
        revoked: false,
      }),
      b2: new DelegationNode({
        id: 'b2',
        rootId,
        account: identityAlice.address,
        permissions: [Permission.ATTEST, Permission.DELEGATE],
        parentId: 'a1',
        revoked: false,
      }),
      c1: new DelegationNode({
        id: 'c1',
        rootId,
        account: identityAlice.address,
        permissions: [Permission.ATTEST, Permission.DELEGATE],
        parentId: 'b1',
        revoked: false,
      }),
      c2: new DelegationNode({
        id: 'c2',
        rootId,
        account: identityAlice.address,
        permissions: [Permission.ATTEST, Permission.DELEGATE],
        parentId: 'b1',
        revoked: false,
      }),
      d1: new DelegationNode({
        id: 'd1',
        rootId,
        account: identityAlice.address,
        permissions: [Permission.ATTEST, Permission.DELEGATE],
        parentId: 'c1',
        revoked: false,
      }),
    }
    childMap = {
      a1: [nodes.b1, nodes.b2],
      b1: [nodes.c1, nodes.c2],
      c1: [nodes.d1],
    }
  })

  it('mocks work', async () => {
    expect(topNode.id).toEqual('a1')
    await expect(topNode.getChildren()).resolves.toBe(childMap.a1)
    await expect(nodes.d1.getChildren()).resolves.toStrictEqual([])
  })

  it('counts all subnodes', async () => {
    await expect(topNode.subtreeNodeCount()).resolves.toStrictEqual(5)
  })

  it('counts smaller subtrees', async () => {
    await expect(nodes.b2.subtreeNodeCount()).resolves.toStrictEqual(0)
    await expect(nodes.b1.subtreeNodeCount()).resolves.toStrictEqual(3)
    await expect(nodes.c1.subtreeNodeCount()).resolves.toStrictEqual(1)
    await expect(nodes.c2.subtreeNodeCount()).resolves.toStrictEqual(0)
    await expect(nodes.d1.subtreeNodeCount()).resolves.toStrictEqual(0)
  })

  it('counts all subnodes in deeply nested childMap (100)', async () => {
    childMap = {}
    // eslint-disable-next-line
    for (let index = 0; index < 101; index++) {
      childMap[`${index}`] = [
        new DelegationNode({
          id: `${index + 1}`,
          rootId,
          account: identityAlice.address,
          permissions: [],
          parentId: `${index}`,
          revoked: false,
        }),
      ]
    }
    await expect(childMap['0'][0].subtreeNodeCount()).resolves.toStrictEqual(
      100
    )
  })

  it('counts all subnodes in deeply nested childMap (1000)', async () => {
    childMap = {}
    // eslint-disable-next-line
    for (let index = 0; index < 1001; index++) {
      childMap[`${index}`] = [
        new DelegationNode({
          id: `${index + 1}`,
          rootId,
          account: identityAlice.address,
          permissions: [],
          parentId: `${index}`,
          revoked: false,
        }),
      ]
    }
    await expect(childMap['0'][0].subtreeNodeCount()).resolves.toStrictEqual(
      1000
    )
  })

  it('counts all subnodes in deeply nested childMap (10000)', async () => {
    childMap = {}
    // eslint-disable-next-line
    for (let index = 0; index < 10001; index++) {
      childMap[`${index}`] = [
        new DelegationNode({
          id: `${index + 1}`,
          rootId,
          account: identityAlice.address,
          permissions: [],
          parentId: `${index}`,
          revoked: false,
        }),
      ]
    }
    await expect(childMap['0'][0].subtreeNodeCount()).resolves.toStrictEqual(
      10000
    )
  })
})

describe('count depth', () => {
  beforeAll(() => {
    nodes = {}
    // eslint-disable-next-line
    for (let index = 0; index < 1000; index++) {
      nodes[`${index}`] = new DelegationNode({
        id: `${index}`,
        rootId,
        account: encodeAddress(Crypto.hash(`${index}`, 256)),
        permissions: [Permission.DELEGATE],
        parentId: `${index + 1}`,
        revoked: false,
      })
    }
    expect(Object.keys(nodes)).toHaveLength(1000)
  })

  it('counts steps from last child till select parent', async () => {
    await Promise.all(
      [0, 1, 5, 10, 75, 100, 300, 500, 999].map((i) =>
        expect(
          nodes['0'].findAncestorOwnedBy(nodes[`${i}`].account)
        ).resolves.toMatchObject({ steps: i, node: nodes[`${i}`] })
      )
    )
  })

  it('counts various distances within the hierarchy', async () => {
    await Promise.all([
      expect(
        nodes['10'].findAncestorOwnedBy(nodes['20'].account)
      ).resolves.toMatchObject({ steps: 10, node: nodes['20'] }),
      expect(
        nodes['250'].findAncestorOwnedBy(nodes['450'].account)
      ).resolves.toMatchObject({ steps: 200, node: nodes['450'] }),
      expect(
        nodes['800'].findAncestorOwnedBy(nodes['850'].account)
      ).resolves.toMatchObject({ steps: 50, node: nodes['850'] }),
      expect(
        nodes['5'].findAncestorOwnedBy(nodes['995'].account)
      ).resolves.toMatchObject({ steps: 990, node: nodes['995'] }),
    ])
  })

  it('returns null if trying to count backwards', async () => {
    await Promise.all([
      expect(
        nodes['10'].findAncestorOwnedBy(nodes['5'].account)
      ).resolves.toMatchObject({
        steps: 989,
        node: null,
      }),
      expect(
        nodes['99'].findAncestorOwnedBy(nodes['95'].account)
      ).resolves.toMatchObject({ steps: 900, node: null }),
      expect(
        nodes['900'].findAncestorOwnedBy(nodes['500'].account)
      ).resolves.toMatchObject({ steps: 99, node: null }),
    ])
  })

  it('returns null if looking for non-existent account', async () => {
    const noOnesAddress = encodeAddress(Crypto.hash('-1', 256))
    await Promise.all([
      expect(
        nodes['10'].findAncestorOwnedBy(noOnesAddress)
      ).resolves.toMatchObject({
        steps: 989,
        node: null,
      }),
      expect(
        nodes['99'].findAncestorOwnedBy(noOnesAddress)
      ).resolves.toMatchObject({
        steps: 900,
        node: null,
      }),
      expect(
        nodes['900'].findAncestorOwnedBy(noOnesAddress)
      ).resolves.toMatchObject({
        steps: 99,
        node: null,
      }),
    ])
  })
})
