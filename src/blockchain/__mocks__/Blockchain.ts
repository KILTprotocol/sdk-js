/**
 * @module Blockchain
 * @ignore
 */

/**
 * Dummy comment needed for correct doc display, do not remove
 */
const blockchain: any = {
  __mockResultHash: '',
  __mockTxDelegationRoot: jest.fn(),
  __mockQueryDelegationRoot: jest.fn(),
  __mockQueryDelegationDelegation: jest.fn(),
  __mockQueryDelegationDelegations: jest.fn(),
  __mockQueryDidDids: jest.fn(),
  asArray: jest.fn(result => {
    return result.toJSON()
  }),
  api: {
    tx: {
      attestation: {
        add: jest.fn((claimHash, _cTypeHash) => {
          return Promise.resolve()
        }),
      },
      balances: {
        transfer: jest.fn(),
      },
      ctype: {
        add: jest.fn((hash, signature) => {
          return Promise.resolve({ hash, signature })
        }),
      },
      delegation: {
        createRoot: jest.fn((rootId, _ctypeHash) => {
          return Promise.resolve()
        }),
        revokeRoot: jest.fn(rootId => {
          return blockchain.__mockTxDelegationRoot(rootId)
        }),
        revokeDelegation: jest.fn(delegationId => {
          return Promise.resolve()
        }),
      },
      did: {
        add: jest.fn((sign_key, box_key, doc_ref) => {
          return Promise.resolve()
        }),
        remove: jest.fn(() => {
          return Promise.resolve()
        }),
      },
    },
    query: {
      attestation: {
        delegatedAttestations: jest.fn(),
        attestations: jest.fn(),
      },
      balances: {
        freeBalance: jest.fn(),
      },
      ctype: {
        cTYPEs: jest.fn(hash => {
          return true
        }),
      },
      delegation: {
        root: jest.fn(rootId => {
          return blockchain.__mockQueryDelegationRoot(rootId)
        }),
        delegation: jest.fn(delegationId => {
          return blockchain.__mockQueryDelegationDelegation(delegationId)
        }),
        delegations: jest.fn(id => {
          return blockchain.__mockQueryDelegationDelegations(id)
        }),
        children: jest.fn(),
      },
      dID: {
        dIDs: jest.fn(id => {
          return blockchain.__mockQueryDidDids(id)
        }),
      },
    },
  },
  getStats: jest.fn(),
  listenToBlocks: jest.fn(),
  listenToBalanceChanges: jest.fn(),
  makeTransfer: jest.fn(),
  submitTx: jest.fn((identity, tx) => {
    return Promise.resolve(blockchain.__mockResultHash)
  }),
  getNonce: jest.fn(),
}

export default blockchain
