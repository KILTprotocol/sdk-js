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
import { Header } from '@polkadot/types/interfaces/types'
import { AnyJson, Codec } from '@polkadot/types/types'
import { Text } from '@polkadot/types'
import { SignerPayloadJSON } from '@polkadot/types/types/extrinsic'
import BN from 'bn.js'
import {
  ERROR_TRANSACTION_RECOVERABLE,
  ERROR_TRANSACTION_USURPED,
} from '../errorhandling/SDKErrors'
import {
  Evaluator,
  makeSubscriptionPromise,
  TerminationOptions,
} from '../util/SubscriptionPromise'
import { factory as LoggerFactory } from '../config/ConfigLog'
import { ErrorHandler } from '../errorhandling'
import { ERROR_UNKNOWN as UNKNOWN_EXTRINSIC_ERROR } from '../errorhandling/ExtrinsicError'
import Identity from '../identity/Identity'
import getCached from '../blockchainApiConnection'

const log = LoggerFactory.getLogger('Blockchain')

export type Stats = {
  chain: string
  nodeName: string
  nodeVersion: string
}

export type ResultEvaluator = Evaluator<SubmittableResult>
export type ErrorEvaluator = Evaluator<Error>
export type SubscriptionPromiseOptions = TerminationOptions<SubmittableResult>
export interface IBlockchainApi {
  api: ApiPromise
  portablegabi: gabi.Blockchain

  getStats(): Promise<Stats>
  listenToBlocks(listener: (header: Header) => void): Promise<() => void>
  signTx(
    identity: Identity,
    tx: SubmittableExtrinsic
  ): Promise<SubmittableExtrinsic>
  submitSignedTx(
    identity: Identity,
    tx: SubmittableExtrinsic,
    opts?: SubscriptionPromiseOptions
  ): Promise<SubmittableResult>
  submitTx(
    identity: Identity,
    tx: SubmittableExtrinsic,
    opts?: SubscriptionPromiseOptions
  ): Promise<SubmittableResult>
  getNonce(accountAddress: string): Promise<BN>
  reSignTx(
    identity: Identity,
    tx: SubmittableExtrinsic
  ): Promise<SubmittableExtrinsic>
}

const TxOutdated = '1010: Invalid Transaction: Transaction is outdated'
const TxPriority = '1014: Priority is too low:'
const TxAlreadyImported = 'Transaction Already'
export const IS_RELEVANT_ERROR: ErrorEvaluator = (err: Error) => {
  return err.message.includes(TxOutdated || TxPriority || TxAlreadyImported)
}
export const IS_READY: ResultEvaluator = (result) => result.status.isReady
export const IS_IN_BLOCK: ResultEvaluator = (result) => result.isInBlock
export const EXTRINSIC_EXECUTED: ResultEvaluator = (result) =>
  ErrorHandler.extrinsicSuccessful(result)
export const IS_FINALIZED: ResultEvaluator = (result) => result.isFinalized
export const IS_USURPED: ResultEvaluator = (result) =>
  result.status.isUsurped && ERROR_TRANSACTION_USURPED()
export const IS_ERROR: ResultEvaluator = (result) => {
  return (
    (result.status.isDropped && Error('isDropped')) ||
    (result.status.isInvalid && Error('isInvalid')) ||
    (result.status.isFinalityTimeout && Error('isFinalityTimeout'))
  )
}
export const EXTRINSIC_FAILED: ResultEvaluator = (result) => {
  return (
    ErrorHandler.extrinsicFailed(result) &&
    (ErrorHandler.getExtrinsicError(result) || UNKNOWN_EXTRINSIC_ERROR)
  )
}

/**
 * Parses potentially incomplete or undefined options and returns complete [[SubscriptionPromiseOptions]].
 *
 * @param opts Potentially undefined or partial [[SubscriptionPromiseOptions]] .
 * @returns Complete [[SubscriptionPromiseOptions]], with potentially defaulted values.
 */
