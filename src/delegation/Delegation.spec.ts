import { Text, Tuple, Vec, Option, H256, Data } from '@polkadot/types'
import Bool from '@polkadot/types/primitive/Bool'
import U32 from '@polkadot/types/primitive/U32'
import AccountId from '@polkadot/types/primitive/Generic/AccountId'
import { Crypto, Identity } from '..'
import DelegationNode from './DelegationNode'
import { getAttestationHashes } from './Delegation.chain'
import { Permission } from '../types/Delegation'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('Delegation', () => {
  let identityAlice: Identity

  beforeAll(async () => {
    identityAlice = await Identity.buildFromURI('//Alice')

    const ctypeHash = Crypto.hashStr('testCtype')
    const blockchainApi = require('../blockchainApiConnection/BlockchainApiConnection')
      .__mocked_api

    blockchainApi.query.attestation.delegatedAttestations.mockReturnValue(
      new Vec(
        //  (claim-hash)
        Text,
        ['0x123', '0x456', '0x789']
      )
    )
    blockchainApi.query.delegation.root.mockReturnValue(
      new Option(
        Tuple,
        new Tuple(
          // Root-Delegation: root-id -> (ctype-hash, account, revoked)
          [Data, AccountId, Bool],
          [[ctypeHash, identityAlice.getAddress(), false]]
        )
      )
    )
    blockchainApi.query.delegation.delegations = jest.fn(async delegationId => {
      if (delegationId === 'firstChild') {
        return new Option(
          Tuple,
          new Tuple(
            // Delegation: delegation-id -> (root-id, parent-id?, account, permissions, revoked)
            [Text, Text, AccountId, U32, Bool],
            ['rootId', 'myNodeId', identityAlice.getAddress(), 2, false]
          )
        )
      }
      if (delegationId === 'secondChild') {
        return new Option(
          Tuple,
          new Tuple(
            // Delegation: delegation-id -> (root-id, parent-id?, account, permissions, revoked)
            [Text, Text, AccountId, U32, Bool],
            ['rootId', 'myNodeId', identityAlice.getAddress(), 1, false]
          )
        )
      }
      if (delegationId === 'thirdChild') {
        return new Option(
          Tuple,
          new Tuple(
            // Delegation: delegation-id -> (root-id, parent-id?, account, permissions, revoked)
            [Text, Text, AccountId, U32, Bool],
            ['rootId', 'myNodeId', identityAlice.getAddress(), 0, false]
          )
        )
      }
      return new Option(
        Tuple.with([H256, 'Option<H256>', AccountId, U32, Bool])
      )
    })
    blockchainApi.query.delegation.children.mockReturnValue(
      new Vec(
        // Children: delegation-id -> [delegation-ids]
        Text,
        ['firstChild', 'secondChild', 'thirdChild']
      )
    )
  })

  it('get children', async () => {
    const myDelegation = new DelegationNode(
      'myNodeId',
      'rootId',
      identityAlice.getAddress(),
      [Permission.ATTEST],
      undefined
    )
    const children: DelegationNode[] = await myDelegation.getChildren()
    expect(children).toHaveLength(3)
    expect(children[0]).toEqual({
      id: 'firstChild',
      rootId: 'rootId',
      parentId: 'myNodeId',
      account: identityAlice.getAddress(),
      permissions: [Permission.DELEGATE],
      revoked: false,
    })
    expect(children[1]).toEqual({
      id: 'secondChild',
      rootId: 'rootId',
      parentId: 'myNodeId',
      account: identityAlice.getAddress(),
      permissions: [Permission.ATTEST],
      revoked: false,
    })
    expect(children[2]).toEqual({
      id: 'thirdChild',
      rootId: 'rootId',
      parentId: 'myNodeId',
      account: identityAlice.getAddress(),
      permissions: [],
      revoked: false,
    })
  })
  it('get attestation hashes', async () => {
    const attestationHashes = await getAttestationHashes('myDelegationId')
    expect(attestationHashes).toHaveLength(3)
    expect(attestationHashes).toContain('0x123')
  })
})
