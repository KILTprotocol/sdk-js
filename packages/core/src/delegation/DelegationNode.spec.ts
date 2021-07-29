/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/delegation
 */

/* eslint-disable @typescript-eslint/ban-ts-comment */

import {
  IDelegationNode,
  IDelegationHierarchyDetails,
  Permission,
} from '@kiltprotocol/types'
import { encodeAddress } from '@polkadot/keyring'
import { Crypto, SDKErrors } from '@kiltprotocol/utils'
import Identity from '../identity'
import DelegationNode from './DelegationNode'
import { permissionsAsBitset, errorCheck } from './DelegationNode.utils'

let hierarchiesDetails: Record<string, IDelegationHierarchyDetails> = {}
let nodes: Record<string, DelegationNode> = {}

jest.mock('./DelegationNode.chain', () => {
  return {
    getChildren: jest.fn(async (node: DelegationNode) =>
      node.childrenIds.map((id) => nodes[id] || null)
    ),
    query: jest.fn(async (id: string) => nodes[id] || null),
  }
})

jest.mock('./DelegationHierarchyDetails.chain', () => ({
  query: jest.fn(async (id: string) => hierarchiesDetails[id] || null),
}))

let identityAlice: Identity
let identityBob: Identity
let id: string
let successId: string
let failureId: string
let hierarchyId: string
let parentId: string
let hashList: string[]
let addresses: string[]

beforeAll(() => {
  identityAlice = Identity.buildFromURI('//Alice')
  identityBob = Identity.buildFromURI('//Bob')
  successId = Crypto.hashStr('success')
  hierarchyId = Crypto.hashStr('rootId')
  id = Crypto.hashStr('id')
  parentId = Crypto.hashStr('parentId')
  failureId = Crypto.hashStr('failure')
  hashList = Array(10002)
    .fill('')
    .map<string>((_val, index) => Crypto.hashStr(`${index + 1}`))
  addresses = Array(10002)
    .fill('')
    .map<string>((_val, index) =>
      encodeAddress(Crypto.hash(`${index}`, 256), 38)
    )
})

describe('Delegation', () => {
  it('delegation generate hash', () => {
    const node = new DelegationNode({
      id,
      hierarchyId,
      parentId,
      account: identityBob.address,
      childrenIds: [],
      permissions: [Permission.DELEGATE],
      revoked: false,
    })
    const hash: string = node.generateHash()
    expect(hash).toBe(
      '0x3f3dc0df7527013f2373f18f55cf87847df3249526e9b1d5aa75df8eeb5b7d6e'
    )
  })

  it('delegation permissionsAsBitset', () => {
    const node = new DelegationNode({
      id,
      hierarchyId,
      parentId,
      account: identityBob.address,
      childrenIds: [],
      permissions: [Permission.DELEGATE],
      revoked: false,
    })
    const permissions: Uint8Array = permissionsAsBitset(node)
    const expected: Uint8Array = new Uint8Array(4)
    expected[0] = 2
    expect(permissions.toString()).toBe(expected.toString())
  })

  it('delegation verify', async () => {
    nodes = {
      [successId]: new DelegationNode({
        id: successId,
        hierarchyId,
        account: identityAlice.address,
        childrenIds: [],
        permissions: [Permission.DELEGATE],
        parentId: undefined,
        revoked: false,
      }),
      [failureId]: {
        ...nodes.success,
        revoked: true,
        id: failureId,
      } as DelegationNode,
    }

    expect(
      await new DelegationNode({
        id: successId,
        hierarchyId,
        account: identityAlice.address,
        childrenIds: [],
        permissions: [Permission.DELEGATE],
        parentId: undefined,
        revoked: false,
      }).verify()
    ).toBe(true)

    expect(
      await new DelegationNode({
        id: failureId,
        hierarchyId,
        account: identityAlice.address,
        childrenIds: [],
        permissions: [Permission.DELEGATE],
        parentId: undefined,
        revoked: false,
      }).verify()
    ).toBe(false)
  })

  it('get delegation root', async () => {
    hierarchiesDetails = {
      [hierarchyId]: {
        cTypeHash:
          'kilt:ctype:0xba15bf4960766b0a6ad7613aa3338edce95df6b22ed29dd72f6e72d740829b84',
      },
    }

    nodes = {
      [hierarchyId]: new DelegationNode({
        id: hierarchyId,
        hierarchyId,
        account: identityAlice.address,
        childrenIds: [],
        permissions: [Permission.DELEGATE],
        revoked: false,
      }),
    }

    const node: DelegationNode = new DelegationNode({
      id,
      hierarchyId,
      account: identityAlice.address,
      childrenIds: [],
      permissions: [Permission.DELEGATE],
      revoked: false,
    })
    const hierarchyDetails = await node.getHierarchyDetails()

    expect(hierarchyDetails).toBeDefined()
    expect(hierarchyDetails.cTypeHash).toBe(
      'kilt:ctype:0xba15bf4960766b0a6ad7613aa3338edce95df6b22ed29dd72f6e72d740829b84'
    )
  })
})

