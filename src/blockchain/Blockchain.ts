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
import { Header, Index } from '@polkadot/types/interfaces/types'
import { AnyJson, Codec } from '@polkadot/types/types'
import { Evaluator, makeSubscriptionPromise } from '../util/SubscriptionPromise'
import { Text } from '@polkadot/types'
import { factory as LoggerFactory } from '../config/ConfigLog'
import { ErrorHandler } from '../errorhandling'
import { ERROR_UNKNOWN as UNKNOWN_EXTRINSIC_ERROR } from '../errorhandling/ExtrinsicError'
import Identity from '../identity/Identity'
import { ERROR_UNKNOWN } from '../errorhandling/SDKErrors'

const log = LoggerFactory.getLogger('Blockchain')

export type Stats = {
  chain: string
  nodeName: string
  nodeVersion: string
}

export type ResultEvaluator = Evaluator<SubmittableResult>

export interface SubscriptionPromiseOptions {
  resolveOn?: ResultEvaluator
  rejectOn?: ResultEvaluator
  timeout?: number
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
    opts?: SubscriptionPromiseOptions
  ): Promise<SubmittableResult>
  getNonce(accountAddress: string): Promise<Index>
}

export const IS_READY: ResultEvaluator = (result) => result.status.isReady
export const IS_IN_BLOCK: ResultEvaluator = (result) => result.isInBlock
export const EXTRINSIC_EXECUTED: ResultEvaluator = (result) =>
  ErrorHandler.extrinsicSuccessful(result)
export const IS_FINALIZED: ResultEvaluator = (result) => result.isFinalized

export const IS_ERROR: ResultEvaluator = (result) =>
  result.isError && ERROR_UNKNOWN()
export const EXTRINSIC_FAILED: ResultEvaluator = (result) =>
  ErrorHandler.extrinsicFailed(result) &&
  (ErrorHandler.getExtrinsicError(result) || UNKNOWN_EXTRINSIC_ERROR)

/**
 * Submits a signed [[SubmittableExtrinsic]] and attaches a callback to monitor the inclusion status of the transaction
 * and possible errors in the execution of extrinsics. Returns a promise to that end which by default resolves upon
 * finalization and rejects any errors occur during submission or execution of extrinsics. This behavior can be adjusted via optional parameters.
 *
 * Transaction fees will apply whenever a transaction fee makes it into a block, even if extrinsics fail to execute correctly!
 *
 * @param tx The [[SubmittableExtrinsic]] to be submitted. Most transactions need to be signed, this must be done beforehand.
 * @param resolveOn A function which triggers the resolution of the promise. Defaults to resolution on finalization.
 * @param rejectOn A function which triggers the rejection of the promise and specifies the rejection reason.
 * Defaults to rejection if either the submission of the transaction failed or if the execution of extrinsics emitted an error event.
 * @param timeout Optional timeout in ms. If set, an unresolved promise will reject after this period of time.
 * @returns A promise which can be used to track transaction status.
 * If resolved, this promise returns [[SubmittableResult]] that has led to its resolution.
 */
