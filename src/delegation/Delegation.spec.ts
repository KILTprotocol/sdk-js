import { Crypto, Identity, Blockchain } from '../'
import { Tuple, Text } from '@polkadot/types'
import Bool from '@polkadot/types/Bool'
import { DelegationRootNode, IDelegationRootNode } from './Delegation'

describe('Delegation', () => {
  const identityAlice = Identity.buildFromSeedString('Alice')

  const ctypeHash = Crypto.hashStr('testCtype')
  // @ts-ignore
  const blockchain = {
    api: {
      tx: {
        delegation: {
          create_root: jest.fn((rootId, _ctypeHash) => {
            return Promise.resolve()
          }),
        },
      },
      query: {
        delegation: {
          root: jest.fn(rootId => {
            const tuple = new Tuple(
              // Root-Delegation: root-id -> (ctype-hash, account, revoked)
              [Tuple.with([Text, Text, Bool])],
              [[ctypeHash, identityAlice.address, false]]
            )
            return Promise.resolve(tuple)
          }),
          delegation: jest.fn(delegationId => {
            const tuple = new Tuple(
              // Root-Delegation: delegation-id -> (root-id, parent-id?, account, permissions, revoked)
              [Tuple.with([Text, Text, Bool])],
              [[ctypeHash, identityAlice.address, false]]
            )
            return Promise.resolve(tuple)
          }),
        },
      },
    },
    submitTx: jest.fn((identity, tx) => {
      return Promise.resolve()
    }),
    getNonce: jest.fn(),
  } as Blockchain

  const ROOT_IDENTIFIER = 'abc123'
  it('stores root delegation', async () => {
    const rootDelegation = new DelegationRootNode(
      ROOT_IDENTIFIER,
      ctypeHash,
      identityAlice.getPublicIdentity().address
    )
    rootDelegation.store(blockchain, identityAlice)
    expect(await rootDelegation.verifyStored(blockchain)).toBeTruthy()
  })

  it('query root delegation', async () => {
    const rootDelegation = new DelegationRootNode(ROOT_IDENTIFIER)
    // @ts-ignore
    const queriedDelegation: IDelegationRootNode = await rootDelegation.query(
      blockchain,
      ROOT_IDENTIFIER
    )
    expect(queriedDelegation.account).toBe(identityAlice.address)
    expect(queriedDelegation.ctypeHash).toBe(ctypeHash)
    expect(queriedDelegation.id).toBe(ROOT_IDENTIFIER)
  })
})
