/**
 * @packageDocumentation
 * @module BlockchainApiConnection
 * @ignore
 */

/**
 * Mock implementation of BlockchainApiConnection to specifically mock Substrate api calls that
 * require a connection to a Substrate blockchain.
 *
 * Transaction (tx) calls will return a mocked SubmittableExtrinsic containing a SubmittableResult
 * which will be returned when calling the `.send()` method.
 * This result defaults to `Finalized`, a default which can be changed by means of the `__setDefaultResult()` function:
 * ```
 * require('../blockchainApiConnection/BlockchainApiConnection').__setDefaultResult(
 *   false
 * )
 * const transfer = blockchain.api.tx.balances.transfer(alice.address, amount) // returns a mock SubmittableExtrinsic that has a send() method
 * const result = await BlockchainUtils.signAndSubmitTx(alice, transfer)       // calls transfer.send() internally
 * ```
 * You can also queue results with
 * ```
 * require('../blockchainApiConnection/BlockchainApiConnection').__queueResults(
 *   [true, false]
 * )
 * ```
 * After queue results have been consumed via tx calls, the mock implementation will resume returning the default result.
 *
 * Mocked query methods return representations of 'not present' by default, such as Option(..., null) or Vec(..., []).
 * You can set different return values during test execution by importing __mocked_api, then calling jest's return
 * value setters `.mockReturnValue` or `.mockReturnValueOnce` on the method you want to modify:
 * ```
 *   const mocked_api = require('../blockchainApiConnection/BlockchainApiConnection').__mocked_api
 *   mocked_api.query.delegation.hierarchies.mockReturnValue(
 *     new Option(
 *       'Hash'
 *     )
 *   )
 * ```
 * `.mockReturnValue` changes the default return value for the scope of the current test file.
 * `.mockReturnValueOnce()` can be called multiple times to build a queue of return values. After the queue has
 * been emptied by calling the query in question repeatedly, jest will return the default value again.
 *
 */

