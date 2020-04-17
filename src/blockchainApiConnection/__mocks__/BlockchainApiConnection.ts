/**
 * @module BlockchainApiConnection
 */

/**
 * Dummy comment needed for correct doc display, do not remove
 */
import Blockchain, { IBlockchainApi } from '../../blockchain/Blockchain'
import { ApiPromise, SubmittableResult } from '@polkadot/api'
import { Option, Tuple, Vec, Text } from '@polkadot/types'
import BN from 'bn.js'
import { SubmittableExtrinsic } from '@polkadot/api/promise/types'
import { ExtrinsicStatus } from '@polkadot/types/interfaces'

const BlockchainApiConnection = jest.requireActual('../BlockchainApiConnection')

async function getCached(
  _: string = BlockchainApiConnection.DEFAULT_WS_ADDRESS
): Promise<IBlockchainApi> {
  if (!BlockchainApiConnection.instance) {
    BlockchainApiConnection.instance = Promise.resolve(
      new Blockchain(__mocked_api as ApiPromise)
    )
  }
  return BlockchainApiConnection.instance
}

const TxresultsQueue: SubmittableResult[] = []
let defaultTxResult: SubmittableResult = __makeSubmittableResult(true)

class MockSubmittableExtrinsic {
  result: SubmittableResult
  method: string = 'mock tx'

  constructor(result: SubmittableResult) {
    this.result = result
  }

  public sign(_a: any, _b: any, _c: any) {
    return this
  }

  public send(callable: Function) {
    if (callable) {
      callable(this.result)
    }
  }
}

function __getMockSubmittableExtrinsic(): SubmittableExtrinsic {
  const result: SubmittableResult = TxresultsQueue.shift() || defaultTxResult
  return (new MockSubmittableExtrinsic(result) as any) as SubmittableExtrinsic
}

function __makeSubmittableResult(success: boolean): SubmittableResult {
  const status: ExtrinsicStatus = {
    type: success ? 'Finalized' : 'Invalid',
    isFinalized: success,
    isDropped: false,
    isInvalid: !success,
    isUsurped: false,
    isFuture: false,
    isReady: true,
  } as any

  return new SubmittableResult({
    status,
  })
}

function __queueResults(results: boolean[]) {
  results.forEach(success => {
    TxresultsQueue.push(__makeSubmittableResult(success))
  })
}

function __setDefaultResult(success: boolean) {
  defaultTxResult = __makeSubmittableResult(success)
}

const __mocked_api: any = {
  tx: {
    attestation: {
      add: jest.fn((claimHash, _cTypeHash) => {
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
      createRoot: jest.fn((rootId, _ctypeHash) => {
        return __getMockSubmittableExtrinsic()
      }),
      revokeRoot: jest.fn(rootId => {
        return __getMockSubmittableExtrinsic()
      }),
      revokeDelegation: jest.fn(delegationId => {
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
  },
  query: {
    system: { accountNonce: jest.fn(() => new Text('12345')) },
    attestation: {
      delegatedAttestations: jest.fn(),
      attestations: jest.fn(),
    },
    balances: {
      freeBalance: jest.fn((account: string) => new BN(0)),
    },
    ctype: {
      cTYPEs: jest.fn(hash => true),
    },
    delegation: {
      root: jest.fn((rootId: string) => new Option(Tuple)),
      delegations: jest.fn((delegationId: string) => new Option(Tuple)),
      children: jest.fn((id: string) => new Vec(Text, [])),
    },
    did: {
      dIDs: jest.fn(id => new Option(Tuple)),
    },
  },
  runtimeMetadata: {
    asV4: {
      modules: [],
    },
  },
}

BlockchainApiConnection.getCached = getCached
BlockchainApiConnection.__queueResults = __queueResults
BlockchainApiConnection.__setDefaultResult = __setDefaultResult
BlockchainApiConnection.__mocked_api = __mocked_api

module.exports = BlockchainApiConnection
module.exports.default = BlockchainApiConnection.getCached
