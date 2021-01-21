/**
 * @packageDocumentation
 * @module BlockchchainUtils
 * @preferred
 */

import { SubmittableResult } from '@polkadot/api'
import { SubmittableExtrinsic } from '@polkadot/api/promise/types'
import {
  ERROR_TRANSACTION_RECOVERABLE,
  ERROR_TRANSACTION_USURPED,
} from '../errorhandling/SDKErrors'
import {
  Evaluator,
  makeSubscriptionPromise,
  TerminationOptions,
} from '../util/SubscriptionPromise'
import { ErrorHandler } from '../errorhandling'
import { ERROR_UNKNOWN as UNKNOWN_EXTRINSIC_ERROR } from '../errorhandling/ExtrinsicError'
import { factory as LoggerFactory } from '../config/ConfigLog'
import Identity from '../identity/Identity'
import getCached from '../blockchainApiConnection'

export type ResultEvaluator = Evaluator<SubmittableResult>
export type ErrorEvaluator = Evaluator<Error>
export type SubscriptionPromiseOptions = TerminationOptions<SubmittableResult>

const log = LoggerFactory.getLogger('Blockchain')

const TxOutdated = '1010: Invalid Transaction: Transaction is outdated'
const TxPriority = '1014: Priority is too low:'
const TxAlreadyImported = 'Transaction Already'

export const IS_RELEVANT_ERROR: ErrorEvaluator = (err: Error) => {
  return new RegExp(
    `${TxAlreadyImported}|${TxOutdated}|${TxPriority}`,
    'g'
  ).test(err.message)
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
export const EXTRINSIC_FAILED: ResultEvaluator = (result) =>
  ErrorHandler.extrinsicFailed(result) &&
  (ErrorHandler.getExtrinsicError(result) || UNKNOWN_EXTRINSIC_ERROR)

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

  return {
    resolveOn,
    rejectOn,
    timeout,
  }
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
  log.info(`Submitting ${tx.method}`)
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

/**
 *  [STATIC] [ASYNC] Reroute of class method.
 *
 * @param tx The [[SubmittableExtrinsic]] to be submitted. Most transactions need to be signed, this must be done beforehand.
 * @param identity The [[Identity]] to re-sign the tx on recoverable error.
 * @param opts Optional partial criteria for resolving/rejecting the promise.
 * @returns A promise which can be used to track transaction status.
 * If resolved, this promise returns [[SubmittableResult]] that has led to its resolution.
 */
export async function submitTxWithReSign(
  tx: SubmittableExtrinsic,
  identity?: Identity,
  opts?: Partial<SubscriptionPromiseOptions>
): Promise<SubmittableResult> {
  const chain = await getCached()
  return chain.submitTxWithReSign(tx, identity, opts)
}
