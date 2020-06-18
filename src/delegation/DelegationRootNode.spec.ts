import { Option, Text, Tuple, TypeRegistry } from '@polkadot/types'
import AccountId from '@polkadot/types/generic/AccountId'
import Bool from '@polkadot/types/primitive/Bool'
import { Crypto, Identity } from '..'
import getCached from '../blockchainApiConnection'
import DelegationRootNode from './DelegationRootNode'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('Delegation', () => {
  let identityAlice: Identity
  let ctypeHash: string
  let ROOT_IDENTIFIER: string
  const registry = new TypeRegistry()

  beforeAll(async () => {
    identityAlice = await Identity.buildFromURI('//Alice')
    ctypeHash = Crypto.hashStr('testCtype')
    require('../blockchainApiConnection/BlockchainApiConnection').__mocked_api.query.delegation.root.mockReturnValue(
      new Option(
        registry,
        Tuple,
        new Tuple(
          registry,
          // Root-Delegation: root-id -> (ctype-hash, account, revoked)
          ['H256', AccountId, Bool],
          [ctypeHash, identityAlice.getAddress(), 0] // FIXME: boolean "false" - not supported --> 0 or "false" or ??
        )
      )
    )
    require('../blockchainApiConnection/BlockchainApiConnection').__mocked_api.query.delegation.delegations.mockReturnValue(
      new Option(
        registry,
        Tuple,
        new Tuple(
          registry,
          // Root-Delegation: delegation-id -> (root-id, parent-id?, account, permissions, revoked)
          ['H256', AccountId, Bool],
          [ctypeHash, identityAlice.getAddress(), 0] // FIXME: boolean "false" - not supported --> 0 or "false" or ??
        )
      )
    )

    ROOT_IDENTIFIER = 'abc123'
  })

  it('stores root delegation', async () => {
    const rootDelegation = new DelegationRootNode(
      ROOT_IDENTIFIER,
      ctypeHash,
      identityAlice.getAddress()
    )
    rootDelegation.store(identityAlice)
    const rootNode = await DelegationRootNode.query(ROOT_IDENTIFIER)
    if (rootNode) {
      expect(rootNode.id).toBe(ROOT_IDENTIFIER)
    }
  })

  it('query root delegation', async () => {
    // @ts-ignore
    const queriedDelegation = await DelegationRootNode.query(ROOT_IDENTIFIER)
    expect(queriedDelegation).not.toBe(undefined)
    if (queriedDelegation) {
      expect(queriedDelegation.account).toBe(identityAlice.getAddress())
      expect(queriedDelegation.cTypeHash).toBe(ctypeHash)
      expect(queriedDelegation.id).toBe(ROOT_IDENTIFIER)
    }
  })

  it('root delegation verify', async () => {
    require('../blockchainApiConnection/BlockchainApiConnection').__mocked_api.query.delegation.root = jest.fn(
      async rootId => {
        if (rootId === 'success') {
          const tuple = new Option(
            registry,
            Tuple,
            new Tuple(
              registry,
              // Root-Delegation: root-id -> (ctype-hash, account, revoked)
              [Text, Text, Bool],
              ['myCtypeHash', 'myAccount', 0] // FIXME: boolean "false" - not supported --> 0 or "false" or ??
            )
          )
          return Promise.resolve(tuple)
        }
        const tuple = new Option(
          registry,
          Tuple,
          new Tuple(
            registry,
            // Root-Delegation: root-id -> (ctype-hash, account, revoked)
            [Text, Text, Bool],
            ['myCtypeHash', 'myAccount', 1] // FIXME: boolean "true" - not supported --> 1 or "true" or ??
          )
        )
        return Promise.resolve(tuple)
      }
    )

    expect(
      await new DelegationRootNode(
        'success',
        'myCtypeHash',
        'myAccount'
      ).verify()
    ).toBe(true)

    expect(
      await new DelegationRootNode(
        'failure',
        'myCtypeHash',
        'myAccount'
      ).verify()
    ).toBe(false)
  })

  it('root delegation verify', async () => {
    const blockchain = await getCached()

    const aDelegationRootNode = new DelegationRootNode(
      'myRootId',
      'myCtypeHash',
      'myAccount'
    )
    const revokeStatus = await aDelegationRootNode.revoke(identityAlice)
    expect(blockchain.api.tx.delegation.revokeRoot).toBeCalledWith('myRootId')
    expect(revokeStatus).toBeDefined()
  })
})
