import { Text, Tuple, H256 } from '@polkadot/types'
import Bool from '@polkadot/types/primitive/Bool'
import { Crypto, Identity } from '..'
import DelegationRootNode from './DelegationRootNode'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('Delegation', () => {
  const identityAlice = Identity.buildFromURI('//Alice')

  const ctypeHash = Crypto.hashStr('testCtype')
  require('../blockchain/Blockchain').default.__mockQueryDelegationRoot = jest.fn(
    () => {
      const tuple = new Tuple(
        // Root-Delegation: root-id -> (ctype-hash, account, revoked)
        [H256, Text, Bool],
        [ctypeHash, identityAlice.address, false]
      )
      return Promise.resolve(tuple)
    }
  )
  require('../blockchain/Blockchain').default.__mockQueryDelegationDelegation = jest.fn(
    () => {
      const tuple = new Tuple(
        // Root-Delegation: delegation-id -> (root-id, parent-id?, account, permissions, revoked)
        [H256, Text, Bool],
        [ctypeHash, identityAlice.address, false]
      )
      return Promise.resolve(tuple)
    }
  )

  const ROOT_IDENTIFIER = 'abc123'
  it('stores root delegation', async () => {
    const rootDelegation = new DelegationRootNode(
      ROOT_IDENTIFIER,
      ctypeHash,
      identityAlice.getPublicIdentity().address
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
      expect(queriedDelegation.account).toBe(identityAlice.address)
      expect(queriedDelegation.cTypeHash).toBe(ctypeHash)
      expect(queriedDelegation.id).toBe(ROOT_IDENTIFIER)
    }
  })

  it('root delegation verify', async () => {
    require('../blockchain/Blockchain').default.__mockQueryDelegationRoot = jest.fn(
      rootId => {
        if (rootId === 'success') {
          const tuple = new Tuple(
            // Root-Delegation: root-id -> (ctype-hash, account, revoked)
            [Text, Text, Bool],
            ['myCtypeHash', 'myAccount', false]
          )
          return Promise.resolve(tuple)
        }
        const tuple = new Tuple(
          // Root-Delegation: root-id -> (ctype-hash, account, revoked)
          [Text, Text, Bool],
          ['myCtypeHash', 'myAccount', true]
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
    let calledRootId = ''

    require('../blockchain/Blockchain').default.__mockTxDelegationRoot = jest.fn(
      rootId => {
        calledRootId = rootId
      }
    )

    const aDelegationRootNode = new DelegationRootNode(
      'myRootId',
      'myCtypeHash',
      'myAccount'
    )
    const revokeStatus = await aDelegationRootNode.revoke(identityAlice)
    expect(calledRootId).toBe('myRootId')
    expect(revokeStatus).toBeDefined()
  })
})