describe('count subtree', () => {
  let topNode: DelegationNode
  const a1: string = Crypto.hashStr('a1')
  const b1: string = Crypto.hashStr('b1')
  const b2: string = Crypto.hashStr('b2')
  const c1: string = Crypto.hashStr('c1')
  const c2: string = Crypto.hashStr('c2')
  const d1: string = Crypto.hashStr('d1')
  beforeAll(() => {
    topNode = new DelegationNode({
      id: a1,
      hierarchyId,
      account: identityAlice.address,
      childrenIds: [b1, b2],
      permissions: [Permission.ATTEST, Permission.DELEGATE],
      revoked: false,
    })

    nodes = {
      [a1]: topNode,
      [b1]: new DelegationNode({
        id: b1,
        hierarchyId,
        account: identityAlice.address,
        permissions: [Permission.ATTEST, Permission.DELEGATE],
        parentId: a1,
        childrenIds: [c1, c2],
        revoked: false,
      }),
      [b2]: new DelegationNode({
        id: b2,
        hierarchyId,
        account: identityAlice.address,
        childrenIds: [],
        permissions: [Permission.ATTEST, Permission.DELEGATE],
        parentId: a1,
        revoked: false,
      }),
      [c1]: new DelegationNode({
        id: c1,
        hierarchyId,
        account: identityAlice.address,
        childrenIds: [d1],
        permissions: [Permission.ATTEST, Permission.DELEGATE],
        parentId: b1,
        revoked: false,
      }),
      [c2]: new DelegationNode({
        id: c2,
        hierarchyId,
        account: identityAlice.address,
        childrenIds: [],
        permissions: [Permission.ATTEST, Permission.DELEGATE],
        parentId: b1,
        revoked: false,
      }),
      [d1]: new DelegationNode({
        id: d1,
        hierarchyId,
        account: identityAlice.address,
        childrenIds: [],
        permissions: [Permission.ATTEST, Permission.DELEGATE],
        parentId: c1,
        revoked: false,
      }),
    }
  })

  it('mocks work', async () => {
    expect(topNode.id).toEqual(a1)
    await expect(
      topNode.getChildren().then((children) => {
        return children.map((childNode) => childNode.id)
      })
    ).resolves.toStrictEqual(topNode.childrenIds)
    await expect(nodes[d1].getChildren()).resolves.toStrictEqual([])
  })

  it('counts all subnodes', async () => {
    await expect(topNode.subtreeNodeCount()).resolves.toStrictEqual(5)
  })

  it('counts smaller subtrees', async () => {
    await expect(nodes[b2].subtreeNodeCount()).resolves.toStrictEqual(0)
    await expect(nodes[b1].subtreeNodeCount()).resolves.toStrictEqual(3)
    await expect(nodes[c1].subtreeNodeCount()).resolves.toStrictEqual(1)
    await expect(nodes[c2].subtreeNodeCount()).resolves.toStrictEqual(0)
    await expect(nodes[d1].subtreeNodeCount()).resolves.toStrictEqual(0)
  })

  it('counts all subnodes in deeply nested structure (100)', async () => {
    const lastIndex = 100
    nodes = hashList
      .slice(0, lastIndex + 1)
      .reduce((previous, current, index) => {
        return {
          ...previous,
          [current]: new DelegationNode({
            id: current,
            hierarchyId,
            account: identityAlice.address,
            permissions: [Permission.DELEGATE],
            childrenIds: index < lastIndex ? [hashList[index + 1]] : [],
            parentId: hashList[index - 1],
            revoked: false,
          }),
        }
      }, {})
    await expect(nodes[hashList[0]].subtreeNodeCount()).resolves.toStrictEqual(
      100
    )
  })

  it('counts all subnodes in deeply nested structure (1000)', async () => {
    const lastIndex = 1000
    nodes = hashList
      .slice(0, lastIndex + 1)
      .reduce((previous, current, index) => {
        return {
          ...previous,
          [current]: new DelegationNode({
            id: current,
            hierarchyId,
            account: identityAlice.address,
            permissions: [Permission.DELEGATE],
            childrenIds: index < lastIndex ? [hashList[index + 1]] : [],
            parentId: hashList[index - 1],
            revoked: false,
          }),
        }
      }, {})
    await expect(nodes[hashList[0]].subtreeNodeCount()).resolves.toStrictEqual(
      1000
    )
  })

  it('counts all subnodes in deeply nested structure (10000)', async () => {
    const lastIndex = 10000
    nodes = hashList
      .slice(0, lastIndex + 1)
      .reduce((previous, current, index) => {
        return {
          ...previous,
          [current]: new DelegationNode({
            id: current,
            hierarchyId,
            account: identityAlice.address,
            permissions: [Permission.DELEGATE],
            childrenIds: index < lastIndex ? [hashList[index + 1]] : [],
            parentId: hashList[index - 1],
            revoked: false,
          }),
        }
      }, {})
    await expect(nodes[hashList[0]].subtreeNodeCount()).resolves.toStrictEqual(
      10000
    )
  })
})

