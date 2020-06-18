import { Data, Option, Text, Tuple, Vec, TypeRegistry } from '@polkadot/types'
import AccountId from '@polkadot/types/generic/AccountId'
import Bool from '@polkadot/types/primitive/Bool'
import U32 from '@polkadot/types/primitive/U32'
import { Crypto, Identity } from '..'
import { Permission } from '../types/Delegation'
import { getAttestationHashes } from './Delegation.chain'
import DelegationNode from './DelegationNode'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('Delegation', () => {
  let identityAlice: Identity
  const blockchainApi = require('../blockchainApiConnection/BlockchainApiConnection')
    .__mocked_api
  const registry = new TypeRegistry()

  beforeAll(async () => {
    identityAlice = await Identity.buildFromURI('//Alice')

    const ctypeHash = Crypto.hashStr('testCtype')

    blockchainApi.query.attestation.delegatedAttestations.mockReturnValue(
      new Vec(
        registry,
        //  (claim-hash)
        Text,
        ['0x123', '0x456', '0x789']
      )
    )
    blockchainApi.query.delegation.root.mockReturnValue(
      new Option(
        registry,
        Tuple,
        new Tuple(
          registry,
          // Root-Delegation: root-id -> (ctype-hash, account, revoked)
          [Data, AccountId, Bool],
          [ctypeHash, identityAlice.getAddress(), 0] // FIXME: boolean "false" - not supported --> 0 or "false" or ??
        )
      )
    )
    blockchainApi.query.delegation.delegations = jest.fn(async delegationId => {
      if (delegationId === 'firstChild') {
        return new Option(
          registry,
          Tuple,
          new Tuple(
            registry,
            // Delegation: delegation-id -> (root-id, parent-id?, account, permissions, revoked)
            [Text, Text, AccountId, U32, Bool],
            ['rootId', 'myNodeId', identityAlice.getAddress(), 2, 0] // FIXME: boolean "false" - not supported --> 0 or "false" or ??
          )
        )
      }
      if (delegationId === 'secondChild') {
        return new Option(
          registry,
          Tuple,
          new Tuple(
            registry,
            // Delegation: delegation-id -> (root-id, parent-id?, account, permissions, revoked)
            [Text, Text, AccountId, U32, Bool],
            ['rootId', 'myNodeId', identityAlice.getAddress(), 1, 0] // FIXME: boolean "false" - not supported --> 0 or "false" or ??
          )
        )
      }
      if (delegationId === 'thirdChild') {
        return new Option(
          registry,
          Tuple,
          new Tuple(
            registry,
            // Delegation: delegation-id -> (root-id, parent-id?, account, permissions, revoked)
            [Text, Text, AccountId, U32, Bool],
            ['rootId', 'myNodeId', identityAlice.getAddress(), 0, 0] // FIXME: boolean "false" - not supported --> 0 or "false" or ??
          )
        )
      }
      return new Option(
        registry,
        Tuple.with(['H256', 'Option<H256>', AccountId, U32, Bool])
      )
    })
    blockchainApi.query.delegation.children.mockReturnValue(
      new Vec(
        registry,
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