export function parseSubscriptionOptions(
  opts?: Partial<SubscriptionPromiseOptions>
): SubscriptionPromiseOptions {
  const {
    resolveOn = IS_FINALIZED,
    rejectOn = (result: SubmittableResult) =>
      IS_ERROR(result) || EXTRINSIC_FAILED(result) || IS_USURPED(result),
    timeout,
  } = { ...opts }
  return { resolveOn, rejectOn, timeout }
}

/**
 * [ASYNC] Submits a signed [[SubmittableExtrinsic]] and attaches a callback to monitor the inclusion status of the transaction
 * and possible errors in the execution of extrinsics. Returns a promise to that end which by default resolves upon
 * finalization and rejects any errors occur during submission or execution of extrinsics. This behavior can be adjusted via optional parameters.
 *
 * Transaction fees will apply whenever a transaction fee makes it into a block, even if extrinsics fail to execute correctly!
 *
 * @param tx The [[SubmittableExtrinsic]] to be submitted. Most transactions need to be signed, this must be done beforehand.
 * @param opts [[SubscriptionPromiseOptions]]: Criteria for resolving/rejecting the promise.
 * @returns A promise which can be used to track transaction status.
 * If resolved, this promise returns [[SubmittableResult]] that has led to its resolution.
 */
export async function submitSignedTx(
  tx: SubmittableExtrinsic,
  opts: SubscriptionPromiseOptions
): Promise<SubmittableResult> {
  const { promise, subscription } = makeSubscriptionPromise(opts)

  const unsubscribe = await tx
    .send(subscription)
    .catch(async (reason: Error) => {
      if (IS_RELEVANT_ERROR(reason)) {
        return Promise.reject(ERROR_TRANSACTION_RECOVERABLE())
      }
      return Promise.reject(reason)
    })

  const result = await promise
    .catch(async (reason: Error) => {
      if (reason.message === ERROR_TRANSACTION_USURPED().message) {
        return Promise.reject(ERROR_TRANSACTION_RECOVERABLE())
      }
      return Promise.reject(reason)
    })
    .finally(() => unsubscribe())

  return result
}

// Code taken from
// https://polkadot.js.org/api/api/classes/_promise_index_.apipromise.html

export default class Blockchain implements IBlockchainApi {
  public static asArray(queryResult: Codec): AnyJson[] {
    const json = queryResult.toJSON()
    if (json instanceof Array) return json
    return []
  }

  /**
   *  [STATIC] [ASYNC] Reroute of class method.
   *
   * @param identity The [[Identity]] to re-sign the tx on recoverable error.
   * @param tx The [[SubmittableExtrinsic]] to be submitted. Most transactions need to be signed, this must be done beforehand.
   * @param opts Optional partial criteria for resolving/rejecting the promise.
   * @returns A promise which can be used to track transaction status.
   * If resolved, this promise returns [[SubmittableResult]] that has led to its resolution.
   */
  public static async submitSignedTx(
    identity: Identity,
    tx: SubmittableExtrinsic,
    opts?: Partial<SubscriptionPromiseOptions>
  ): Promise<SubmittableResult> {
    const chain = await getCached()
    return chain.submitSignedTx(identity, tx, opts)
  }

  public api: ApiPromise
  public readonly portablegabi: gabi.Blockchain
  private accountNonces: Map<Identity['address'], BN>

