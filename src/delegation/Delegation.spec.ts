import { Text, Tuple } from '@polkadot/types'
import Bool from '@polkadot/types/primitive/Bool'
import U32 from '@polkadot/types/primitive/U32'
import { Blockchain, Crypto, Identity } from '../'
// import { IDelegationNode } from './Delegation'
import { DelegationNode } from './DelegationNode'
import { Permission } from '../primitives/Delegation'

describe('Delegation', () => {
  const identityAlice = Identity.buildFromURI('//Alice')

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
        attestation: {
          delegatedAttestations: jest.fn(rootId => {
            const tuple = new Tuple(
              //  (claim-hash)
              [Text, Text, Text],
              ['0x123', '0x456', '0x789']
            )
            return Promise.resolve(tuple)
          }),
        },
        delegation: {
          root: jest.fn(rootId => {
            const tuple = new Tuple(
              // Root-Delegation: root-id -> (ctype-hash, account, revoked)
              [Tuple.with([Text, Text, Bool])],
              [[ctypeHash, identityAlice.address, false]]
            )
            return Promise.resolve(tuple)
          }),
          delegations: jest.fn(delegationId => {
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
          }),
          children: jest.fn(delegationId => {
            const tuple = new Tuple(
              // Children: delegation-id -> [delegation-ids]
              [Text, Text, Text],
              ['firstChild', 'secondChild', 'thirdChild']
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

  it('get children', async () => {
    const myDelegation = new DelegationNode(
      'myNodeId',
      'rootId',
      identityAlice.getPublicIdentity().address,
      [Permission.ATTEST],
      undefined
    )
    const children: DelegationNode[] = await myDelegation.getChildren(
      blockchain
    )
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
    const attestationHashes: string[] = await DelegationNode.getAttestationHashes(
      blockchain,
      'myDelegationId'
    )
    expect(attestationHashes).toHaveLength(3)
    expect(attestationHashes).toContain('0x123')
  })
})