describe('count depth', () => {
  beforeAll(() => {
    nodes = hashList
      .slice(0, 1000)
      .map(
        (nodeId, index) =>
          new DelegationNode({
            id: nodeId,
            hierarchyId,
            account: addresses[index],
            permissions: [Permission.DELEGATE],
            childrenIds: [],
            parentId: hashList[index + 1],
            revoked: false,
          })
      )
      .reduce((result, node) => {
        return {
          ...result,
          [node.id]: node,
        }
      }, {})

    expect(Object.keys(nodes)).toHaveLength(1000)
  })

  it('counts steps from last child till select parent', async () => {
    await Promise.all(
      [0, 1, 5, 10, 75, 100, 300, 500, 999].map((i) =>
        expect(
          nodes[hashList[0]].findAncestorOwnedBy(nodes[hashList[i]].account)
        ).resolves.toMatchObject({
          steps: i,
          node: nodes[hashList[i]],
        })
      )
    )
  })

  it('counts various distances within the hierarchy', async () => {
    await Promise.all([
      expect(
        nodes[hashList[1]].findAncestorOwnedBy(nodes[hashList[2]].account)
      ).resolves.toMatchObject({
        steps: 1,
        node: nodes[hashList[2]],
      }),
      expect(
        nodes[hashList[250]].findAncestorOwnedBy(nodes[hashList[450]].account)
      ).resolves.toMatchObject({ steps: 200, node: nodes[hashList[450]] }),
      expect(
        nodes[hashList[800]].findAncestorOwnedBy(nodes[hashList[850]].account)
      ).resolves.toMatchObject({
        steps: 50,
        node: nodes[hashList[850]],
      }),
      expect(
        nodes[hashList[5]].findAncestorOwnedBy(nodes[hashList[955]].account)
      ).resolves.toMatchObject({
        steps: 950,
        node: nodes[hashList[955]],
      }),
    ])
  })

  it('returns null if trying to count backwards', async () => {
    await Promise.all([
      expect(
        nodes[hashList[10]].findAncestorOwnedBy(nodes[hashList[5]].account)
      ).resolves.toMatchObject({
        steps: 989,
        node: null,
      }),
      expect(
        nodes[hashList[99]].findAncestorOwnedBy(nodes[hashList[95]].account)
      ).resolves.toMatchObject({ steps: 900, node: null }),
      expect(
        nodes[hashList[900]].findAncestorOwnedBy(nodes[hashList[500]].account)
      ).resolves.toMatchObject({ steps: 99, node: null }),
    ])
  })

  it('returns null if looking for non-existent account', async () => {
    const noOnesAddress = encodeAddress(Crypto.hash('-1', 256), 38)
    await Promise.all([
      expect(
        nodes[hashList[10]].findAncestorOwnedBy(noOnesAddress)
      ).resolves.toMatchObject({
        steps: 989,
        node: null,
      }),
      expect(
        nodes[hashList[99]].findAncestorOwnedBy(noOnesAddress)
      ).resolves.toMatchObject({
        steps: 900,
        node: null,
      }),
      expect(
        nodes[hashList[900]].findAncestorOwnedBy(noOnesAddress)
      ).resolves.toMatchObject({
        steps: 99,
        node: null,
      }),
    ])
  })

  it('error check should throw errors on faulty delegation nodes', async () => {
    const malformedPremissionsDelegationNode = {
      id,
      hierarchyId,
      account: identityAlice.address,
      childrenIds: [],
      permissions: [],
      parentId: undefined,
      revoked: false,
    } as IDelegationNode

    const missingRootIdDelegationNode = {
      id,
      hierarchyId,
      account: identityAlice.address,
      permissions: [Permission.DELEGATE],
      parentId: undefined,
      revoked: false,
    } as IDelegationNode

    // @ts-expect-error
    delete missingRootIdDelegationNode.hierarchyId

    const malformedRootIdDelegationNode = {
      id,
      hierarchyId: hierarchyId.slice(13) + hierarchyId.slice(15),
      account: identityAlice.address,
      permissions: [Permission.DELEGATE],
      parentId: undefined,
      revoked: false,
    } as IDelegationNode

    const malformedParentIdDelegationNode = {
      id,
      hierarchyId,
      account: identityAlice.address,
      permissions: [Permission.DELEGATE],
      parentId: 'malformed',
      revoked: false,
    } as IDelegationNode

    expect(() => errorCheck(malformedPremissionsDelegationNode)).toThrowError(
      SDKErrors.ERROR_UNAUTHORIZED(
        'Must have at least one permission and no more then two'
      )
    )

    expect(() => errorCheck(missingRootIdDelegationNode)).toThrowError(
      SDKErrors.ERROR_DELEGATION_ID_MISSING()
    )

    expect(() => errorCheck(malformedRootIdDelegationNode)).toThrowError(
      SDKErrors.ERROR_DELEGATION_ID_TYPE()
    )

    expect(() => errorCheck(malformedParentIdDelegationNode)).toThrowError(
      SDKErrors.ERROR_DELEGATION_ID_TYPE()
    )
  })
})
