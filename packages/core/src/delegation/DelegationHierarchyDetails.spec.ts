/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/delegation
 */

import { Crypto } from '@kiltprotocol/utils'
import {
  BlockchainUtils,
  BlockchainApiConnection,
} from '@kiltprotocol/chain-helpers'
import { mockChainQueryReturn } from '@kiltprotocol/chain-helpers/src/blockchainApiConnection/__mocks__/BlockchainQuery'
import { Identity } from '../identity'

import DelegationHierarchyDetails from './DelegationHierarchyDetails'
import Kilt from '../kilt/Kilt'

jest.mock(
  '@kiltprotocol/chain-helpers/lib/blockchainApiConnection/BlockchainApiConnection'
)

describe('Delegation', () => {
  let identityAlice: Identity
  let ctypeHash: string
  let ROOT_IDENTIFIER: string
  let ROOT_SUCCESS: string
  Kilt.config({ address: 'ws://testString' })

  beforeAll(async () => {
    identityAlice = Identity.buildFromURI('//Alice')
    ctypeHash = `0x6b696c743a63747970653a307830303031000000000000000000000000000000`
    ROOT_IDENTIFIER = Crypto.hashStr('1')
    ROOT_SUCCESS = Crypto.hashStr('success')

    require('@kiltprotocol/chain-helpers/lib/blockchainApiConnection/BlockchainApiConnection').__mocked_api.query.delegation.hierarchies.mockReturnValue(
      mockChainQueryReturn('delegation', 'hierarchies', [ctypeHash])
    )
    require('@kiltprotocol/chain-helpers/lib/blockchainApiConnection/BlockchainApiConnection').__mocked_api.query.delegation.delegations.mockReturnValue(
      mockChainQueryReturn('delegation', 'delegations', [
        ROOT_IDENTIFIER,
        null,
        [],
      ])
    )
  })

  it('stores root delegation', async () => {
    const rootDelegation = new DelegationRootNode({
      id: ROOT_IDENTIFIER,
      cTypeHash: ctypeHash,
      account: identityAlice.address,
      revoked: false,
    })
    await rootDelegation
      .store()
      .then((tx) =>
        BlockchainUtils.signAndSubmitTx(tx, identityAlice, { reSign: true })
      )

    const rootNode = await DelegationRootNode.query(ROOT_IDENTIFIER)
    if (rootNode) {
      expect(rootNode.id).toBe(ROOT_IDENTIFIER)
    }
  })

  it('query root delegation', async () => {
    const queriedDelegation = await DelegationRootNode.query(ROOT_IDENTIFIER)
    expect(queriedDelegation).not.toBe(undefined)
    if (queriedDelegation) {
      expect(queriedDelegation.account).toBe(identityAlice.address)
      expect(queriedDelegation.cTypeHash).toBe(ctypeHash)
      expect(queriedDelegation.id).toBe(ROOT_IDENTIFIER)
    }
  })

  it('root delegation verify', async () => {
    require('@kiltprotocol/chain-helpers/lib/blockchainApiConnection/BlockchainApiConnection').__mocked_api.query.delegation.root = jest.fn(
      async (rootId) => {
        if (rootId === ROOT_SUCCESS) {
          const tuple = mockChainQueryReturn('delegation', 'root', [
            ctypeHash,
            identityAlice.address,
            false,
          ])

          return Promise.resolve(tuple)
        }
        const tuple = mockChainQueryReturn('delegation', 'root', [
          ctypeHash,
          identityAlice.address,
          true,
        ])

        return Promise.resolve(tuple)
      }
    )

    expect(
      await new DelegationRootNode({
        id: ROOT_IDENTIFIER,
        cTypeHash: ctypeHash,
        account: identityAlice.address,
        revoked: false,
      }).verify()
    ).toBe(false)

    expect(
      await new DelegationRootNode({
        id: ROOT_SUCCESS,
        cTypeHash: ctypeHash,
        account: identityAlice.address,
        revoked: true,
      }).verify()
    ).toBe(true)
  })

  it('root delegation verify', async () => {
    const blockchain = await BlockchainApiConnection.getConnectionOrConnect()

    const aDelegationRootNode = new DelegationRootNode({
      id: ROOT_IDENTIFIER,
      cTypeHash: ctypeHash,
      account: identityAlice.address,
      revoked: false,
    })
    const revokeStatus = await aDelegationRootNode
      .revoke()
      .then((tx) =>
        BlockchainUtils.signAndSubmitTx(tx, identityAlice, { reSign: true })
      )
    expect(blockchain.api.tx.delegation.revokeRoot).toBeCalledWith(
      ROOT_IDENTIFIER,
      1
    )
    expect(revokeStatus).toBeDefined()
  })
})