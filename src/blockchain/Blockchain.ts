/**
 * Blockchain bridges that connects the SDK and the KILT Blockchain.
 *
 * Communicates with the chain via WebSockets and can [[listenToBlocks]]. It exposes the [[submitTx]] function that performs a transaction.
 *
 * @packageDocumentation
 * @module Blockchain
 * @preferred
 */

import { ApiPromise, SubmittableResult } from '@polkadot/api'
import { SubmittableExtrinsic } from '@polkadot/api/promise/types'
import { Header } from '@polkadot/types/interfaces/types'
import { Codec, AnyJson } from '@polkadot/types/types'
import * as gabi from '@kiltprotocol/portablegabi'
import { ErrorHandler } from '../errorhandling/ErrorHandler'
import { factory as LoggerFactory } from '../config/ConfigLog'
import { ERROR_UNKNOWN, ExtrinsicError } from '../errorhandling/ExtrinsicError'
import Identity from '../identity/Identity'

const log = LoggerFactory.getLogger('Blockchain')

export type QueryResult = Codec | undefined | null

export type Stats = {
  chain: Codec
  nodeName: Codec
  nodeVersion: Codec
}

export interface IBlockchainApi {
  api: ApiPromise
  portablegabi: gabi.Blockchain

  getStats(): Promise<Stats>
  listenToBlocks(listener: (header: Header) => void): Promise<() => void>
  submitTx(
    identity: Identity,
    tx: SubmittableExtrinsic
  ): Promise<SubmittableResult>
  getNonce(accountAddress: string): Promise<Codec>
}

// Code taken from
// https://polkadot.js.org/api/api/classes/_promise_index_.apipromise.html

export default class Blockchain implements IBlockchainApi {
  public static asArray(queryResult: QueryResult): AnyJson[] {
    const json =
      queryResult && queryResult.encodedLength ? queryResult.toJSON() : null
    if (json instanceof Array) {
      return json
    }
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
    const [chain, nodeName, nodeVersion] = await Promise.all([
      this.api.rpc.system.chain(),
      this.api.rpc.system.name(),
      this.api.rpc.system.version(),
    ])

    return { chain, nodeName, nodeVersion }
  }

  // TODO: implement unsubscribe as subscriptionId continuously increases
  public async listenToBlocks(
    listener: (header: Header) => void
  ): Promise<() => void> {
    return this.api.rpc.chain.subscribeNewHeads(listener)
  }

  public async submitTx(
    identity: Identity,
    tx: SubmittableExtrinsic
  ): Promise<SubmittableResult> {
    log.info(`Submitting ${tx.method}`)

    return new Promise<SubmittableResult>((resolve, reject) => {
      tx.signAndSend(identity.signKeyringPair, (result) => {
        log.info(`Got tx status '${result.status.type}'`)

        const { status } = result
        if (ErrorHandler.extrinsicFailed(result)) {
          log.warn(`Extrinsic execution failed`)
          log.debug(`Transaction detail: ${JSON.stringify(result, null, 2)}`)
          const extrinsicError: ExtrinsicError =
            this.errorHandler.getExtrinsicError(result) || ERROR_UNKNOWN

          log.warn(`Extrinsic error occurred: ${extrinsicError}`)
          reject(extrinsicError)
        }
        if (result.isFinalized) {
          resolve(result)
        } else if (result.isError) {
          reject(new Error(`Transaction failed with status '${status.type}'`))
        }
      }).catch((err: Error) => {
        // just reject with the original tx error from the chain
        reject(err)
      })
    })
  }

  public async getNonce(accountAddress: string): Promise<Codec> {
    const info = await this.api.query.system.account(accountAddress)
    if (!info || !info.nonce) {
      throw Error(`Nonce not found for account ${accountAddress}`)
    }

    return info.nonce
  }
}