import Blockchain from '../../blockchain/Blockchain'
import { ApiPromise, SubmittableResult } from '@polkadot/api'
import type {
  AccountInfoWithProviders,
  ExtrinsicStatus,
  Index,
} from '@polkadot/types/interfaces'
import { GenericEventData, U64 } from '@polkadot/types'
import type {
  IPublicIdentity,
  ISubmittableResult,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { mockChainQueryReturn } from './BlockchainQuery'
import TYPE_REGISTRY from '../TypeRegistry'

const BlockchainApiConnection = jest.requireActual('../BlockchainApiConnection')

const accumulator = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

async function getConnectionOrConnect(): Promise<Blockchain> {
  if (!BlockchainApiConnection.instance) {
    BlockchainApiConnection.instance = Promise.resolve(
      new Blockchain(__mocked_api as ApiPromise)
    )
  }
  return BlockchainApiConnection.instance
}

const TxResultsQueue: ISubmittableResult[] = []
let defaultTxResult: ISubmittableResult = __makeSubmittableResult({})

class MockSubmittableExtrinsic {
  result: ISubmittableResult
  method = { toHex: () => '0x00' }
  signature = {
    signed: false,
    toHuman: (): number | undefined => undefined,
  }
  nonce = { toHuman: (): number | undefined => undefined }
  constructor(result: ISubmittableResult) {
    this.result = result
  }

  public addSignature() {
    const signature = this.signature.toHuman()
      ? this.signature.toHuman()! + 1
      : 0
    this.signature = {
      signed: true,
      toHuman: () => signature,
    }
    const nonce = this.nonce.toHuman() ? this.nonce.toHuman()! + 1 : 0
    this.nonce = { toHuman: () => nonce }
    return this
  }
  public signAsync() {
    const signature = this.signature.toHuman() ? this.signature.toHuman()! : 0
    this.signature = {
      signed: true,
      toHuman: () => signature,
    }
    const nonce = this.nonce.toHuman() ? this.nonce.toHuman()! : 0
    this.nonce = { toHuman: () => nonce }

    return this
  }
  public async send(callable: Function) {
    if (callable) {
      callable(this.result)
      return () => {}
    }
    return '0x123'
  }

  public async signAndSend(a: any, callable: Function) {
    const signature = this.signature.toHuman() ? this.signature.toHuman()! : 0
    this.signature = {
      signed: true,
      toHuman: () => signature,
    }
    const nonce = this.nonce.toHuman() ? this.nonce.toHuman()! : 0
    this.nonce = { toHuman: () => nonce }
    if (callable) {
      callable(this.result)
      return () => {}
    }
    return '0x123'
  }
}

function __getMockSubmittableExtrinsic(): SubmittableExtrinsic {
  const result: ISubmittableResult = TxResultsQueue.shift() || defaultTxResult
  return (new MockSubmittableExtrinsic(result) as any) as SubmittableExtrinsic
}

function __makeSubmittableResult(
  opts: Partial<ExtrinsicStatus>
): ISubmittableResult {
  const finalized = opts ? !Object.keys(opts)[0] : true
  const status: ExtrinsicStatus = {
    isFinalized: finalized,
    isDropped: false,
    isInvalid: false,
    isUsurped: false,
    isFuture: false,
    isReady: true,
  } as any
  for (const key in opts) {
    status[key] = opts[key]
  }
  const eventData = new GenericEventData(
    TYPE_REGISTRY,
    new Uint8Array([0]),
    undefined,
    undefined,
    {} as any,
    'system',
    'ExtrinsicSuccess'
  )
  return new SubmittableResult({
    status,
    events: [
      {
        phase: {
          asApplyExtrinsic: {
            isEmpty: false,
          },
        },
        event: {
          section: 'system',
          data: eventData,
          index: {
            toHex: jest.fn(() => {
              return '0x0000'
            }),
          },
          // portablegabi checks if a transaction was successful
          method: 'ExtrinsicSuccess',
        },
      } as any,
    ],
  })
}

function __queueResults(results: Partial<ExtrinsicStatus>[]) {
  results.forEach((status) => {
    TxResultsQueue.push(__makeSubmittableResult(status))
  })
}

function __setDefaultResult(status: Partial<ExtrinsicStatus>) {
  defaultTxResult = __makeSubmittableResult(status)
}

const __mocked_api: any = {
  rpc: {
    system: {
      chain: jest.fn(),
      name: jest.fn(),
      version: jest.fn(),
      accountNextIndex: jest.fn(
        async (): Promise<Index> => TYPE_REGISTRY.createType('Index', 0)
      ),
    },
    chain: { subscribeNewHeads: jest.fn() },
  },
  tx: {
    attestation: {
      add: jest.fn((claimHash, _cTypeHash) => {
        return __getMockSubmittableExtrinsic()
      }),
      revoke: jest.fn((claimHash: string) => {
        return __getMockSubmittableExtrinsic()
      }),
    },
    balances: {
      transfer: jest.fn(() => __getMockSubmittableExtrinsic()),
    },
    ctype: {
      add: jest.fn((hash, signature) => {
        return __getMockSubmittableExtrinsic()
      }),
    },
    delegation: {
      createHierarchy: jest.fn((rootId, _ctypeHash) => {
        return __getMockSubmittableExtrinsic()
      }),
      addDelegation: jest.fn((delegationId, parent_id, owner, permissions, signature) => {
        return __getMockSubmittableExtrinsic()
      }),
      revokeDelegation: jest.fn((delegationId) => {
        return __getMockSubmittableExtrinsic()
      }),
    },
    did: {
      add: jest.fn((sign_key, box_key, doc_ref) => {
        return __getMockSubmittableExtrinsic()
      }),
      remove: jest.fn(() => {
        return __getMockSubmittableExtrinsic()
      }),
    },
    portablegabi: {
      updateAccumulator: jest.fn((acc) => {
        // change the accumulator for each update
        accumulator.push(accumulator.length)
        return __getMockSubmittableExtrinsic()
      }),
    },
  },
  query: {
    system: {
      // default return value decodes to BN(0)
      // default return value decodes to AccountInfo with all entries holding BN(0)
      account: jest.fn(
        async (
          address: IPublicIdentity['address'],
          cb
        ): Promise<AccountInfoWithProviders> =>
          TYPE_REGISTRY.createType('AccountInfoWithProviders')
      ),
    },
    attestation: {
      // default return value decodes to [], represents no delegated attestations
      delegatedAttestations: jest.fn(async (id: string) =>
        mockChainQueryReturn('attestation', 'delegatedAttestations')
      ),
      /* example return value:
      new Vec(
        TYPE_REGISTRY
        'Hash',
        ['0x123', '0x456', '0x789']
      )
      */

      // default return value decodes to null, represents attestation not found
      attestations: jest.fn(async (claim_hash: string) =>
        mockChainQueryReturn('attestation', 'attestations')
      ),
      /* example return value:
      new Option(
        TYPE_REGISTRY,
        Tuple.with(['Hash', AccountId, 'Option<Hash>', Bool]),
        [
          '0x1234',                                            // ctype hash
          '4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',  // Account
          null,                                                // delegation-id?
          true,                                                // revoked flag
        ]
      )
      */
    },
    ctype: {
      // default return value decodes to null, represents CTYPE not found
      ctypes: jest.fn(async (hash: string) =>
        mockChainQueryReturn('ctype', 'cTYPEs')
      ),
    },
    delegation: {
      // default return value decodes to null, represents delegation not found
      hierarchies: jest.fn(async (rootId: string) =>
        mockChainQueryReturn('delegation', 'hierarchies')
      ),
      /* example return value:
      new Option(
        TYPE_REGISTRY,
        Hash,
        '0x1234',                                            // ctype hash
      )
      */

      // default return value decodes to null, represents delegation not found
      delegations: jest.fn(async (delegationId: string) =>
        mockChainQueryReturn('delegation', 'delegations')
      ),
      /* example return value:
      new Option(
        TYPE_REGISTRY,
        Tuple.with(['DelegationNodeId','Option<DelegationNodeId>','Vec<DelegationNodeId>',DelegationDetails]),
        [
          '0x1234',                                                     // root-id
          '0x1234',                                                     // parent-id?
          '[0x2345,0x3456]                                              // children ids
          '{4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs,false,0}', // {owner, revocation status, permissions}
        ]
      )
      */
    },
    did: {
      // default return value decodes to null, represents dID not found
      dIDs: jest.fn(async (address: string) =>
        mockChainQueryReturn('did', 'dIDs')
      ),
      /* example return value:
      new Option(
        TYPE_REGISTRY,
        Tuple.with(['Hash','Hash','Option<Bytes>']),
        [
          'publicSigningKey',                  // publicSigningKey
          'publicBoxKey',                      // publicBoxKey
          stringToHex('http://myDID.kilt.io'), // document store
        ]
      )
      */
    },
    portablegabi: {
      accumulatorList: jest.fn((address: string, index: number) =>
        mockChainQueryReturn('portablegabi', 'accumulatorList', accumulator)
      ),
      accumulatorCount: jest.fn((address: string) =>
        mockChainQueryReturn(
          'portablegabi',
          'accumulatorCount',
          new U64(TYPE_REGISTRY, 1)
        )
      ),
    },
  },
  runtimeMetadata: {
    asV11: {
      modules: [],
    },
  },
  registry: TYPE_REGISTRY,
}

BlockchainApiConnection.getConnectionOrConnect = getConnectionOrConnect
BlockchainApiConnection.__queueResults = __queueResults
BlockchainApiConnection.__setDefaultResult = __setDefaultResult
BlockchainApiConnection.__mocked_api = __mocked_api
BlockchainApiConnection.mockChainQueryReturn = mockChainQueryReturn

module.exports = BlockchainApiConnection
