/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ApiPromise } from '@polkadot/api'
import type { SubmittableResultValue } from '@polkadot/api/types'
import type { BlockNumber, Extrinsic } from '@polkadot/types/interfaces'
import { u8aToHex, u8aToU8a } from '@polkadot/util'

import {
  FrameSystemEventRecord as EventRecord,
  SpRuntimeDispatchError,
} from '@kiltprotocol/augment-api'
import {
  authorizeTx,
  signersForDid,
  resolver as DidResolver,
} from '@kiltprotocol/did'
import {
  KiltAddress,
  type Did,
  type DidUrl,
  type HexString,
  type SignerInterface,
  type SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { Signers } from '@kiltprotocol/utils'
import { Blockchain } from '@kiltprotocol/chain-helpers'

import type {
  SharedArguments,
  TransactionHandlers,
  TransactionResult,
} from './interfaces.js'

export { createDid } from './createDid.js'

/**
 * Selects and returns a DID signer for a given purpose and algorithm.
 *
 * @param options All options.
 * @param options.signers Signers from which to choose from; can also be `KeyringPair` instances or other key pair representations.
 * @param options.relationship Which verification relationship the key should have to the DID.
 * Defaults to `authentication`.
 * @param options.algorithm Optionally filter signers by algorithm(s).
 * @param options.didDocument The DID's DID document.
 */
export async function selectSigner({
  didDocument,
  signers,
  relationship = 'authentication',
  algorithm,
}: Pick<SharedArguments, 'didDocument' | 'signers'> & {
  relationship?: string
  algorithm?: string | string[]
}): Promise<SignerInterface<string, DidUrl> | undefined> {
  const mappedSigners = await signersForDid(didDocument, ...signers)
  const selectors = [
    Signers.select.byDid(didDocument, {
      verificationRelationship: relationship,
    }),
  ]
  if (typeof algorithm !== 'undefined') {
    Signers.select.byAlgorithm(
      Array.isArray(algorithm) ? algorithm : [algorithm]
    )
  }

  return Signers.selectSigner(mappedSigners, ...selectors)
}

function mapError(err: SpRuntimeDispatchError, api: ApiPromise): Error {
  if (err.isModule) {
    const { docs, method, section } = api.findError(err.asModule.index.toU8a())
    return new Error(`${section}.${method}: ${docs}`)
  }
  return new Error(`${err.type}: ${err.value.toHuman()}`)
}

async function checkResult(
  result: { blockHash: HexString; txHash: HexString } | SubmittableResultValue,
  api: ApiPromise,
  expectedEvents: Array<{ section: string; method: string }>,
  did: Did,
  signers: SignerInterface[]
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
        // status = 'confirmed'
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

/**
 * Instructs a transaction (state transition) as this DID (with this DID as the origin).
 *
 * @param options
 * @param options.call The transaction / call to execute.
 * @returns
 */
export function transact(
  options: SharedArguments & {
    call: Extrinsic | SubmittableExtrinsic
    expectedEvents: Array<{ section: string; method: string }>
  }
): TransactionHandlers {
  const submitterAccount = (
    'address' in options.submitter
      ? options.submitter.address
      : options.submitter.id
  ) as KiltAddress

  const submit: TransactionHandlers['submit'] = async ({
    awaitFinalized = true,
    didNonce,
  } = {}) => {
    const didSigners = await signersForDid(
      options.didDocument,
      ...options.signers
    )

    let authorized: SubmittableExtrinsic

    if (!('send' in options.call)) {
      authorized = await authorizeTx(
        options.didDocument,
        options.call,
        didSigners,
        submitterAccount,
        { txCounter: options.api.createType('u64', didNonce) }
      )
    } else {
      authorized = options.call as SubmittableExtrinsic
    }

    const result = await Blockchain.signAndSubmitTx(
      authorized,
      options.submitter,
      {
        resolveOn: awaitFinalized
          ? (res) => res.isFinalized || res.isError
          : (res) => res.isInBlock || res.isError,
        rejectOn: () => false,
      }
    )

    return checkResult(
      result,
      options.api,
      options.expectedEvents,
      options.didDocument.id,
      didSigners
    )
  }

  const getSubmittable: TransactionHandlers['getSubmittable'] = async (
    submitOptions:
      | {
          signSubmittable?: boolean // default: true
          didNonce?: number | BigInt
        }
      | undefined = {}
  ) => {
    const didSigners = await signersForDid(
      options.didDocument,
      ...options.signers
    )

    let authorized: SubmittableExtrinsic

    if (!('send' in options.call)) {
      authorized = await authorizeTx(
        options.didDocument,
        options.call,
        didSigners,
        submitterAccount,
        { txCounter: options.api.createType('u64', submitOptions.didNonce) }
      )
    } else {
      authorized = options.call
    }

    let signedHex
    const { signSubmittable = true } = submitOptions
    if (signSubmittable) {
      const signed =
        'address' in options.submitter
          ? await authorized.signAsync(options.submitter)
          : await authorized.signAsync(submitterAccount, {
              signer: Signers.getPolkadotSigner([options.submitter]),
            })
      signedHex = signed.toHex()
    } else {
      signedHex = authorized.toHex()
    }

    return {
      txHex: signedHex,
      checkResult: (input) =>
        checkResult(
          input,
          options.api,
          options.expectedEvents,
          options.didDocument.id,
          didSigners
        ),
    }
  }

  return {
    submit,
    getSubmittable,
  }
}
