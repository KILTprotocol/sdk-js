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
      'myId',
      'myRootId',
      'myAccount',
      [Permission.ATTEST],
      'myParentNodeId'
    )
    const hash: string = node.generateHash()

    console.log('hash', hash)
    expect(hash).toBe(
      '0x46993defbaf261efb4796a1eb311fbd2b0d9943aad2a39d3fd54eb79dcce7cc3'
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
    const expected: Uint8Array = new Uint8Array(1)
    expected[0] = 3
    expect(permissions.toString()).toBe(expected.toString())
  })
})
