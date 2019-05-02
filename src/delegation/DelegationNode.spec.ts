import { Option, Text, Tuple } from '@polkadot/types'
import Bool from '@polkadot/types/primitive/Bool'
import U32 from '@polkadot/types/primitive/U32'
import Blockchain from '../blockchain/Blockchain'
import { TxStatus } from '../blockchain/TxStatus'
import Identity from '../identity/Identity'
import { IDelegationNode, IDelegationRootNode, Permission } from './Delegation'
import { DelegationNode } from './DelegationNode'

describe('Delegation', () => {
  it('delegation generate hash', () => {
    const node: IDelegationNode = new DelegationNode(
      '0x0000000000000000000000000000000000000000000000000000000000000001',
      '0x0000000000000000000000000000000000000000000000000000000000000002',
      'myAccount',
      [Permission.ATTEST],
      '0x0000000000000000000000000000000000000000000000000000000000000003'
    )
    const hash: string = node.generateHash()

    console.log('hash', hash)
    expect(hash).toBe(
      '0x20c5b0ba186b1eef2eabdb10a5e6399cc8eaa865ad0aaed6d3583c97746392aa'
    )
  })

  it('delegation permissionsAsBitset', () => {
    const node: IDelegationNode = new DelegationNode(
      'myId',
      'myRootId',
      'myAccount',
      [Permission.ATTEST, Permission.DELEGATE],
      'myParentNodeId'
    )
    // @ts-ignore
    const permissions: Uint8Array = node.permissionsAsBitset()
    console.log('permissions', permissions)
    const expected: Uint8Array = new Uint8Array(4)
    expected[0] = 3
    expect(permissions.toString()).toBe(expected.toString())
  })

  it('delegation verify / revoke', async () => {
    // @ts-ignore
    const myBlockchain = {
      api: {
        tx: {
          delegation: {
            createRoot: jest.fn((rootId, _ctypeHash) => {
              return Promise.resolve()
            }),
            revokeDelegation: jest.fn(delegationId => {
              return Promise.resolve()
            }),
          },
        },
        query: {
          delegation: {
            delegations: jest.fn(id => {
              if (id === 'success') {
                const tuple = new Tuple(
                  // (root-id, parent-id?, account, permissions, revoked)
                  [Text, Option, Text, U32, Bool],
                  ['myRootId', null, 'myAccount', 1, false]
                )
                return Promise.resolve(tuple)
              } else {
                const tuple = new Tuple(
                  // (root-id, parent-id?, account, permissions, revoked)
                  [Text, Option, Text, U32, Bool],
                  ['myRootId', null, 'myAccount', 1, true]
                )
                return Promise.resolve(tuple)
              }
            }),
          },
        },
      },
      submitTx: jest.fn((identity, tx) => {
        return Promise.resolve(new TxStatus(''))
      }),
      getNonce: jest.fn(),
    } as Blockchain

    expect(
      await new DelegationNode('success', 'myRootId', 'myAccount', []).verify(
        myBlockchain
      )
    ).toBe(true)

    expect(
      await new DelegationNode('failure', 'myRootId', 'myAccount', []).verify(
        myBlockchain
      )
    ).toBe(false)

    const identityAlice = Identity.buildFromURI('//Alice')
    const aDelegationNode = new DelegationNode(
      'myDelegationNode',
      'myRootId',
      'myAccount',
      []
    )
    const revokeStatus = await aDelegationNode.revoke(
      myBlockchain,
      identityAlice
    )
    expect(revokeStatus).toBeDefined()
  })

  it('get delegation root', async () => {
    const identityAlice = Identity.buildFromURI('//Alice')
    // @ts-ignore
    const myBlockchain = {
      api: {
        query: {
          delegation: {
            root: jest.fn(rootId => {
              const tuple = new Tuple(
                // Root-Delegation: root-id -> (ctype-hash, account, revoked)
                [Text, Text, Bool],
                ['0x1234', identityAlice.address, false]
              )
              return Promise.resolve(tuple)
            }),
          },
        },
      },
    } as Blockchain

    const node: DelegationNode = new DelegationNode(
      'nodeId',
      'rootNodeId',
      identityAlice.address,
      []
    )
    const rootNode: IDelegationRootNode = await node.getRoot(myBlockchain)

    expect(rootNode).toBeDefined()
    expect(rootNode.cTypeHash).toBe('0x1234')
  })
})
