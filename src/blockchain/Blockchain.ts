/**
 * Blockchain bridges that connects the SDK and the KILT Blockchain.
 *
 * Communicates with the chain via WebSockets and can [[listenToBlocks]]. It exposes the [[submitTx]] function that performs a transaction.
 *
 * @packageDocumentation
 * @module Blockchain
 * @preferred
 */

import * as gabi from '@kiltprotocol/portablegabi'
import { ApiPromise, SubmittableResult } from '@polkadot/api'
import { SubmittableExtrinsic } from '@polkadot/api/promise/types'
import { Text } from '@polkadot/types'
import { Header, Index } from '@polkadot/types/interfaces/types'
import { AnyJson, Codec } from '@polkadot/types/types'
import { Evaluator, makeSubscriptionPromise } from '../util/SubscriptionPromise'
import { factory as LoggerFactory } from '../config/ConfigLog'
import { ErrorHandler } from '../errorhandling'
import {
  ERROR_UNKNOWN as UNKNOWN_EXTRINSIC_ERROR,
  ExtrinsicError,
} from '../errorhandling/ExtrinsicError'
import Identity from '../identity/Identity'
import { ERROR_UNKNOWN, SDKError } from '../errorhandling/SDKErrors'

const log = LoggerFactory.getLogger('Blockchain')

export type Stats = {
  chain: string
  nodeName: string
  nodeVersion: string
}

export interface IBlockchainApi {
  api: ApiPromise
  portablegabi: gabi.Blockchain

  getStats(): Promise<Stats>
  listenToBlocks(listener: (header: Header) => void): Promise<() => void>
  signTx(
    identity: Identity,
    tx: SubmittableExtrinsic
  ): Promise<SubmittableExtrinsic>
  submitTx(
    identity: Identity,
    tx: SubmittableExtrinsic,
    opts?: {
      resolveOn?: Array<Evaluator<SubmittableResult, SubmittableResult>>
      rejectOn?: Array<Evaluator<SubmittableResult, any>>
    }
  ): Promise<SubmittableResult>
  getNonce(accountAddress: string): Promise<Codec>
}

export const IS_READY: Evaluator<SubmittableResult, SubmittableResult> = (
  result
) => [result.status.isReady, result]
export const IS_IN_BLOCK: Evaluator<SubmittableResult, SubmittableResult> = (
  result
) => [result.isInBlock, result]
export const EXTRINSIC_EXECUTED: Evaluator<
  SubmittableResult,
  SubmittableResult
> = (result) => [ErrorHandler.extrinsicSuccessful(result), result]
export const IS_FINALIZED: Evaluator<SubmittableResult, SubmittableResult> = (
  result
) => [result.isFinalized, result]

export const IS_ERROR: Evaluator<SubmittableResult, SDKError | null> = (
  result
) => (result.isError ? [true, ERROR_UNKNOWN()] : [false, null])
export const EXTRINSIC_FAILED: Evaluator<
  SubmittableResult,
  ExtrinsicError | null
> = (result) =>
  ErrorHandler.extrinsicFailed(result)
    ? [true, ErrorHandler.getExtrinsicError(result) || UNKNOWN_EXTRINSIC_ERROR]
    : [false, null]

export async function submitSignedTx(
  tx: SubmittableExtrinsic,
  resolveOn: Array<Evaluator<SubmittableResult, SubmittableResult>> = [
    IS_FINALIZED,
  ],
  rejectOn: Array<Evaluator<SubmittableResult, any>> = [
    EXTRINSIC_FAILED,
    IS_ERROR,
  ]
): Promise<SubmittableResult> {
  log.info(`Submitting ${tx.method}`)
  const { promise, subscription } = makeSubscriptionPromise(resolveOn, rejectOn)
  const unsubscribe = await tx.send(subscription)
  return promise.finally(() => unsubscribe())
}

// Code taken from
// https://polkadot.js.org/api/api/classes/_promise_index_.apipromise.html

export default class Blockchain implements IBlockchainApi {
  public static asArray(queryResult: Codec): AnyJson[] {
    const json = queryResult.toJSON()
    if (json instanceof Array) return json
    return []
  }

  public static submitSignedTx(
    tx: SubmittableExtrinsic,
    opts: {
      resolveOn?: Array<Evaluator<SubmittableResult, SubmittableResult>>
      rejectOn?: Array<Evaluator<SubmittableResult, any>>
    }
  ): Promise<SubmittableResult> {
    return submitSignedTx(tx, opts.resolveOn, opts.rejectOn)
  }

  public api: ApiPromise
  public readonly portablegabi: gabi.Blockchain

  public constructor(api: ApiPromise) {
    this.api = api
    this.portablegabi = new gabi.Blockchain('portablegabi', this.api as any)
  }

  public async getStats(): Promise<Stats> {
    const encoded: Text[] = await Promise.all([
      this.api.rpc.system.chain(),
      this.api.rpc.system.name(),
      this.api.rpc.system.version(),
    ])
    const [chain, nodeName, nodeVersion] = encoded.map((el) => el.toString())
    return { chain, nodeName, nodeVersion }
  }

  // TODO: implement unsubscribe as subscriptionId continuously increases
  public async listenToBlocks(
    listener: (header: Header) => void
  ): Promise<() => void> {
    return this.api.rpc.chain.subscribeNewHeads(listener)
  }

  public async signTx(
    identity: Identity,
    tx: SubmittableExtrinsic
  ): Promise<SubmittableExtrinsic> {
    const nonce = await this.getNonce(identity.address)
    const signed: SubmittableExtrinsic = identity.signSubmittableExtrinsic(
      tx,
      nonce.toHex()
    )
    return signed
  }

  public async submitTx(
    identity: Identity,
    tx: SubmittableExtrinsic,
    opts: {
      resolveOn?: Array<Evaluator<SubmittableResult, SubmittableResult>>
      rejectOn?: Array<Evaluator<SubmittableResult, any>>
    }
  ): Promise<SubmittableResult> {
    const signedTx = await this.signTx(identity, tx)
    return Blockchain.submitSignedTx(signedTx, opts)
  }

  public async getNonce(accountAddress: string): Promise<Index> {
    return this.api.rpc.system.accountNextIndex(accountAddress)
  }
}
