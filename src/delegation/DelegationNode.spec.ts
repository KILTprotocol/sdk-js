import { Text, Tuple } from '@polkadot/types'
import Bool from '@polkadot/types/Bool'
import { Blockchain, Crypto, Identity } from '../'
import { IDelegationNode, Permission } from './Delegation'
import { DelegationNode } from './DelegationNode'

describe('Delegation', () => {
  const identityAlice = Identity.buildFromSeedString('Alice')

  const ctypeHash = Crypto.hashStr('testCtype')
  // @ts-ignore
  const blockchain = {
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
          root: jest.fn(rootId => {
            const tuple = new Tuple(
              // Root-Delegation: root-id -> (ctype-hash, account, revoked)
              [Tuple.with([Text, Text, Bool])],
              [[ctypeHash, identityAlice.address, false]]
            )
            return Promise.resolve(tuple)
          }),
          delegation: jest.fn(delegationId => {
            const tuple = new Tuple(
              // Root-Delegation: delegation-id -> (root-id, parent-id?, account, permissions, revoked)
              [Tuple.with([Text, Text, Bool])],
              [[ctypeHash, identityAlice.address, false]]
            )
            return Promise.resolve(tuple)
          }),
        },
      },
    },
    submitTx: jest.fn((identity, tx) => {
      return Promise.resolve(undefined)
    }),
    getNonce: jest.fn(),
  } as Blockchain

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

  it('delegation verify', () => {
    const node: IDelegationNode = new DelegationNode(
      'myId',
      'myRootId',
      'myAccount',
      [Permission.ATTEST, Permission.DELEGATE],
      'myParentNodeId'
    )
    node.revoked = true
    // @ts-ignore
    const permissions: Uint8Array = node.permissionsAsBitset()
    console.log('permissions', permissions)
    const expected: Uint8Array = new Uint8Array(4)
    expected[0] = 3
    expect(permissions.toString()).toBe(expected.toString())
  })
})
