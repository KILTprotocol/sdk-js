/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/delegation
 */

import {
  IDelegationNode,
  IDelegationHierarchyDetails,
  Permission,
  DidUri,
  CTypeHash,
} from '@kiltprotocol/types'
import { encodeAddress } from '@polkadot/keyring'
import { ApiMocks } from '@kiltprotocol/testing'
import { ConfigService } from '@kiltprotocol/config'
import { Crypto, SDKErrors, ss58Format } from '@kiltprotocol/utils'
import { DelegationNode } from './DelegationNode'
import { permissionsAsBitset, errorCheck } from './DelegationNode.utils'

let mockedApi: any

beforeAll(() => {
  mockedApi = ApiMocks.getMockedApi()
  ConfigService.set({ api: mockedApi })
})

let hierarchiesDetails: Record<string, IDelegationHierarchyDetails> = {}
let nodes: Record<string, DelegationNode> = {}

jest.mock('./DelegationNode.chain', () => ({
  getChildren: jest.fn(async (node: DelegationNode) =>
    node.childrenIds.map((id) => (id in nodes ? nodes[id] : null))
  ),
  fetch: jest.fn(async (id: string) => (id in nodes ? nodes[id] : null)),
}))

jest.mock('./DelegationHierarchyDetails.chain', () => ({
  fetch: jest.fn(async (id: string) =>
    id in hierarchiesDetails ? hierarchiesDetails[id] : null
  ),
}))

const didAlice = 'did:kilt:4p6K4tpdZtY3rNqM2uorQmsS6d3woxtnWMHjtzGftHmDb41N'
const didBob = 'did:kilt:4rDeMGr3Hi4NfxRUp8qVyhvgW3BSUBLneQisGa9ASkhh2sXB'

