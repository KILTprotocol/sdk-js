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
import type { FrameSystemEventRecord as EventRecord } from '@kiltprotocol/augment-api'
import { resolver as DidResolver, signersForDid } from '@kiltprotocol/did'
import type { Did, HexString } from '@kiltprotocol/types'
import type { SharedArguments, TransactionResult } from './interfaces.js'
import { assertStatus, mapError } from './common.js'

function checkEventsForErrors(
  api: ApiPromise,
  txEvents: EventRecord[] = []
): Error | undefined {
  let error
  txEvents.forEach(({ event }) => {
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
  })
  return error
}

// Note: returns `undefined` in the case of `status === "inBlock`.
function checkStatus(result: SubmittableResultValue): {
  status: TransactionResult['status'] | undefined
  error: Error | undefined
  blockHash: HexString | undefined
  blockNumber: BigInt | undefined
} {
  let status: TransactionResult['status'] | undefined
  let blockHash
  let blockNumber
  let error
  switch (result.status.type) {
    case 'Finalized':
    case 'InBlock':
      // status must not be set here; this condition triggers a branch below
      // this is the block hash for both
      status = undefined
      blockHash = result.status.value.toHex()
      if ('blockNumber' in result) {
        blockNumber = (result.blockNumber as BlockNumber).toBigInt()
      }
      break
    case 'Dropped':
    case 'FinalityTimeout':
    case 'Invalid':
    case 'Usurped':
      status = 'rejected'
      error = new Error(result.status.type)
      break
    case 'Broadcast':
    case 'Future':
    case 'Ready':
    case 'Retracted':
      status = 'unknown'
      error = new Error(result.status.type)
      break
    default:
      status = 'unknown'
      error = new Error(`unknown tx status variant ${result.status.type}`)
  }

  return {
    status,
    error,
    blockHash,
    blockNumber,
  }
}

async function resolveBlockAndEvents(
  result: { blockHash: HexString; txHash: HexString },
  api: ApiPromise
): Promise<{
  blockNumber: BigInt
  blockHash: HexString
  txEvents: EventRecord[]
}> {
  const txHashHash = api.createType('Hash', result.blockHash)
  const {
    block: { block },
    events,
  } = await api.derive.tx.events(txHashHash)
  const blockNumber = block.header.number.toBigInt()
  const { blockHash } = result
  const txIndex = block.extrinsics.findIndex((tx) => tx.hash.eq(result.txHash))
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
    const isSuccess = !error && eventMatch

    status = isSuccess ? 'confirmed' : 'failed'
    if (!isSuccess && !error) {
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
      }
    },
  }
}