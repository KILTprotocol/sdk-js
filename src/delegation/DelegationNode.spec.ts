import { Text, Tuple, Option } from '@polkadot/types'
import Bool from '@polkadot/types/Bool'
import { Blockchain } from '../'
import { IDelegationNode, Permission } from './Delegation'
import { DelegationNode } from './DelegationNode'
import U32 from '@polkadot/types/U32'

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

  it('delegation verify', async () => {
    // @ts-ignore
    const myBlockchain = {
      api: {
        tx: {
          delegation: {
            createRoot: jest.fn((rootId, _ctypeHash) => {
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
  })
})
