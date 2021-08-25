/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @packageDocumentation
 * @module BlockchchainUtils
 * @typedef {SubscriptionPromise.Options} Options
 */

import { SDKErrors } from '@kiltprotocol/utils'
import { ConfigService } from '@kiltprotocol/config'
import type {
  IIdentity,
  ISubmittableResult,
  ReSignOpts,
  SubmittableExtrinsic,
  SubscriptionPromise,
} from '@kiltprotocol/types'
import type { KeyringPair } from '@polkadot/keyring/types'
import { ErrorHandler, ExtrinsicError, ExtrinsicErrors } from '../errorhandling'
import { makeSubscriptionPromise } from './SubscriptionPromise'
import { getConnectionOrConnect } from '../blockchainApiConnection/BlockchainApiConnection'

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
export const IS_RELEVANT_ERROR: SubscriptionPromise.ErrorEvaluator = (
  err: Error | SDKErrors.SDKError
) => {
  return SDKErrors.isSDKError(err) && RelevantSDKErrors.includes(err.errorCode)
}
export const IS_READY: SubscriptionPromise.ResultEvaluator = (result) =>
  result.status.isReady
export const IS_IN_BLOCK: SubscriptionPromise.ResultEvaluator = (result) =>
  result.isInBlock
export const EXTRINSIC_EXECUTED: SubscriptionPromise.ResultEvaluator = (
  result
) => ErrorHandler.extrinsicSuccessful(result)
export const IS_FINALIZED: SubscriptionPromise.ResultEvaluator = (result) =>
  result.isFinalized
export const IS_USURPED: SubscriptionPromise.ResultEvaluator = (result) =>
  result.status.isUsurped && SDKErrors.ERROR_TRANSACTION_USURPED()
export const IS_ERROR: SubscriptionPromise.ResultEvaluator = (result) => {
  return (
    (result.status.isDropped && Error('isDropped')) ||
    (result.status.isInvalid && Error('isInvalid')) ||
    (result.status.isFinalityTimeout && Error('isFinalityTimeout'))
  )
}
export const EXTRINSIC_FAILED: SubscriptionPromise.ResultEvaluator = (result) =>
  ErrorHandler.extrinsicFailed(result) &&
  (ErrorHandler.getExtrinsicError(result) ||
    new ExtrinsicError(
      ExtrinsicErrors.UNKNOWN_ERROR.code,
      ExtrinsicErrors.UNKNOWN_ERROR.message
    ))

/**
 * Parses potentially incomplete or undefined options and returns complete [[Options]].
 *
 * @param opts Potentially undefined or partial [[Options]] .
 * @returns Complete [[Options]], with potentially defaulted values.
 */
export function parseSubscriptionOptions(
  opts?: Partial<SubscriptionPromise.Options>
): SubscriptionPromise.Options {
  const {
    resolveOn = IS_FINALIZED,
    rejectOn = (result: ISubmittableResult) =>
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
 * [ASYNC] Submits a signed SubmittableExtrinsic and attaches a callback to monitor the inclusion status of the transaction
 * and possible errors in the execution of extrinsics. Returns a promise to that end which by default resolves upon
 * finalization and rejects any errors occur during submission or execution of extrinsics. This behavior can be adjusted via optional parameters.
 *
 * Transaction fees will apply whenever a transaction fee makes it into a block, even if extrinsics fail to execute correctly!
 *
 * @param tx The SubmittableExtrinsic to be submitted. Most transactions need to be signed, this must be done beforehand.
 * @param opts Partial optional [[SubscriptionPromise]]to be parsed: Criteria for resolving/rejecting the promise.
 * @returns A promise which can be used to track transaction status.
 * If resolved, this promise returns ISubmittableResult that has led to its resolution.
 */
export async function dispatchTx(
  tx: SubmittableExtrinsic,
  opts?: Partial<SubscriptionPromise.Options>
): Promise<ISubmittableResult> {
  log.info(`Submitting ${tx.method}`)
  const options = parseSubscriptionOptions(opts)
  const { promise, subscription } = makeSubscriptionPromise(options)

  const unsubscribe = await tx.send(subscription)

  return promise.finally(() => unsubscribe())
}

/**
 * Checks the TxError for relevant ones and returns these as matched SDKError for recoverability.
 *
 *
 * @param reason Polkadot API returned error.
 * @returns If matched, a SDKError, else original reason.
 */
function matchTxError(reason: Error): SDKErrors.SDKError | Error {
  switch (true) {
    case reason.message.includes(TxOutdated):
      return SDKErrors.ERROR_TRANSACTION_OUTDATED()
    case reason.message.includes(TxPriority):
      return SDKErrors.ERROR_TRANSACTION_PRIORITY()
    case reason.message.includes(TxDuplicate):
      return SDKErrors.ERROR_TRANSACTION_DUPLICATE()
    default:
      return reason
  }
}

/**
 * [ASYNC] Rejects a tx that can be re-signed with  an [[ERROR_TRANSACTION_RECOVERABLE]].
 *
 * @param tx The SubmittableExtrinsic to be submitted. Most transactions need to be signed, this must be done beforehand.
 * @param opts [[SubscriptionPromise]]: Criteria for resolving/rejecting the promise.
 * @returns A promise which can be used to track transaction status.
 * If resolved, this promise returns ISubmittableResult that has led to its resolution.
 *
 */
export async function submitSignedTx(
  tx: SubmittableExtrinsic,
  opts?: Partial<SubscriptionPromise.Options>
): Promise<ISubmittableResult> {
  return dispatchTx(tx, opts).catch((reason: Error) => {
    const error = matchTxError(reason)
    if (IS_RELEVANT_ERROR(error)) {
      return Promise.reject(SDKErrors.ERROR_TRANSACTION_RECOVERABLE())
    }
    return Promise.reject(error)
  })
}
/**
 * [ASYNC] Signs and submits the SubmittableExtrinsic with optional resolution and rejection criteria.
 *
 * @param tx The generated unsigned SubmittableExtrinsic to submit.
 * @param signer The [[Identity]] or [[KeyringPair]] used to sign and potentially re-sign the tx.
 * @param opts Partial optional criteria for resolving/rejecting the promise.
 * @param opts.reSign Optional flag for re-attempting to send recoverably failed Tx.
 * @param opts.tip Optional amount of Femto-KILT to tip the validator.
 * @returns Promise result of executing the extrinsic, of type ISubmittableResult.
 */
export async function signAndSubmitTx(
  tx: SubmittableExtrinsic,
  signer: KeyringPair | IIdentity,
  {
    reSign = false,
    tip,
    ...opts
  }: Partial<SubscriptionPromise.Options> & Partial<ReSignOpts> = {}
): Promise<ISubmittableResult> {
  const chain = await getConnectionOrConnect()
  const signedTx = await chain.signTx(signer, tx, tip)
  return reSign
    ? chain.submitSignedTxWithReSign(signedTx, signer, opts)
    : submitSignedTx(signedTx, opts)
}