export async function submitSignedTx(
  tx: SubmittableExtrinsic,
  resolveOn: ResultEvaluator = IS_FINALIZED,
  rejectOn: ResultEvaluator = (result) =>
    IS_ERROR(result) || EXTRINSIC_FAILED(result),
  timeout?: number
): Promise<SubmittableResult> {
  log.info(`Submitting ${tx.method}`)
  const { promise, subscription } = makeSubscriptionPromise(
    resolveOn,
    rejectOn,
    timeout
  )
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
    opts: SubscriptionPromiseOptions = {}
  ): Promise<SubmittableResult> {
    return submitSignedTx(tx, opts.resolveOn, opts.rejectOn, opts.timeout)
  }

  public api: ApiPromise
  public readonly portablegabi: gabi.Blockchain
  private accountNonces: Map<Identity['address'], Index>

  private pending: Map<Identity['address'], boolean> = new Map<
    Identity['address'],
    boolean
  >()

  private nonceQueue: Map<
    Identity['address'],
    Array<(unlock: () => Promise<Index>) => void>
  > = new Map<
    Identity['address'],
    Array<(unlock: () => Promise<Index>) => void>
  >()

  public constructor(api: ApiPromise) {
    this.api = api
    this.portablegabi = new gabi.Blockchain('portablegabi', this.api as any)
    this.accountNonces = new Map<Identity['address'], Index>()
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
    opts: SubscriptionPromiseOptions = {}
  ): Promise<SubmittableResult> {
    const signedTx = await this.signTx(identity, tx)
    return Blockchain.submitSignedTx(signedTx, opts)
  }

  /**
   * Initiates the Nonce retrieval for the given identity.
   *
   * @param accountAddress The address of the identity that we retrieve the nonce for.
   * @returns Promise of the [[Index]] representation of the Transaction nonce of the identity.
   *
   */
  public async getNonce(accountAddress: string): Promise<Index> {
    // Initiate nonceRetrieval
    const unlock = await this.lock(accountAddress)
    // Await execution of the in handleQueue defined resolve function
    const nonce = await unlock()
    return nonce
  }

  /**
   * Creates Promise and queues it's resolve CB into nonceQueue for later processing, starts recursive execution of handleQueue.
   *
   * @param accountAddress The address of the identity that we retrieve the nonce for.
   * @returns The Promise with the queued up resolve CB.
   *
   */
  private lock(
    accountAddress: Identity['address']
  ): Promise<() => Promise<Index>> {
    // Create entry in pending Map for account.
    // Pending Map indicates whether the nonceQueue is being processed for the account
    if (!this.pending.has(accountAddress)) {
      this.pending.set(accountAddress, false)
    }
    // lock Promise, whose resolve CB is put into the nonceQueue for the specific account
    const lock = new Promise<() => Promise<Index>>((resolve) => {
      // if the queue doesn't exist for the account, create entry.
      if (!this.nonceQueue.has(accountAddress)) {
        this.nonceQueue.set(accountAddress, [resolve])
      } else {
        // if queue exists for account, append.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.nonceQueue.get(accountAddress)!.push(resolve)
      }
    })
    // If nonceQueue is not yet being processed for the account, start now.
    if (!this.pending.get(accountAddress)) {
      this.handleQueue(accountAddress)
    }
    // The promise, whose resolve CB was put into nonceQueue and is getting resolved inside handleQueue.
    return lock
  }

  /**
   * Handles the entries in nonceQueue for accountAddress, resolves the resolve() with the actual anonymous function for nonce retrieval and recursion.
   *
   * @param accountAddress The address of the identity that we handle nonceQueue for.
   */
  private handleQueue(accountAddress: Identity['address']): void {
    // Check whether nonceQueue has entries for account
    if ((this.nonceQueue.get(accountAddress) || []).length > 0) {
      // Set pending map to true for account, indicating that nonceQueue is being processed for account.
      this.pending.set(accountAddress, true)
      // Retrieve the resolve CB put into nonceQueue in lock
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const resolve = this.nonceQueue.get(accountAddress)!.shift()
      if (resolve) {
        // resolve with a function that returns the retrieveNonce Promise
        resolve(async () => {
          const nonce = await this.retrieveNonce(accountAddress)
          // recursive execution of handleQueue
          this.handleQueue(accountAddress)
          return nonce
        })
      }
    } else {
      // if account is not registered or has no entries in nonceQueue
      // set pending for account to false and remove accountNonces entry for account.
      this.pending.set(accountAddress, false)
      this.accountNonces.delete(accountAddress)
    }
  }

  /**
   * Retrieves the Nonce for the specific account either directly from the API or from the previously to the account mapped accountNonce.
   *
   * @param accountAddress The address of the identity that we handle nonceQueue for.
   * @returns Promise of the [[Index]] representation of the Transaction nonce of the identity.
   */
  private async retrieveNonce(
    accountAddress: Identity['address']
  ): Promise<Index> {
    let nonce: Index
    if (!this.accountNonces.has(accountAddress)) {
      nonce = await this.api.rpc.system.accountNextIndex<Index>(accountAddress)
      this.accountNonces.set(
        accountAddress,
        this.api.registry.createType('Index', nonce.addn(1))
      )
    } else {
      const temp: Index | undefined = this.accountNonces.get(accountAddress)
      if (!temp) {
        throw new Error(`Nonce Retrieval Failed for : ${accountAddress}`)
      } else {
        nonce = temp
        this.accountNonces.set(
          accountAddress,
          this.api.registry.createType('Index', nonce.addn(1))
        )
      }
    }
    return nonce
  }

  private resetAccountQueue(accountAddress: Identity['address']): void {
    if (this.pending.has(accountAddress) && !this.pending.get(accountAddress)) {
      this.accountNonces.delete(accountAddress)
    }
  }
}
