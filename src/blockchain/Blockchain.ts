/**
 * Blockchain bridges that connects the SDK and the KILT Blockchain.
 *
 * Communicates with the chain via WebSockets and can [[listenToBlocks]]. It exposes the [[submitTx]] function that performs a transaction.
 *
 * @packageDocumentation
 * @module Blockchain
 * @preferred
 */

import { ApiPromise } from '@polkadot/api'
import { SubmittableExtrinsic } from '@polkadot/api/promise/types'
import { Header, Index } from '@polkadot/types/interfaces/types'
import { Codec } from '@polkadot/types/types'
import { UInt } from '@polkadot/types'
import { ErrorHandler } from '../errorhandling/ErrorHandler'
import { factory as LoggerFactory } from '../config/ConfigLog'
import { ERROR_UNKNOWN, ExtrinsicError } from '../errorhandling/ExtrinsicError'
import Identity from '../identity/Identity'
import TxStatus from './TxStatus'
import { FINALIZED, DROPPED, INVALID } from '../const/TxStatus'

const log = LoggerFactory.getLogger('Blockchain')

export type QueryResult = Codec | undefined | null

export type Stats = {
  chain: Codec
  nodeName: Codec
  nodeVersion: Codec
}

export interface IBlockchainApi {
  api: ApiPromise
  getStats(): Promise<Stats>
  listenToBlocks(listener: (header: Header) => void): Promise<any> // TODO: change any to something meaningful
  submitTx(identity: Identity, tx: SubmittableExtrinsic): Promise<TxStatus>
  getNonce(accountAddress: string): Promise<Index>
}

// Code taken from
// https://polkadot.js.org/api/api/classes/_promise_index_.apipromise.html

export default class Blockchain implements IBlockchainApi {
  public static asArray(queryResult: QueryResult): any[] {
    const json =
      queryResult && queryResult.encodedLength ? queryResult.toJSON() : null
    if (json instanceof Array) {
      return json
    }
    return []
  }

  public api: ApiPromise
  public accountNonces: Map<Identity['address'], Index>
  private pending = false
  private nonceQueue: Array<(unlock: () => Promise<Index>) => void> = []

  public constructor(api: ApiPromise) {
    this.api = api
    this.errorHandler = new ErrorHandler(api)
    this.accountNonces = new Map<Identity['address'], Index>()
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
    const subscriptionId = await this.api.rpc.chain.subscribeNewHeads(listener)
    return subscriptionId
  }

  public async submitTx(
    identity: Identity,
    tx: SubmittableExtrinsic
  ): Promise<TxStatus> {
    const accountAddress = identity.address
    const nonce = await this.getNonce(accountAddress)
    if (nonce === new UInt(-1)) {
      throw new Error('Error while retrieving Nonce')
    } else {
      const signed = identity.signSubmittableExtrinsic(tx, nonce.toHex())
      log.info(`Submitting ${tx.method} with Nonce ${nonce}`)

      return new Promise<TxStatus>((resolve, reject) => {
        signed
          .send(result => {
            log.info(`Got tx status '${result.status.type}'`)

            const { status } = result
            if (ErrorHandler.extrinsicFailed(result)) {
              log.warn(`Extrinsic execution failed`)
              log.debug(
                `Transaction detail: ${JSON.stringify(result, null, 2)}`
              )
              const extrinsicError: ExtrinsicError =
                this.errorHandler.getExtrinsicError(result) || ERROR_UNKNOWN

              log.warn(`Extrinsic error ocurred: ${extrinsicError}`)
              reject(extrinsicError)
            }
            if (status.type === 'Finalized') {
              resolve(new TxStatus(status.type))
            } else if (status.type === 'Invalid' || status.type === 'Dropped') {
              reject(
                new Error(`Transaction failed with status '${status.type}'`)
              )
            }
          })
          .catch((err: Error) => {
            // just reject with the original tx error from the chain
            reject(err)
          })
      })
    }
  }

  public async getNonce(accountAddress: string): Promise<Index> {
    const unlock: () => Promise<Index> = await this.lock(accountAddress)
    const nonce: Index = await unlock()
    return nonce
  }

  private handleQueue(accountAddress: Identity['address']): void {
    if (this.nonceQueue.length > 0) {
      this.pending = true
      const queuedPromise = this.nonceQueue.shift()
      if (queuedPromise) {
        queuedPromise(async () => {
          let nonce: Index
          try {
            if (!this.accountNonces.has(accountAddress)) {
              nonce = await this.api.query.system.accountNonce<Index>(
                accountAddress
              )
              this.accountNonces.set(accountAddress, new UInt(nonce.addn(1)))
            } else {
              const temp = this.accountNonces.get(accountAddress)
              if (!temp) {
                throw new Error(
                  `Nonce Retrieval Failed for : ${accountAddress}`
                )
              } else {
                nonce = temp
                this.accountNonces.set(accountAddress, new UInt(temp.addn(1)))
              }
            }
          } catch (error) {
            log.error(error)
            nonce = new UInt(-1)
          }
          this.handleQueue(accountAddress)
          return nonce
        })
      }
    } else {
      this.pending = false
    }
  }

  private lock(
    accountAddress: Identity['address']
  ): Promise<() => Promise<Index>> {
    const lock = new Promise<() => Promise<Index>>(resolve =>
      this.nonceQueue.push(resolve)
    )
    if (!this.pending) {
      this.handleQueue(accountAddress)
    }
    return lock
  }
}
