/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unused-vars */
// This module is not part of the public-facing api.
/* eslint-disable jsdoc/require-jsdoc */

/**
 * @ignore
 */

/**
 * Mock implementation of Substrate api calls that
 * require a connection to a Substrate blockchain.
 *
 * Transaction (tx) calls will return a mocked SubmittableExtrinsic containing a SubmittableResult
 * which will be returned when calling the `.send()` method.
 * This result defaults to `Finalized`, a default which can be changed by means of the `__setDefaultResult()` function:
 * After queue results have been consumed via tx calls, the mock implementation will resume returning the default result.
 *
 * Mocked query methods return representations of 'not present' by default, such as Option(..., null) or Vec(..., []).
 * You can set different return values during test execution by calling jest's return
 * value setters `.mockReturnValue` or `.mockReturnValueOnce` on the method you want to modify:
 * ```
 *   const api = getMockedApi()
 *   api.query.delegation.hierarchies.mockReturnValue(
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

import { ApiPromise, SubmittableResult } from '@polkadot/api'
import type {
  AccountInfoWithProviders,
  ExtrinsicStatus,
  Index,
} from '@polkadot/types/interfaces'
import { GenericEventData, TypeRegistry, U64 } from '@polkadot/types'
import type {
  ISubmittableResult,
  KiltAddress,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { mockChainQueryReturn } from './mockedApi.utils.js'
import { createRegistryFromMetadata } from './typeRegistry.js'

export interface MockApiPromise extends ApiPromise {
  __queueResults(results: Array<Partial<ExtrinsicStatus>>): void

  __setDefaultResult(status: Partial<ExtrinsicStatus>): void
}

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

  public addSignature(): this {
    const signature =
      this.signature.toHuman() !== undefined ? this.signature.toHuman()! + 1 : 0
    this.signature = {
      signed: true,
      toHuman: () => signature,
    }
    const nonce =
      this.nonce.toHuman() !== undefined ? this.nonce.toHuman()! + 1 : 0
    this.nonce = { toHuman: () => nonce }
    return this
  }

  public signAsync(): this {
    const signature = this.signature.toHuman() ?? 0
    this.signature = {
      signed: true,
      toHuman: () => signature,
    }
    const nonce = this.nonce.toHuman() ?? 0
    this.nonce = { toHuman: () => nonce }

    return this
  }

  public async send(
    callable: (...params: unknown[]) => void
  ): Promise<string | (() => void)> {
    if (typeof callable === 'function') {
      callable(this.result)
      return () => {}
    }
    return '0x123'
  }

  public async signAndSend(
    a: any,
    callable: (...params: unknown[]) => void
  ): Promise<string | (() => void)> {
    const signature = this.signature.toHuman() ?? 0
    this.signature = {
      signed: true,
      toHuman: () => signature,
    }
    const nonce = this.nonce.toHuman() ?? 0
    this.nonce = { toHuman: () => nonce }
    if (typeof callable === 'function') {
      callable(this.result)
      return () => {
        // noop
      }
    }
    return '0x123'
  }
}

function makeSubmittableResult(
  registry: TypeRegistry,
  opts: Partial<ExtrinsicStatus> = { isFinalized: true }
): ISubmittableResult {
  const status: ExtrinsicStatus = {
    isFinalized: false,
    isDropped: false,
    isInvalid: false,
    isUsurped: false,
    isFuture: false,
    isReady: false,
    ...opts,
  } as any
  const eventData = new GenericEventData(
    registry,
    new Uint8Array([0]),
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
            toHex: jest.fn(() => '0x0000'),
          },
          // portablegabi checks if a transaction was successful
          method: 'ExtrinsicSuccess',
        },
      } as any,
    ],
    txHash: registry.createType('Hash'),
  })
}

export function getMockedApi(): MockApiPromise {
  const TYPE_REGISTRY = createRegistryFromMetadata()

  const accumulator = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  const TxResultsQueue: ISubmittableResult[] = []
  let defaultTxResult: ISubmittableResult = makeSubmittableResult(
    TYPE_REGISTRY,
    { isFinalized: true }
  )

  function getMockSubmittableTx(): SubmittableExtrinsic {
    const result = TxResultsQueue.shift() || defaultTxResult
    return new MockSubmittableExtrinsic(result) as any as SubmittableExtrinsic
  }

  const MockedApi: any = {
    __queueResults: (results: Array<Partial<ExtrinsicStatus>>) => {
      results.forEach((status) => {
        TxResultsQueue.push(makeSubmittableResult(TYPE_REGISTRY, status))
      })
    },
    __setDefaultResult: (status: Partial<ExtrinsicStatus>) => {
      defaultTxResult = makeSubmittableResult(TYPE_REGISTRY, status)
    },
    on: jest.fn(),
    off: jest.fn(),
    once: jest.fn(),
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
    call: {
      didApi: {
        queryDid: jest.fn(),
        queryDidByAccountId: jest.fn(),
        queryDidByW3n: jest.fn(),
      },
      did: {
        query: jest.fn(),
        queryByAccount: jest.fn(),
        queryByWeb3Name: jest.fn(),
      },
      publicCredentials: {
        getById: jest.fn(),
        getBySubject: jest.fn(),
      },
    },
    tx: {
      attestation: {
        add: jest.fn((claimHash, _cTypeHash) => getMockSubmittableTx()),
        revoke: jest.fn((claimHash: string) => getMockSubmittableTx()),
        remove: jest.fn((claimHash: string) => getMockSubmittableTx()),
        reclaimDeposit: jest.fn((claimHash: string) => getMockSubmittableTx()),
      },
      balances: {
        transfer: jest.fn(() => getMockSubmittableTx()),
      },
      ctype: {
        add: jest.fn((hash, signature) => getMockSubmittableTx()),
      },
      delegation: {
        createHierarchy: jest.fn(() => getMockSubmittableTx()),
        addDelegation: jest.fn(() => getMockSubmittableTx()),
        revokeDelegation: jest.fn(() => getMockSubmittableTx()),
      },
      did: {
        add: jest.fn(() => getMockSubmittableTx()),
        remove: jest.fn(() => getMockSubmittableTx()),
      },
      portablegabi: {
        updateAccumulator: jest.fn((_acc) => {
          // change the accumulator for each update
          accumulator.push(accumulator.length)
          return getMockSubmittableTx()
        }),
      },
    },
    query: {
      system: {
        // default return value decodes to BN(0)
        // default return value decodes to AccountInfo with all entries holding BN(0)
        account: jest.fn(
          async (address: KiltAddress, cb): Promise<AccountInfoWithProviders> =>
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
        attestations: jest.fn(async (claimHash: string) =>
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
          '{
            '4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs,
            10
          }',                                                  // deposit details
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
          '{
            '4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs,
            10
          }',                                                           // deposit details
        ]
      )
      */
      },
      did: {
        // default return value decodes to null, represents dID not found
        did: jest.fn(async (address: string) =>
          mockChainQueryReturn('did', 'did')
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
        serviceEndpoints: jest.fn(async () =>
          mockChainQueryReturn('did', 'serviceEndpoints')
        ),
        didBlacklist: jest
          .fn()
          .mockReturnValue(mockChainQueryReturn('did', 'didBlacklist')),
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
      publicCredentials: {
        credentials: jest.fn(),
        credentialSubjects: jest.fn(),
      },
    },
    runtimeMetadata: {
      asV11: {
        modules: [],
      },
    },
    registry: TYPE_REGISTRY,
    hasSubscriptions: true,
  }
  MockedApi.query.did.serviceEndpoints.entries = jest.fn().mockReturnValue([])
  return MockedApi as MockApiPromise
}