  public constructor(api: ApiPromise) {
    this.api = api
    this.portablegabi = new gabi.Blockchain('portablegabi', this.api as any)
    this.accountNonces = new Map<Identity['address'], BN>()
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

  /**
   * [ASYNC] Signs the SubmittableExtrinsic with the given identity.
   *
   * @param identity The [[Identity]] to sign the Tx with.
   * @param tx The unsigned SubmittableExtrinsic.
   * @returns Signed SubmittableExtrinsic.
   *
   */
  public async signTx(
    identity: Identity,
    tx: SubmittableExtrinsic
  ): Promise<SubmittableExtrinsic> {
    const nonce = await this.getNonce(identity.address)
    const signed: SubmittableExtrinsic = await identity.signSubmittableExtrinsic(
      tx,
      nonce
    )
    return signed
  }

  /**
   * [ASYNC] Submits a signed [[SubmittableExtrinsic]] with exported function [[submitSignedTx]].
   * Handles recoverable errors by re-signing and re-sending the tx up to two times.
   * Uses parseSubscriptionPromise to provide complete potentially defaulted options to the called submitSignedTx.
   *
   * Transaction fees will apply whenever a transaction fee makes it into a block, even if extrinsics fail to execute correctly!
   *
   * @param identity The [[Identity]] to potentially re-sign the Tx with.
   * @param tx The [[SubmittableExtrinsic]] to be submitted. Most transactions need to be signed, this must be done beforehand.
   * @param opts Partial optional criteria for resolving/rejecting the promise.
   * @returns A promise which can be used to track transaction status.
   * If resolved, this promise returns the eventually resolved [[SubmittableResult]].
   */
  public async submitSignedTx(
    identity: Identity,
    tx: SubmittableExtrinsic,
    opts?: Partial<SubscriptionPromiseOptions>
  ): Promise<SubmittableResult> {
    const options = parseSubscriptionOptions(opts)
    const retry = async (reason: Error): Promise<SubmittableResult> => {
      if (reason.message === ERROR_TRANSACTION_RECOVERABLE().message) {
        return submitSignedTx(await this.reSignTx(identity, tx), options)
      }
      throw reason
    }
    return submitSignedTx(tx, options).catch(retry).catch(retry)
  }

  /**
   * [ASYNC] Signs and submits the SubmittableExtrinsic with optional resolution and rejection criteria.
   *
   * @param identity The [[Identity]] that we sign and potentially re-sign the tx with.
   * @param tx The generated unsigned [[SubmittableExtrinsic]] to submit.
   * @param opts Partial optional criteria for resolving/rejecting the promise.
   * @returns Promise result of The Extrinsic.
   *
   */
  public async submitTx(
    identity: Identity,
    tx: SubmittableExtrinsic,
    opts?: Partial<SubscriptionPromiseOptions>
  ): Promise<SubmittableResult> {
    const signedTx = await this.signTx(identity, tx)
    return this.submitSignedTx(identity, signedTx, opts)
  }

  /**
   * [ASYNC] Retrieves the Nonce for Transaction signing for the specified account and increments the in accountNonces mapped Index.
   *
   * @param accountAddress The address of the identity that we retrieve the nonce for.
   * @returns [[BN]] representation of the Tx nonce for the identity.
   *
   */
  public async getNonce(accountAddress: string): Promise<BN> {
    let nonce = this.accountNonces.get(accountAddress)
    if (!nonce) {
      const chainNonce = await this.api.rpc.system
        .accountNextIndex(accountAddress)
        .catch((reason) => {
          log.error(
            `On-chain nonce retrieval failed for account ${accountAddress}\nwith reason: ${reason}`
          )
          throw Error(`Chain failed to retrieve nonce for : ${accountAddress}`)
        })
      const secondQuery = this.accountNonces.get(accountAddress)
      nonce = BN.max(chainNonce, secondQuery || new BN(0))
    }
    this.accountNonces.set(accountAddress, nonce.addn(1))
    return nonce
  }

  /**
   * [ASYNC] Re-signs the given [[SubmittableExtrinsic]] with an updated Nonce.
   *
   * @param identity The [[Identity]] to re-sign the Tx with.
   * @param tx The previously with recoverable Error failed Tx.
   * @returns Original Tx, injected with signature payload with updated nonce.
   *
   */
  public async reSignTx(
    identity: Identity,
    tx: SubmittableExtrinsic
  ): Promise<SubmittableExtrinsic> {
    this.accountNonces.delete(identity.address)
    const nonce: BN = await this.getNonce(identity.address)
    const signerPayload: SignerPayloadJSON = this.api
      .createType('SignerPayload', {
        method: tx.method.toHex(),
        nonce,
        genesisHash: this.api.genesisHash,
        blockHash: this.api.genesisHash,
        runtimeVersion: this.api.runtimeVersion,
        version: this.api.extrinsicVersion,
      })
      .toPayload()
    tx.addSignature(
      identity.address,
      this.api
        .createType('ExtrinsicPayload', signerPayload, {
          version: this.api.extrinsicVersion,
        })
        .sign(identity.signKeyringPair).signature,
      signerPayload
    )
    return tx
  }
}
