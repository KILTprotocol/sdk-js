/**
 * @packageDocumentation
 * @group unit/delegation
 * @ignore
 */

import { Permission } from '@kiltprotocol/types'
import { Crypto } from '@kiltprotocol/utils'
import { mockChainQueryReturn } from '@kiltprotocol/chain-helpers/lib/blockchainApiConnection/__mocks__/BlockchainQuery'
import { Identity } from '..'
import { getAttestationHashes } from './Delegation.chain'
import DelegationNode from './DelegationNode'
import Kilt from '../kilt/Kilt'

jest.mock(
  '@kiltprotocol/chain-helpers/lib/blockchainApiConnection/BlockchainApiConnection'
)

const blockchainApi = require('@kiltprotocol/chain-helpers/lib/blockchainApiConnection/BlockchainApiConnection')
  .__mocked_api

Kilt.config({ address: 'ws://testString' })
const rootId = Crypto.hashStr('rootId')
const nodeId = Crypto.hashStr('myNodeId')
const ctypeHash = Crypto.hashStr('testCtype')

describe('Delegation', () => {
  let identityAlice: Identity
  beforeAll(async () => {
    identityAlice = Identity.buildFromURI('//Alice')

    blockchainApi.query.attestation.delegatedAttestations.mockReturnValue(
      mockChainQueryReturn('attestation', 'delegatedAttestations', [
        ctypeHash,
        Crypto.hashStr('secondTest'),
        Crypto.hashStr('thirdTest'),
      ])
    )
    blockchainApi.query.delegation.root.mockReturnValue(
      mockChainQueryReturn('delegation', 'root', [
        ctypeHash,
        identityAlice.address,
        false,
      ])
    )

    blockchainApi.query.delegation.delegations
      // first call
      .mockResolvedValueOnce(
        mockChainQueryReturn('delegation', 'delegations', [
          rootId,
          nodeId,
          identityAlice.getPublicIdentity().address,
          2,
          false,
        ])
      )
      // second call
      .mockResolvedValueOnce(
        mockChainQueryReturn('delegation', 'delegations', [
          rootId,
          nodeId,
          identityAlice.getPublicIdentity().address,
          1,
          false,
        ])
      )
      // third call
      .mockResolvedValueOnce(
        mockChainQueryReturn('delegation', 'delegations', [
          rootId,
          nodeId,
          identityAlice.getPublicIdentity().address,
          0,
          false,
        ])
      )
      // default (any further calls)
      .mockResolvedValue(
        // Delegation: delegation-id -> (root-id, parent-id?, account, permissions, revoked)
        mockChainQueryReturn('delegation', 'delegations')
      )

    blockchainApi.query.delegation.children.mockResolvedValue(
      mockChainQueryReturn('delegation', 'children', [
        Crypto.hashStr('firstChild'),
        Crypto.hashStr('secondChild'),
        Crypto.hashStr('thirdChild'),
      ])
    )
  })

  it('get children', async () => {
    const myDelegation = new DelegationNode(
      nodeId,
      rootId,
      identityAlice.getPublicIdentity().address,
      [Permission.ATTEST],
      undefined
    )
    const children: DelegationNode[] = await myDelegation.getChildren()
    expect(children).toHaveLength(3)
    expect(children[0]).toEqual({
      id: Crypto.hashStr('firstChild'),
      rootId,
      parentId: nodeId,
      account: identityAlice.getPublicIdentity().address,
      permissions: [Permission.DELEGATE],
      revoked: false,
    })
    expect(children[1]).toEqual({
      id: Crypto.hashStr('secondChild'),
      rootId,
      parentId: nodeId,
      account: identityAlice.getPublicIdentity().address,
      permissions: [Permission.ATTEST],
      revoked: false,
    })
    expect(children[2]).toEqual({
      id: Crypto.hashStr('thirdChild'),
      rootId,
      parentId: nodeId,
      account: identityAlice.getPublicIdentity().address,
      permissions: [],
      revoked: false,
    })
  })
  it('get attestation hashes', async () => {
    const attestationHashes = await getAttestationHashes('myDelegationId')
    expect(attestationHashes).toHaveLength(3)
    expect(attestationHashes).toContain(ctypeHash)
  })
})
