/**
 * @packageDocumentation
 * @module BlockchchainUtils
 * @preferred
 */

import { SubmittableResult } from '@polkadot/api'
import { SubmittableExtrinsic } from '@polkadot/api/promise/types'
import { SDKErrors } from '@kiltprotocol/utils'
import { ConfigService } from '@kiltprotocol/config'
import { IIdentity } from '@kiltprotocol/types'
import { ErrorHandler, ExtrinsicError, ExtrinsicErrors } from '../errorhandling'
import {
  Evaluator,
  makeSubscriptionPromise,
  TerminationOptions,
} from './SubscriptionPromise'
import { getCached } from '../blockchainApiConnection/BlockchainApiConnection'

export type ResultEvaluator = Evaluator<SubmittableResult>
export type ErrorEvaluator = Evaluator<Error>
export type SubscriptionPromiseOptions = TerminationOptions<SubmittableResult>

const log = ConfigService.LoggingFactory.getLogger('Blockchain')

export const TxOutdated = 'Transaction is outdated'
export const TxPriority = 'Priority is too low:'
export const TxDuplicate = 'Transaction Already Imported'
export const RelevantSDKErrors = [
  SDKErrors.ErrorCode.ERROR_TRANSACTION_DUPLICATE,
  SDKErrors.ErrorCode.ERROR_TRANSACTION_OUTDATED,
  SDKErrors.ErrorCode.ERROR_TRANSACTION_PRIORITY,
  SDKErrors.ErrorCode.ERROR_TRANSACTION_USURPED,
]
export const IS_RELEVANT_ERROR: ErrorEvaluator = (
  err: Error | SDKErrors.SDKError
) => {
  return SDKErrors.isSDKError(err) && RelevantSDKErrors.includes(err.errorCode)
}
export const IS_READY: ResultEvaluator = (result) => result.status.isReady
export const IS_IN_BLOCK: ResultEvaluator = (result) => result.isInBlock
export const EXTRINSIC_EXECUTED: ResultEvaluator = (result) =>
  ErrorHandler.extrinsicSuccessful(result)
export const IS_FINALIZED: ResultEvaluator = (result) => result.isFinalized
export const IS_USURPED: ResultEvaluator = (result) =>
  result.status.isUsurped && SDKErrors.ERROR_TRANSACTION_USURPED()
export const IS_ERROR: ResultEvaluator = (result) => {
  return (
    (result.status.isDropped && Error('isDropped')) ||
    (result.status.isInvalid && Error('isInvalid')) ||
    (result.status.isFinalityTimeout && Error('isFinalityTimeout'))
  )
}
export const EXTRINSIC_FAILED: ResultEvaluator = (result) =>
  ErrorHandler.extrinsicFailed(result) &&
  (ErrorHandler.getExtrinsicError(result) ||
    new ExtrinsicError(
      ExtrinsicErrors.UNKNOWN_ERROR.code,
      ExtrinsicErrors.UNKNOWN_ERROR.message
    ))

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

  const unsubscribe = await tx.send(subscription)

  return promise.finally(() => unsubscribe())
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
        return Promise.reject(SDKErrors.ERROR_TRANSACTION_OUTDATED())
        break
      case reason.message.includes(TxPriority):
        return Promise.reject(SDKErrors.ERROR_TRANSACTION_PRIORITY())
        break
      case reason.message.includes(TxDuplicate):
        return Promise.reject(SDKErrors.ERROR_TRANSACTION_DUPLICATE())
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
      return Promise.reject(SDKErrors.ERROR_TRANSACTION_RECOVERABLE())
    }
    return Promise.reject(reason)
  })
}

/**
 * [ASYNC] Reroute of class method.
 *
 * @param tx The [[SubmittableExtrinsic]] to be submitted. Most transactions need to be signed, this must be done beforehand.
 * @param identity The [[Identity]] to re-sign the tx on recoverable error.
 * @param opts Optional partial criteria for resolving/rejecting the promise.
 * @returns A promise which can be used to track transaction status.
 * If resolved, this promise returns [[SubmittableResult]] that has led to its resolution.
 */
export async function submitTxWithReSign(
  tx: SubmittableExtrinsic,
  identity?: IIdentity,
  opts?: Partial<SubscriptionPromiseOptions>
): Promise<SubmittableResult> {
  const chain = await getCached()
  return chain.submitTxWithReSign(tx, identity, opts)
}
