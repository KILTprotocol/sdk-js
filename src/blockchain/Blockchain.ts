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
import { factory as LoggerFactory } from '../config/ConfigLog'
import { ErrorHandler } from '../errorhandling/ErrorHandler'
import { ERROR_UNKNOWN, ExtrinsicError } from '../errorhandling/ExtrinsicError'
import Identity from '../identity/Identity'

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
    tx: SubmittableExtrinsic,
    resolveOn: (result: SubmittableResult) => boolean
  ): Promise<SubmittableResult>
  getNonce(accountAddress: string): Promise<Codec>
}

export const AWAIT_READY = (result: SubmittableResult) => result.status.isReady
export const AWAIT_IN_BLOCK = (result: SubmittableResult) => result.isInBlock
export const AWAIT_FINALIZED = (result: SubmittableResult) => result.isFinalized

// Code taken from
// https://polkadot.js.org/api/api/classes/_promise_index_.apipromise.html

export default class Blockchain implements IBlockchainApi {
  public static asArray(queryResult: Codec): AnyJson[] {
    const json = queryResult.toJSON()
    if (json instanceof Array) return json
    return []
  }

  public api: ApiPromise
  public readonly ready: Promise<boolean>
  public readonly portablegabi: gabi.Blockchain

  public constructor(api: ApiPromise) {
    this.api = api
    this.errorHandler = new ErrorHandler(api)
    this.ready = this.errorHandler.ready
    this.portablegabi = new gabi.Blockchain('portablegabi', this.api as any)
  }

  private errorHandler: ErrorHandler

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
    tx: SubmittableExtrinsic,
    resolveOn: (result: SubmittableResult) => boolean = (result) =>
      result.isFinalized
  ): Promise<SubmittableResult> {
    log.info(`Submitting ${tx.method}`)
    let unsubscribe: () => void
    return new Promise<SubmittableResult>((resolve, reject) => {
      tx.send((result) => {
        log.info(`Got tx status '${result.status.type}'`)
        if (ErrorHandler.extrinsicFailed(result)) {
          log.warn(`Extrinsic execution failed`)
          log.debug(`Transaction detail: ${JSON.stringify(result, null, 2)}`)
          const extrinsicError: ExtrinsicError =
            this.errorHandler.getExtrinsicError(result) || ERROR_UNKNOWN
          log.warn(`Extrinsic error ocurred: ${extrinsicError}`)
          reject(extrinsicError)
        } else if (result.isError) {
          reject(
            new Error(`Transaction failed with status '${result.status.type}'`)
          )
        } else if (resolveOn(result)) {
          resolve(result)
        }
      })
        .then((cb) => {
          unsubscribe = cb
        })
        // not sure we need this final catch block
        .catch((err: Error) => {
          // just reject with the original tx error from the chain
          reject(err)
        })
    }).finally(() => {
      if (unsubscribe) unsubscribe()
    })
  }

  public async getNonce(accountAddress: string): Promise<Index> {
    return this.api.rpc.system.accountNextIndex(accountAddress)
  }
}
