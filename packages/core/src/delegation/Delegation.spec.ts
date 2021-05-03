/**
 * @group unit/delegation
 */

import { Permission } from '@kiltprotocol/types'
import type { ICType, IDelegationBaseNode } from '@kiltprotocol/types'
import { Crypto } from '@kiltprotocol/utils'
import { mockChainQueryReturn } from '@kiltprotocol/chain-helpers/lib/blockchainApiConnection/__mocks__/BlockchainQuery'
import { Identity } from '..'
import DelegationNode from './DelegationNode'
import Kilt from '../kilt/Kilt'

jest.mock(
  '@kiltprotocol/chain-helpers/lib/blockchainApiConnection/BlockchainApiConnection'
)

const blockchainApi = require('@kiltprotocol/chain-helpers/lib/blockchainApiConnection/BlockchainApiConnection')
  .__mocked_api

Kilt.config({ address: 'ws://testString' })

describe('Delegation', () => {
  let identityAlice: Identity
  let rootId: IDelegationBaseNode['id']
  let nodeId: IDelegationBaseNode['id']
  let cTypeHash: ICType['hash']
  let myDelegation: DelegationNode
  let children: DelegationNode[]
  let attestationHashes: string[]
  beforeAll(async () => {
    identityAlice = Identity.buildFromURI('//Alice')
    rootId = Crypto.hashStr('rootId')
    nodeId = Crypto.hashStr('myNodeId')
    cTypeHash =
      'kilt:ctype:0xba15bf4960766b0a6ad7613aa3338edce95df6b22ed29dd72f6e72d740829b84'

    blockchainApi.query.attestation.delegatedAttestations.mockReturnValue(
      mockChainQueryReturn('attestation', 'delegatedAttestations', [
        cTypeHash,
        Crypto.hashStr('secondTest'),
        Crypto.hashStr('thirdTest'),
      ])
    )
    blockchainApi.query.delegation.root.mockReturnValue(
      mockChainQueryReturn('delegation', 'root', [
        cTypeHash,
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
          1,
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
    myDelegation = new DelegationNode({
      id: nodeId,
      rootId,
      account: identityAlice.getPublicIdentity().address,
      permissions: [Permission.ATTEST],
      parentId: undefined,
      revoked: false,
    })
    children = await myDelegation.getChildren()
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
      permissions: [Permission.ATTEST],
      revoked: false,
    })
  })
  it('get attestation hashes', async () => {
    attestationHashes = await myDelegation.getAttestationHashes()
    expect(attestationHashes).toHaveLength(3)
  })
})
