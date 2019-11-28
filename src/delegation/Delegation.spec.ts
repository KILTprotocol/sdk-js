import { Text, Tuple } from '@polkadot/types'
import Bool from '@polkadot/types/primitive/Bool'
import U32 from '@polkadot/types/primitive/U32'
import { Crypto, Identity } from '..'
import DelegationNode from './DelegationNode'
import { getAttestationHashes } from './Delegation.chain'
import { Permission } from '../types/Delegation'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('Delegation', () => {
  const identityAlice = Identity.buildFromURI('//Alice')

  const ctypeHash = Crypto.hashStr('testCtype')
  const blockchain = require('../blockchain/Blockchain').default
  blockchain.api.tx.delegation.createRoot = jest.fn(() => {
    return Promise.resolve()
  })
  blockchain.api.query.attestation.delegatedAttestations = jest.fn(() => {
    const tuple = new Tuple(
      //  (claim-hash)
      [Text, Text, Text],
      ['0x123', '0x456', '0x789']
    )
    return Promise.resolve(tuple)
  })
  blockchain.api.query.delegation.root = jest.fn(() => {
    const tuple = new Tuple(
      // Root-Delegation: root-id -> (ctype-hash, account, revoked)
      [Tuple.with([Text, Text, Bool])],
      [[ctypeHash, identityAlice.address, false]]
    )
    return Promise.resolve(tuple)
  })
  blockchain.api.query.delegation.delegations = jest.fn(delegationId => {
    let result = null
    if (delegationId === 'firstChild') {
      result = new Tuple(
        // Delegation: delegation-id -> (root-id, parent-id?, account, permissions, revoked)
        [Text, Text, Text, U32, Bool],
        [
          'rootId',
          'myNodeId',
          identityAlice.getPublicIdentity().address,
          2,
          false,
        ]
      )
    } else if (delegationId === 'secondChild') {
      result = new Tuple(
        // Delegation: delegation-id -> (root-id, parent-id?, account, permissions, revoked)
        [Text, Text, Text, U32, Bool],
        [
          'rootId',
          'myNodeId',
          identityAlice.getPublicIdentity().address,
          1,
          false,
        ]
      )
    } else if (delegationId === 'thirdChild') {
      result = new Tuple(
        // Delegation: delegation-id -> (root-id, parent-id?, account, permissions, revoked)
        [Text, Text, Text, U32, Bool],
        [
          'rootId',
          'myNodeId',
          identityAlice.getPublicIdentity().address,
          0,
          false,
        ]
      )
    }
    return Promise.resolve(result)
  })
  blockchain.api.query.delegation.children = jest.fn(() => {
    const tuple = new Tuple(
      // Children: delegation-id -> [delegation-ids]
      [Text, Text, Text],
      ['firstChild', 'secondChild', 'thirdChild']
    )
    return Promise.resolve(tuple)
  })

  it('get children', async () => {
    const myDelegation = new DelegationNode(
      'myNodeId',
      'rootId',
      identityAlice.getPublicIdentity().address,
      [Permission.ATTEST],
      undefined
    )
    const children: DelegationNode[] = await myDelegation.getChildren()
    expect(children).toHaveLength(3)
    expect(children[0]).toEqual({
      id: 'firstChild',
      rootId: 'rootId',
      parentId: 'myNodeId',
      account: identityAlice.getPublicIdentity().address,
      permissions: [Permission.DELEGATE],
      revoked: false,
    })
    expect(children[1]).toEqual({
      id: 'secondChild',
      rootId: 'rootId',
      parentId: 'myNodeId',
      account: identityAlice.getPublicIdentity().address,
      permissions: [Permission.ATTEST],
      revoked: false,
    })
    expect(children[2]).toEqual({
      id: 'thirdChild',
      rootId: 'rootId',
      parentId: 'myNodeId',
      account: identityAlice.getPublicIdentity().address,
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
