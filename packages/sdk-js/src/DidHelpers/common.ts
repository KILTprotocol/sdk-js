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
import { Blockchain } from '@kiltprotocol/chain-helpers'
import {
  resolver as DidResolver,
  multibaseKeyToDidKey,
  signersForDid,
} from '@kiltprotocol/did'
import type { Did, HexString } from '@kiltprotocol/types'

import type {
  AcceptedPublicKeyEncodings,
  KeyMultibaseEncoded,
  SharedArguments,
  TransactionHandlers,
  TransactionResult,
} from './interfaces.js'

function mapError(err: SpRuntimeDispatchError, api: ApiPromise): Error {
  if (err.isModule) {
    const { docs, method, section } = api.registry.findMetaError(err.asModule)
    return new Error(`${section}.${method}: ${docs}`)
  }
  return new Error(`${err.type}: ${err.value.toHuman()}`)
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
  if ('status' in result) {
    txEvents = result.events ?? []
    switch (result.status.type) {
      case 'Finalized':
      case 'InBlock':
        // status must not be set here; this condition triggers a branch below
        // this is the block hash for both
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
  } else if (
    'blockHash' in result &&
    'txHash' in result &&
    typeof result.blockHash === 'string' &&
    typeof result.txHash === 'string'
  ) {
    const txHashHash = api.createType('Hash', result.blockHash)
    const {
      block: { block },
      events,
    } = await api.derive.tx.events(txHashHash)
    blockNumber = block.header.number.toBigInt()
    blockHash = result.blockHash
    const txIndex = block.extrinsics.findIndex((tx) =>
      tx.hash.eq(result.txHash)
    )
    txEvents = events.filter(
      ({ phase }) =>
        phase.isApplyExtrinsic && phase.asApplyExtrinsic.eqn(txIndex)
    )
  } else {
    status = 'unknown'
    error = new Error('missing blockHash and/or txHash')
  }
  if (typeof status !== 'string') {
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
    const eventMatch = expectedEvents.every(({ section, method }) =>
      txEvents.some(
        ({ event }) =>
          event.section.toLowerCase() === section.toLowerCase() &&
          event.method.toLowerCase() === method.toLowerCase()
      )
    )

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
  }
  return {
    status,
    get asFailed(): TransactionResult['asFailed'] {
      if (status !== 'failed') {
        throw new Error('')
      }
      return {
        error: error!,
        txHash: u8aToHex(u8aToU8a(result.txHash)),
        signers,
        didDocument,
        block: { hash: blockHash!, number: blockNumber! },
        events: txEvents.map(({ event }) => event),
      }
    },
    get asUnknown(): TransactionResult['asUnknown'] {
      if (status !== 'unknown') {
        throw new Error('')
      }
      return {
        error: error as Error,
        txHash: u8aToHex(u8aToU8a(result.txHash)),
      }
    },
    get asRejected(): TransactionResult['asRejected'] {
      if (status !== 'rejected') {
        throw new Error('')
      }
      return {
        error: error as Error,
        txHash: u8aToHex(u8aToU8a(result.txHash)),
        signers,
        didDocument,
      }
    },
    get asConfirmed(): TransactionResult['asConfirmed'] {
      if (status !== 'confirmed') {
        throw new Error('')
      }
      return {
        txHash: u8aToHex(u8aToU8a(result.txHash)),
        signers,
        didDocument: didDocument!,
        block: { hash: blockHash!, number: blockNumber! },
        events: txEvents.map(({ event }) => event),
      }
    },
  }
}

export async function submitImpl(
  getSubmittable: TransactionHandlers['getSubmittable'],
  options: Pick<SharedArguments, 'api'> & {
    didNonce?: number | BigInt
    awaitFinalized?: boolean
  }
): ReturnType<TransactionHandlers['submit']> {
  const submittable = await getSubmittable(options)

  const { awaitFinalized = true } = options
  const result = await Blockchain.submitSignedTx(
    options.api.tx(submittable.txHex),
    {
      resolveOn: awaitFinalized
        ? (res) => res.isFinalized || res.isError
        : (res) => res.isInBlock || res.isError,
      rejectOn: () => false,
    }
  )

  return submittable.checkResult(result)
}

export function convertPublicKey(pk: AcceptedPublicKeyEncodings): {
  publicKey: Uint8Array
  keyType: string
} {
  let didPublicKey: {
    publicKey: Uint8Array
    keyType: string
  }
  if (typeof pk === 'string') {
    didPublicKey = multibaseKeyToDidKey(pk)
  } else if ('publicKeyMultibase' in pk) {
    didPublicKey = multibaseKeyToDidKey(
      (pk as { publicKeyMultibase: KeyMultibaseEncoded }).publicKeyMultibase
    )
  } else if (
    'publicKey' in pk &&
    pk.publicKey.constructor.name === 'Uint8Array'
  ) {
    didPublicKey = {
      publicKey: pk.publicKey,
      keyType: pk.type,
    }
  } else {
    throw new Error('invalid public key')
  }
  return didPublicKey
}
