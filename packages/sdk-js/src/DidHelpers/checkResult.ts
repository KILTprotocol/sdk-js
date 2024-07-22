/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable jsdoc/require-jsdoc */
// functions in this file are not meant to be public

import type { ApiPromise } from '@polkadot/api'
import type { SubmittableResultValue } from '@polkadot/api/types'
import type { BlockNumber } from '@polkadot/types/interfaces'
import { u8aToHex, u8aToU8a } from '@polkadot/util'
import type {
  FrameSystemEventRecord as EventRecord,
  SpRuntimeDispatchError,
} from '@kiltprotocol/augment-api'
import { resolver as DidResolver, signersForDid } from '@kiltprotocol/did'
import type { Did, HexString } from '@kiltprotocol/types'
import type { SharedArguments, TransactionResult } from './interfaces.js'

function mapError(err: SpRuntimeDispatchError, api: ApiPromise): Error {
  if (err.isModule) {
    const { docs, method, section } = api.registry.findMetaError(err.asModule)
    return new Error(`${section}.${method}: ${docs}`)
  }
  return new Error(`${err.type}: ${err.value.toHuman()}`)
}

function assertStatus(expected: string, actual?: string): void {
  if (actual !== expected) {
    const getterName = `as${expected.slice(0, 1).toUpperCase()}${expected.slice(
      1
    )}`
    throw new Error(`can't access '${getterName}' when status is '${actual}'`)
  }
}

function checkEventsForErrors(
  api: ApiPromise,
  txEvents: EventRecord[] = []
): Error | undefined {
  let error: Error | undefined
  txEvents.some(({ event }) => {
    if (api.events.system.ExtrinsicFailed.is(event)) {
      error = mapError(event.data[0], api)
    } else if (api.events.proxy.ProxyExecuted.is(event)) {
      const res = event.data[0]
      if (res.isErr) {
        error = mapError(res.asErr, api)
      }
    } else if (api.events.did.DidCallDispatched.is(event)) {
      const res = event.data[1]
      if (res.isErr) {
        error = mapError(res.asErr, api)
      }
    } else if (api.events.utility.ItemFailed.is(event)) {
      error = mapError(event.data[0], api)
    } else if (api.events.utility.BatchInterrupted.is(event)) {
      error = mapError(event.data[1], api)
    }
    if (typeof error !== 'undefined') {
      return true
    }
    return false
  })
  return error
}

// Note: returns `undefined` in the case of `status === "inBlock`.
function checkStatus(result: SubmittableResultValue): {
  status?: TransactionResult['status']
  error?: Error
  blockHash?: HexString
  blockNumber?: BigInt
} {
  let blockNumber: BigInt | undefined
  switch (result.status.type) {
    case 'Finalized':
    case 'InBlock':
      if ('blockNumber' in result) {
        blockNumber = (result.blockNumber as BlockNumber).toBigInt()
      }
      return {
        status: undefined,
        blockNumber,
        blockHash: result.status.value.toHex(),
      }
    case 'Dropped':
    case 'FinalityTimeout':
    case 'Invalid':
    case 'Usurped':
      return {
        status: 'rejected',
        error: new Error(result.status.type),
      }
    case 'Broadcast':
    case 'Future':
    case 'Ready':
    case 'Retracted':
      return {
        status: 'unknown',
        error: new Error(result.status.type),
      }
    default:
      return {
        status: 'unknown',
        error: new Error(`unknown tx status variant ${result.status.type}`),
      }
  }
}

async function resolveBlockAndEvents(
  blockInfo: { blockHash: HexString; txHash: HexString },
  api: ApiPromise
): Promise<{
  blockNumber: BigInt
  blockHash: HexString
  txEvents: EventRecord[]
}> {
  const txHashHash = api.createType('Hash', blockInfo.blockHash)
  const {
    block: { block },
    events,
  } = await api.derive.tx.events(txHashHash)
  const blockNumber = block.header.number.toBigInt()
  const { blockHash } = blockInfo
  const txIndex = block.extrinsics.findIndex((tx) =>
    tx.hash.eq(blockInfo.txHash)
  )
  const txEvents = events.filter(
    ({ phase }) => phase.isApplyExtrinsic && phase.asApplyExtrinsic.eqn(txIndex)
  )
  return { blockNumber, blockHash, txEvents }
}

