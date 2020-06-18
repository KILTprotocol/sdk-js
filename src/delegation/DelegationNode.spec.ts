import { Option, Tuple, H256 } from '@polkadot/types'
import Bool from '@polkadot/types/primitive/Bool'
import U32 from '@polkadot/types/primitive/U32'
import AccountId from '@polkadot/types/primitive/Generic/AccountId'
import Identity from '../identity/Identity'
import DelegationNode from './DelegationNode'
import { Permission } from '../types/Delegation'
import permissionsAsBitset from './DelegationNode.utils'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

let identityAlice: Identity

beforeAll(async () => {
  identityAlice = await Identity.buildFromURI('//Alice')
})

describe('Delegation', () => {
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
            Tuple.with(
              // (root-id, parent-id?, account, permissions, revoked)
              [H256, 'Option<H256>', AccountId, U32, Bool]
            ),
            ['myRootId', null, identityAlice.getAddress(), 1, false]
          )
        }
        return new Option(
          Tuple.with(
            // (root-id, parent-id?, account, permissions, revoked)
            [H256, 'Option<H256>', AccountId, U32, Bool]
          ),
          ['myRootId', null, identityAlice.getAddress(), 1, true]
        )
      }
    )

    expect(
      await new DelegationNode(
        'success',
        'myRootId',
        identityAlice.getAddress(),
        []
      ).verify()
    ).toBe(true)

    expect(
      await new DelegationNode(
        'failure',
        'myRootId',
        identityAlice.getAddress(),
        []
      ).verify()
    ).toBe(false)

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
    require('../blockchainApiConnection/BlockchainApiConnection').__mocked_api.query.delegation.root.mockReturnValue(
      new Option(
        Tuple.with(
          // Root-Delegation: root-id -> (ctype-hash, account, revoked)
          [H256, AccountId, Bool]
        ),
        [
          '0x1234000000000000000000000000000000000000000000000000000000000000',
          identityAlice.getAddress(),
          false,
        ]
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
