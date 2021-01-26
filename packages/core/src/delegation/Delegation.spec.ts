/**
 * @packageDocumentation
 * @group unit/delegation
 * @ignore
 */

import { Permission } from '@kiltprotocol/types'
import { Identity } from '..'
import { mockChainQueryReturn } from '../blockchainApiConnection/__mocks__/BlockchainQuery'
import { hashStr } from '../crypto'
import { getAttestationHashes } from './Delegation.chain'
import DelegationNode from './DelegationNode'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

const blockchainApi = require('../blockchainApiConnection/BlockchainApiConnection')
  .__mocked_api

const rootId = hashStr('rootId')
const nodeId = hashStr('myNodeId')
const ctypeHash = hashStr('testCtype')

describe('Delegation', () => {
  let identityAlice: Identity
  beforeAll(async () => {
    identityAlice = Identity.buildFromURI('//Alice')

    blockchainApi.query.attestation.delegatedAttestations.mockReturnValue(
      mockChainQueryReturn('attestation', 'delegatedAttestations', [
        ctypeHash,
        hashStr('secondTest'),
        hashStr('thirdTest'),
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
        hashStr('firstChild'),
        hashStr('secondChild'),
        hashStr('thirdChild'),
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
      id: hashStr('firstChild'),
      rootId,
      parentId: nodeId,
      account: identityAlice.getPublicIdentity().address,
      permissions: [Permission.DELEGATE],
      revoked: false,
    })
    expect(children[1]).toEqual({
      id: hashStr('secondChild'),
      rootId,
      parentId: nodeId,
      account: identityAlice.getPublicIdentity().address,
      permissions: [Permission.ATTEST],
      revoked: false,
    })
    expect(children[2]).toEqual({
      id: hashStr('thirdChild'),
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
