/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/delegation
 */

/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Permission } from '@kiltprotocol/types'
import type { ICType, IDelegationBaseNode } from '@kiltprotocol/types'
import { Crypto, SDKErrors } from '@kiltprotocol/utils'
import { mockChainQueryReturn } from '@kiltprotocol/chain-helpers/lib/blockchainApiConnection/__mocks__/BlockchainQuery'
import { Identity } from '..'
import DelegationNode from './DelegationNode'
import Kilt from '../kilt/Kilt'
import errorCheck from './Delegation.utils'

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

  it('error check should throw errors on faulty delegation', async () => {
    const malformedIdDelegation = {
      id: nodeId.slice(13) + nodeId.slice(15),
      account: identityAlice.address,
      revoked: false,
    } as IDelegationBaseNode

    const missingIdDelegation = {
      id: nodeId,
      account: identityAlice.address,
      revoked: false,
    } as IDelegationBaseNode

    // @ts-expect-error
    delete missingIdDelegation.id

    const missingAccountDelegation = {
      id: nodeId,
      account: identityAlice.address,
      revoked: false,
    } as IDelegationBaseNode

    // @ts-expect-error
    delete missingAccountDelegation.account

    const missingRevokedStatusDelegation = {
      id: nodeId,
      account: identityAlice.address,
      revoked: false,
    } as IDelegationBaseNode

    // @ts-expect-error
    delete missingRevokedStatusDelegation.revoked

    expect(() => errorCheck(malformedIdDelegation)).toThrowError(
      SDKErrors.ERROR_DELEGATION_ID_TYPE()
    )

    expect(() => errorCheck(missingIdDelegation)).toThrowError(
      SDKErrors.ERROR_DELEGATION_ID_MISSING()
    )

    expect(() => errorCheck(missingAccountDelegation)).toThrowError(
      SDKErrors.ERROR_OWNER_NOT_PROVIDED()
    )

    expect(() => errorCheck(missingRevokedStatusDelegation)).toThrowError(
      new TypeError('revoked is expected to be a boolean')
    )
  })
})
