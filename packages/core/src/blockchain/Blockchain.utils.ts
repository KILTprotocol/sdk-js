/**
 * @packageDocumentation
 * @module BlockchchainUtils
 * @preferred
 */

import { SubmittableResult } from '@polkadot/api'
import { SubmittableExtrinsic } from '@polkadot/api/promise/types'
import {
  ERROR_TRANSACTION_DUPLICATE,
  ERROR_TRANSACTION_OUTDATED,
  ERROR_TRANSACTION_PRIORITY,
  ERROR_TRANSACTION_RECOVERABLE,
  ERROR_TRANSACTION_USURPED,
  SDKError,
} from '../errorhandling/SDKErrors'
import {
  Evaluator,
  makeSubscriptionPromise,
  TerminationOptions,
} from '../util/SubscriptionPromise'
import { ErrorHandler } from '../errorhandling'
import { ERROR_UNKNOWN as UNKNOWN_EXTRINSIC_ERROR } from '../errorhandling/ExtrinsicError'
import { factory as LoggerFactory } from '../config/ConfigService'
import Identity from '../identity/Identity'
import getCached from '../blockchainApiConnection'

export type ResultEvaluator = Evaluator<SubmittableResult>
export type ErrorEvaluator = Evaluator<Error>
export type SubscriptionPromiseOptions = TerminationOptions<SubmittableResult>

const log = LoggerFactory.getLogger('Blockchain')

export const TxOutdated = 'Transaction is outdated'
export const TxPriority = 'Priority is too low:'
export const TxDuplicate = 'Transaction Already Imported'

export const IS_RELEVANT_ERROR: ErrorEvaluator = (err: Error | SDKError) => {
  const outdated = err.message.includes(ERROR_TRANSACTION_OUTDATED().message)

  const priority = err.message.includes(ERROR_TRANSACTION_PRIORITY().message)

  const usurped = err.message.includes(ERROR_TRANSACTION_USURPED().message)

  return outdated || usurped || priority
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
export async function submitSignedTxRaw(
  tx: SubmittableExtrinsic,
  opts: SubscriptionPromiseOptions
): Promise<SubmittableResult> {
  log.info(`Submitting ${tx.method}`)
  const { promise, subscription } = makeSubscriptionPromise(opts)
  const catcher = async (reason: Error): Promise<never> => {
    return Promise.reject(reason)
  }
  const unsubscribe = await tx.send(subscription).catch(catcher)

  const result = await promise.catch(catcher).finally(() => unsubscribe())

  return result
}

/**
 * [ASYNC] Reroute to submitSignedTxRaw, this function matches the specific errors and returns the appropriate SDKErrors.
 *
 *
 * @param tx The [[SubmittableExtrinsic]] to be submitted. Most transactions need to be signed, this must be done beforehand.
 * @param opts [[SubscriptionPromiseOptions]]: Criteria for resolving/rejecting the promise.
 * @returns A promise which can be used to track transaction status.
 * If resolved, this promise returns [[SubmittableResult]] that has led to its resolution.
 */
async function submitSignedTxErrorMatched(
  tx: SubmittableExtrinsic,
  opts: SubscriptionPromiseOptions
): Promise<SubmittableResult> {
  return submitSignedTxRaw(tx, opts).catch((reason: Error) => {
    switch (true) {
      case reason.message.includes(TxOutdated):
        return Promise.reject(ERROR_TRANSACTION_OUTDATED())
        break
      case reason.message.includes(TxPriority):
        return Promise.reject(ERROR_TRANSACTION_PRIORITY())
        break
      case reason.message.includes(TxDuplicate):
        return Promise.reject(ERROR_TRANSACTION_DUPLICATE())
        break
      default:
        return Promise.reject(reason)
    }
  })
}
/**
 * [ASYNC] Uses submitSignedTxErrorMatched to reject with ERROR_TRANSACTION_RECOVERABLE if Tx can be re-signed.
 *
 * @param tx The [[SubmittableExtrinsic]] to be submitted. Most transactions need to be signed, this must be done beforehand.
 * @param opts [[SubscriptionPromiseOptions]]: Criteria for resolving/rejecting the promise.
 * @returns A promise which can be used to track transaction status.
 * If resolved, this promise returns [[SubmittableResult]] that has led to its resolution.
 *
 */
export async function submitSignedTx(
  tx: SubmittableExtrinsic,
  opts: SubscriptionPromiseOptions
): Promise<SubmittableResult> {
  return submitSignedTxErrorMatched(tx, opts).catch((reason: Error) => {
    if (IS_RELEVANT_ERROR(reason)) {
      return Promise.reject(ERROR_TRANSACTION_RECOVERABLE())
    }
    return Promise.reject(reason)
  })
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