describe('DelegationNode', () => {
  let id: string
  let successId: string
  let failureId: string
  let hierarchyId: string
  let parentId: string
  let hashList: string[]
  let addresses: DidUri[]

  beforeAll(() => {
    jest
      .mocked(mockedApi.tx.delegation.revokeDelegation)
      .mockImplementation((nodeId: IDelegationNode['id']) => {
        nodes[nodeId] = new DelegationNode({
          ...nodes[nodeId],
          childrenIds: nodes[nodeId].childrenIds,
          revoked: true,
        })
      })
    jest
      .mocked(mockedApi.tx.delegation.createHierarchy)
      .mockImplementation(async (nodeId: string, cTypeHash: CTypeHash) => {
        hierarchiesDetails[nodeId] = {
          id: nodeId,
          cTypeHash,
        }
      })

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
      .map<DidUri>(
        (_val, index) =>
          `did:kilt:${encodeAddress(Crypto.hash(`${index}`, 256), ss58Format)}`
      )
  })

  describe('Delegation', () => {
    it('delegation generate hash', () => {
      const node = new DelegationNode({
        id,
        hierarchyId,
        parentId,
        account: didBob,
        childrenIds: [],
        permissions: [Permission.DELEGATE],
        revoked: false,
      })
      const hash = node.generateHash()
      expect(Crypto.u8aToHex(hash)).toBe(
        '0x3f3dc0df7527013f2373f18f55cf87847df3249526e9b1d5aa75df8eeb5b7d6e'
      )
    })

    it('delegation permissionsAsBitset', () => {
      const node = new DelegationNode({
        id,
        hierarchyId,
        parentId,
        account: didBob,
        childrenIds: [],
        permissions: [Permission.DELEGATE],
        revoked: false,
      })
      const permissions = permissionsAsBitset(node)
      const expected = new Uint8Array(4)
      expected[0] = 2
      expect(permissions.toString()).toBe(expected.toString())
    })

    it('delegation verify', async () => {
      nodes = {
        [successId]: new DelegationNode({
          id: successId,
          hierarchyId,
          account: didAlice,
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

      await expect(
        new DelegationNode({
          id: successId,
          hierarchyId,
          account: didAlice,
          childrenIds: [],
          permissions: [Permission.DELEGATE],
          parentId: undefined,
          revoked: false,
        }).verify()
      ).resolves.not.toThrow()

      await expect(
        new DelegationNode({
          id: failureId,
          hierarchyId,
          account: didAlice,
          childrenIds: [],
          permissions: [Permission.DELEGATE],
          parentId: undefined,
          revoked: false,
        }).verify()
      ).rejects.toThrow()
    })

    it('get delegation root', async () => {
      hierarchiesDetails = {
        [hierarchyId]: {
          id: hierarchyId,
          cTypeHash:
            '0xba15bf4960766b0a6ad7613aa3338edce95df6b22ed29dd72f6e72d740829b84',
        },
      }

      nodes = {
        [hierarchyId]: new DelegationNode({
          id: hierarchyId,
          hierarchyId,
          account: didAlice,
          childrenIds: [],
          permissions: [Permission.DELEGATE],
          revoked: false,
        }),
      }

      const node = new DelegationNode({
        id,
        hierarchyId,
        account: didAlice,
        childrenIds: [],
        permissions: [Permission.DELEGATE],
        revoked: false,
      })
      const hierarchyDetails = await node.getHierarchyDetails()

      expect(hierarchyDetails).toBeDefined()
      expect(hierarchyDetails.cTypeHash).toBe(
        '0xba15bf4960766b0a6ad7613aa3338edce95df6b22ed29dd72f6e72d740829b84'
      )
    })
  })

  describe('count subtree', () => {
    let topNode: DelegationNode
    const a1 = Crypto.hashStr('a1')
    const b1 = Crypto.hashStr('b1')
    const b2 = Crypto.hashStr('b2')
    const c1 = Crypto.hashStr('c1')
    const c2 = Crypto.hashStr('c2')
    const d1 = Crypto.hashStr('d1')
    beforeAll(() => {
      topNode = new DelegationNode({
        id: a1,
        hierarchyId,
        account: didAlice,
        childrenIds: [b1, b2],
        permissions: [Permission.ATTEST, Permission.DELEGATE],
        revoked: false,
      })

      nodes = {
        [a1]: topNode,
        [b1]: new DelegationNode({
          id: b1,
          hierarchyId,
          account: didAlice,
          permissions: [Permission.ATTEST, Permission.DELEGATE],
          parentId: a1,
          childrenIds: [c1, c2],
          revoked: false,
        }),
        [b2]: new DelegationNode({
          id: b2,
          hierarchyId,
          account: didAlice,
          childrenIds: [],
          permissions: [Permission.ATTEST, Permission.DELEGATE],
          parentId: a1,
          revoked: false,
        }),
        [c1]: new DelegationNode({
          id: c1,
          hierarchyId,
          account: didAlice,
          childrenIds: [d1],
          permissions: [Permission.ATTEST, Permission.DELEGATE],
          parentId: b1,
          revoked: false,
        }),
        [c2]: new DelegationNode({
          id: c2,
          hierarchyId,
          account: didAlice,
          childrenIds: [],
          permissions: [Permission.ATTEST, Permission.DELEGATE],
          parentId: b1,
          revoked: false,
        }),
        [d1]: new DelegationNode({
          id: d1,
          hierarchyId,
          account: didAlice,
          childrenIds: [],
          permissions: [Permission.ATTEST, Permission.DELEGATE],
          parentId: c1,
          revoked: false,
        }),
      }
    })

    it('mocks work', async () => {
      expect(topNode.id).toEqual(a1)
      const children = await topNode.getChildren()
      const ids = children.map((childNode) => childNode.id)

      expect(ids).toStrictEqual(topNode.childrenIds)
      expect(await nodes[d1].getChildren()).toStrictEqual([])
    })

    it('counts all subnodes', async () => {
      expect(await topNode.subtreeNodeCount()).toStrictEqual(5)
    })

    it('counts smaller subtrees', async () => {
      expect(await nodes[b2].subtreeNodeCount()).toStrictEqual(0)
      expect(await nodes[b1].subtreeNodeCount()).toStrictEqual(3)
      expect(await nodes[c1].subtreeNodeCount()).toStrictEqual(1)
      expect(await nodes[c2].subtreeNodeCount()).toStrictEqual(0)
      expect(await nodes[d1].subtreeNodeCount()).toStrictEqual(0)
    })

    it('counts all subnodes in deeply nested structure (100)', async () => {
      const lastIndex = 100
      nodes = hashList.slice(0, lastIndex + 1).reduce(
        (previous, current, index) => ({
          ...previous,
          [current]: new DelegationNode({
            id: current,
            hierarchyId,
            account: didAlice,
            permissions: [Permission.DELEGATE],
            childrenIds: index < lastIndex ? [hashList[index + 1]] : [],
            parentId: hashList[index - 1],
            revoked: false,
          }),
        }),
        {}
      )
      expect(await nodes[hashList[0]].subtreeNodeCount()).toStrictEqual(100)
    })

    it('counts all subnodes in deeply nested structure (1000)', async () => {
      const lastIndex = 1000
      nodes = hashList.slice(0, lastIndex + 1).reduce(
        (previous, current, index) => ({
          ...previous,
          [current]: new DelegationNode({
            id: current,
            hierarchyId,
            account: didAlice,
            permissions: [Permission.DELEGATE],
            childrenIds: index < lastIndex ? [hashList[index + 1]] : [],
            parentId: hashList[index - 1],
            revoked: false,
          }),
        }),
        {}
      )
      expect(await nodes[hashList[0]].subtreeNodeCount()).toStrictEqual(1000)
    })

    it('counts all subnodes in deeply nested structure (10000)', async () => {
      const lastIndex = 10000
      nodes = hashList.slice(0, lastIndex + 1).reduce(
        (previous, current, index) => ({
          ...previous,
          [current]: new DelegationNode({
            id: current,
            hierarchyId,
            account: didAlice,
            permissions: [Permission.DELEGATE],
            childrenIds: index < lastIndex ? [hashList[index + 1]] : [],
            parentId: hashList[index - 1],
            revoked: false,
          }),
        }),
        {}
      )
      expect(await nodes[hashList[0]].subtreeNodeCount()).toStrictEqual(10000)
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
        .reduce(
          (result, node) => ({
            ...result,
            [node.id]: node,
          }),
          {}
        )

      expect(Object.keys(nodes)).toHaveLength(1000)
    })

    it('counts steps from last child till select parent', async () => {
      await Promise.all(
        [0, 1, 5, 10, 75, 100, 300, 500, 999].map(async (i) =>
          expect(
            await nodes[hashList[0]].findAncestorOwnedBy(
              nodes[hashList[i]].account
            )
          ).toMatchObject({
            steps: i,
            node: nodes[hashList[i]],
          })
        )
      )
    })

    it('counts various distances within the hierarchy', async () => {
      expect(
        await nodes[hashList[1]].findAncestorOwnedBy(nodes[hashList[2]].account)
      ).toMatchObject({
        steps: 1,
        node: nodes[hashList[2]],
      })
      expect(
        await nodes[hashList[250]].findAncestorOwnedBy(
          nodes[hashList[450]].account
        )
      ).toMatchObject({ steps: 200, node: nodes[hashList[450]] })
      expect(
        await nodes[hashList[800]].findAncestorOwnedBy(
          nodes[hashList[850]].account
        )
      ).toMatchObject({
        steps: 50,
        node: nodes[hashList[850]],
      })
      expect(
        await nodes[hashList[5]].findAncestorOwnedBy(
          nodes[hashList[955]].account
        )
      ).toMatchObject({
        steps: 950,
        node: nodes[hashList[955]],
      })
    })

    it('returns null if trying to count backwards', async () => {
      expect(
        await nodes[hashList[10]].findAncestorOwnedBy(
          nodes[hashList[5]].account
        )
      ).toMatchObject({
        steps: 989,
        node: null,
      })
      expect(
        await nodes[hashList[99]].findAncestorOwnedBy(
          nodes[hashList[95]].account
        )
      ).toMatchObject({ steps: 900, node: null })
      expect(
        await nodes[hashList[900]].findAncestorOwnedBy(
          nodes[hashList[500]].account
        )
      ).toMatchObject({ steps: 99, node: null })
    })

    it('returns null if looking for non-existent account', async () => {
      const noOnesAddress: DidUri = `did:kilt:${encodeAddress(
        Crypto.hash('-1', 256),
        ss58Format
      )}`
      expect(
        await nodes[hashList[10]].findAncestorOwnedBy(noOnesAddress)
      ).toMatchObject({
        steps: 989,
        node: null,
      })
      expect(
        await nodes[hashList[99]].findAncestorOwnedBy(noOnesAddress)
      ).toMatchObject({
        steps: 900,
        node: null,
      })
      expect(
        await nodes[hashList[900]].findAncestorOwnedBy(noOnesAddress)
      ).toMatchObject({
        steps: 99,
        node: null,
      })
    })

    it('error check should throw errors on faulty delegation nodes', async () => {
      const malformedPermissionsDelegationNode = {
        id,
        hierarchyId,
        account: didAlice,
        childrenIds: [],
        permissions: [],
        parentId: undefined,
        revoked: false,
      } as IDelegationNode

      const missingRootIdDelegationNode = {
        id,
        hierarchyId,
        account: didAlice,
        permissions: [Permission.DELEGATE],
        parentId: undefined,
        revoked: false,
        childrenIds: [],
      } as IDelegationNode

      // @ts-expect-error
      delete missingRootIdDelegationNode.hierarchyId

      const malformedRootIdDelegationNode = {
        id,
        hierarchyId: hierarchyId.slice(13) + hierarchyId.slice(15),
        account: didAlice,
        permissions: [Permission.DELEGATE],
        parentId: undefined,
        revoked: false,
        childrenIds: [],
      } as IDelegationNode

      const malformedParentIdDelegationNode = {
        id,
        hierarchyId,
        account: didAlice,
        permissions: [Permission.DELEGATE],
        parentId: 'malformed',
        revoked: false,
        childrenIds: [],
      } as IDelegationNode

      expect(() => errorCheck(malformedPermissionsDelegationNode)).toThrowError(
        SDKErrors.UnauthorizedError
      )

      expect(() => errorCheck(missingRootIdDelegationNode)).toThrowError(
        SDKErrors.DelegationIdMissingError
      )

      expect(() => errorCheck(malformedRootIdDelegationNode)).toThrowError(
        SDKErrors.DelegationIdTypeError
      )

      expect(() => errorCheck(malformedParentIdDelegationNode)).toThrowError(
        SDKErrors.DelegationIdTypeError
      )
    })
  })
})

describe('DelegationHierarchy', () => {
  let ctypeHash: CTypeHash
  let ROOT_IDENTIFIER: string
  let ROOT_SUCCESS: string

  beforeAll(async () => {
    ctypeHash = `0x6b696c743a63747970653a307830303031000000000000000000000000000000`
    ROOT_IDENTIFIER = Crypto.hashStr('1')
    ROOT_SUCCESS = Crypto.hashStr('success')

    const revokedRootDelegationNode = new DelegationNode({
      account: didAlice,
      childrenIds: [],
      hierarchyId: ROOT_IDENTIFIER,
      id: ROOT_IDENTIFIER,
      permissions: [Permission.DELEGATE],
      revoked: true,
    })
    const notRevokedRootDelegationNode = new DelegationNode({
      account: didAlice,
      childrenIds: [],
      hierarchyId: ROOT_SUCCESS,
      id: ROOT_SUCCESS,
      permissions: [Permission.DELEGATE],
      revoked: false,
    })

    nodes = {
      [ROOT_IDENTIFIER]: revokedRootDelegationNode,
      [ROOT_SUCCESS]: notRevokedRootDelegationNode,
    }

    hierarchiesDetails = {
      [ROOT_IDENTIFIER]: { id: ROOT_IDENTIFIER, cTypeHash: ctypeHash },
      [ROOT_SUCCESS]: { id: ROOT_SUCCESS, cTypeHash: ctypeHash },
    }
  })

  it('stores root delegation', async () => {
    const rootDelegation = new DelegationNode({
      account: didAlice,
      childrenIds: [],
      hierarchyId: ROOT_IDENTIFIER,
      id: ROOT_IDENTIFIER,
      permissions: [Permission.DELEGATE],
      revoked: false,
    })
    await rootDelegation.getStoreTx()

    const rootNode = await DelegationNode.fetch(ROOT_IDENTIFIER)
    expect(rootNode.id).toBe(ROOT_IDENTIFIER)
  })

  it('fetch root delegation', async () => {
    const queriedDelegation = await DelegationNode.fetch(ROOT_IDENTIFIER)
    expect(queriedDelegation.account).toBe(didAlice)
    expect(await queriedDelegation.getCTypeHash()).toBe(ctypeHash)
    expect(queriedDelegation.id).toBe(ROOT_IDENTIFIER)
  })

  it('root delegation verify', async () => {
    const aDelegationRootNode = new DelegationNode({
      account: didAlice,
      childrenIds: [],
      hierarchyId: ROOT_IDENTIFIER,
      id: ROOT_IDENTIFIER,
      permissions: [Permission.DELEGATE],
      revoked: false,
    })
    await aDelegationRootNode.getRevokeTx(didAlice)
    const node = await DelegationNode.fetch(ROOT_IDENTIFIER)
    const fetchedNodeRevocationStatus = node.revoked
    expect(fetchedNodeRevocationStatus).toEqual(true)
  })

  // This test is matched with a unit test on the node side to assure uniform hash generation.
  // Both must be updated in sync.
  it('delegation node hash generation', () => {
    const node = new DelegationNode({
      id: '0xb97ebcbcf58e3d844f2187869806cb6d78266f673df1ef8a2e42d77b7e5e4d42',
      parentId:
        '0x2919b8674c0b73322741200dcd88e372fdc832c747ced8ea6325dd15c76f5bd1',
      hierarchyId:
        '0x46a733d2a51c1c8b0c99ab1966c9a958417da9bf2a995a8ac06f9008e7c4a733',
      childrenIds: [],
      revoked: false,
      account: didAlice,
      permissions: [Permission.ATTEST],
    })
    expect(Crypto.u8aToHex(node.generateHash())).toMatchInlineSnapshot(
      `"0xa344dddae169b49af834d22e6f148e019a12bd7ed929978713faf38221ae8504"`
    )
  })
})