function checkIfEventsMatch(
  expectedEvents: Array<{ section: string; method: string }>,
  txEvents: EventRecord[]
): boolean {
  return expectedEvents.every(({ section, method }) =>
    txEvents.some(
      ({ event }) =>
        event.section.toLowerCase() === section.toLowerCase() &&
        event.method.toLowerCase() === method.toLowerCase()
    )
  )
}

export async function checkResultImpl(
  result: { blockHash: HexString; txHash: HexString } | SubmittableResultValue,
  api: ApiPromise,
  expectedEvents: Array<{ section: string; method: string }> = [],
  did: Did,
  signersOrKeys: SharedArguments['signers']
): Promise<TransactionResult> {
  let txEvents: EventRecord[] = []
  let status: TransactionResult['status'] | undefined
  let error: Error | undefined
  let blockHash: HexString | undefined
  let blockNumber: BigInt | undefined

  // Case where `SubmittableResultValue` is provided.
  if ('status' in result) {
    txEvents = result.events ?? []
    ;({ status, blockHash, blockNumber, error } = checkStatus(result))
  }
  // Case where block hash and tx hash are provided.
  else if (
    'blockHash' in result &&
    'txHash' in result &&
    typeof result.blockHash === 'string' &&
    typeof result.txHash === 'string'
  ) {
    // Set blockNumber, blockHash, and the transactionEvents.
    ;({ blockNumber, blockHash, txEvents } = await resolveBlockAndEvents(
      result,
      api
    ))
  }
  // Type of the `result` argument is invalid.
  else {
    status = 'unknown'
    error = new Error('missing blockHash and/or txHash')
  }

  if (typeof status !== 'string') {
    const eventError = checkEventsForErrors(api, txEvents)
    if (eventError !== undefined) {
      error = eventError
    }

    const eventMatch = checkIfEventsMatch(expectedEvents, txEvents)

    status = !error && eventMatch ? 'confirmed' : 'failed'
    if (!error && !eventMatch) {
      error = new Error('did not find expected events')
    }
  }

  const { didDocument } = await DidResolver.resolve(did)
  if (blockHash && !blockNumber) {
    blockNumber = (
      await (await api.at(blockHash)).query.system.number()
    ).toBigInt()
  }
  let signers: Awaited<ReturnType<typeof signersForDid>>
  if (didDocument) {
    signers = await signersForDid(didDocument, ...signersOrKeys)
  } else if (status === 'confirmed') {
    status = 'unknown'
    error = new Error('failed to fetch DID document')
  }

  return {
    status,
    get asFailed(): TransactionResult['asFailed'] {
      assertStatus('failed', status)
      return {
        error: error ?? new Error('unknown error'),
        txHash: u8aToHex(u8aToU8a(result.txHash)),
        signers,
        didDocument,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        block: { hash: blockHash!, number: blockNumber! },
        events: txEvents.map(({ event }) => event),
        toJSON() {
          const clone = { ...this } as any
          clone.block = {
            ...clone.block,
            number: clone.block.number.toString(),
          }
          return clone
        },
      }
    },
    get asUnknown(): TransactionResult['asUnknown'] {
      assertStatus('unknown', status)
      return {
        error: error as Error,
        txHash: u8aToHex(u8aToU8a(result.txHash)),
      }
    },
    get asRejected(): TransactionResult['asRejected'] {
      assertStatus('rejected', status)
      return {
        error: error ?? new Error('unknown error'),
        txHash: u8aToHex(u8aToU8a(result.txHash)),
        signers,
        didDocument,
      }
    },
    get asConfirmed(): TransactionResult['asConfirmed'] {
      assertStatus('confirmed', status)
      return {
        txHash: u8aToHex(u8aToU8a(result.txHash)),
        signers,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        didDocument: didDocument!,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        block: { hash: blockHash!, number: blockNumber! },
        events: txEvents.map(({ event }) => event),
        toJSON() {
          const clone = { ...this } as any
          clone.block = {
            ...clone.block,
            number: clone.block.number.toString(),
          }
          return clone
        },
      }
    },
  }
}
