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
import { Text } from '@polkadot/types'
import { SignerPayloadJSON } from '@polkadot/types/types/extrinsic'
import { ERROR_TRANSACTION_USURPED } from '../errorhandling/SDKErrors'
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
  getNonce(accountAddress: string, reset?: boolean): Promise<Index>
  reSignTx(
    identity: Identity,
    tx: SubmittableExtrinsic
  ): Promise<SubmittableExtrinsic>
}

export const IS_RELEVANT_ERROR: ErrorEvaluator = (err: Error) => {
  return /Priority|Transaction Already|outdated/g.test(err.message)
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
        return Promise.reject(Error('Recoverable'))
      }
      return Promise.reject(reason)
    })

  const result = await promise
    .catch(async (reason: Error) => {
      if (reason.message === ERROR_TRANSACTION_USURPED().message) {
        return Promise.reject(Error('Recoverable'))
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
   *  [STATIC] [ASYNC] Reroute of class function.
   *
   * @param identity The [[SubmittableExtrinsic]] to be submitted. Most transactions need to be signed, this must be done beforehand.
   * @param tx The [[SubmittableExtrinsic]] to be submitted. Most transactions need to be signed, this must be done beforehand.
   * @param opts Criteria for resolving/rejecting the promise.
   * @returns A promise which can be used to track transaction status.
   * If resolved, this promise returns [[SubmittableResult]] that has led to its resolution.
   */
  public static async submitSignedTx(
    identity: Identity,
    tx: SubmittableExtrinsic,
    opts?: SubscriptionPromiseOptions
  ): Promise<SubmittableResult> {
    const chain = await getCached()
    return chain.submitSignedTx(identity, tx, opts)
  }

  public api: ApiPromise
  public readonly portablegabi: gabi.Blockchain
  private accountNonces: Map<Identity['address'], Index>

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
   *
   * Transaction fees will apply whenever a transaction fee makes it into a block, even if extrinsics fail to execute correctly!
   *
   * @param identity The [[Identity]] to potentially re-sign the Tx with.
   * @param tx The [[SubmittableExtrinsic]] to be submitted. Most transactions need to be signed, this must be done beforehand.
   * @param opts Criteria for resolving/rejecting the promise.
   * @returns A promise which can be used to track transaction status.
   * If resolved, this promise returns the eventually resolved [[SubmittableResult]].
   */
  public async submitSignedTx(
    identity: Identity,
    tx: SubmittableExtrinsic,
    opts?: SubscriptionPromiseOptions
  ): Promise<SubmittableResult> {
    const options = parseSubscriptionOptions(opts)
    return submitSignedTx(tx, options)
      .catch(async (reason: Error) => {
        if (reason.message === 'Recoverable') {
          return submitSignedTx(await this.reSignTx(identity, tx), options)
        }
        throw reason
      })
      .catch(async (reason: Error) => {
        if (reason.message === 'Recoverable') {
          return submitSignedTx(await this.reSignTx(identity, tx), options)
        }
        throw reason
      })
  }

  /**
   * [ASYNC] Signs and submits the SubmittableExtrinsic with optional resolving and rejection criteria.
   *
   * @param identity The [[Identity]] that we sign and potentially re-sign the tx with.
   * @param tx The generated unsigned [[SubmittableExtrinsic]] to submit.
   * @param opts Optional [[SubscriptionPromiseOptions]].
   * @returns Promise result of The Extrinsic.
   *
   */
  public async submitTx(
    identity: Identity,
    tx: SubmittableExtrinsic,
    opts?: SubscriptionPromiseOptions
  ): Promise<SubmittableResult> {
    const signedTx = await this.signTx(identity, tx)
    return this.submitSignedTx(identity, signedTx, opts)
  }

  /**
   * [ASYNC] Retrieves the Nonce for Transaction signing for the specified account and increments the in accountNonces mapped Index.
   *
   * @param accountAddress The address of the identity that we retrieve the nonce for.
   * @param reset Specify whether the entry for the account is outdated and has to be reset.
   * @returns [[Index]] representation of the Tx nonce for the identity.
   *
   */
  public async getNonce(accountAddress: string, reset = false): Promise<Index> {
    if (reset) {
      this.accountNonces.delete(accountAddress)
    }
    const initialQuery = this.accountNonces.get(accountAddress)
    if (initialQuery) {
      this.accountNonces.set(
        accountAddress,
        this.api.registry.createType('Index', initialQuery.addn(1))
      )
      return initialQuery
    }
    const chainNonce = await this.api.rpc.system
      .accountNextIndex(accountAddress)
      .catch((reason) => {
        log.error(
          `On-chain nonce retrieval failed for account ${accountAddress}\nwith reason: ${reason}`
        )
        throw Error(`Chain failed to retrieve nonce for : ${accountAddress}`)
      })
    const secondQuery = this.accountNonces.get(accountAddress)
    if (chainNonce && (!secondQuery || secondQuery.lte(chainNonce))) {
      this.accountNonces.set(
        accountAddress,
        this.api.registry.createType('Index', chainNonce.addn(1))
      )
      return chainNonce
    }
    if (secondQuery) {
      this.accountNonces.set(
        accountAddress,
        this.api.registry.createType('Index', secondQuery.addn(1))
      )
      return secondQuery
    }
    throw Error(`Nonce retrieval failed for : ${accountAddress}`)
  }

  /**
   * [ASYNC] Re-signs the given [[SubmittableExtrinsic]] with an updated Nonce.
   *
   * @param identity The [[Identity]] to re-sign the Tx with.
   * @param tx The previously with recoverable Error failed Tx.
   * @returns Original Tx, injected with updated signature payload.
   *
   */
  public async reSignTx(
    identity: Identity,
    tx: SubmittableExtrinsic
  ): Promise<SubmittableExtrinsic> {
    const nonce: Index = await this.getNonce(identity.address, true)
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
