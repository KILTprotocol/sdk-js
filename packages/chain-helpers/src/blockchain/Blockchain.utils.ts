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

import { ConfigService } from '@kiltprotocol/config'
import type {
  IIdentity,
  ISubmittableResult,
  KeyringPair,
  ReSignOpts,
  SubmittableExtrinsic,
  SubscriptionPromise,
} from '@kiltprotocol/types'
import { SubmittableResult } from '@polkadot/api'
import { ErrorHandler } from '../errorhandling/index.js'
import { makeSubscriptionPromise } from './SubscriptionPromise.js'
import { getConnectionOrConnect } from '../blockchainApiConnection/BlockchainApiConnection.js'

const log = ConfigService.LoggingFactory.getLogger('Blockchain')

export const TxOutdated = 'Transaction is outdated'
export const TxPriority = 'Priority is too low:'
export const TxDuplicate = 'Transaction Already Imported'

export const IS_READY: SubscriptionPromise.ResultEvaluator = (result) =>
  result.status.isReady
export const IS_IN_BLOCK: SubscriptionPromise.ResultEvaluator = (result) =>
  result.isInBlock
export const EXTRINSIC_EXECUTED: SubscriptionPromise.ResultEvaluator = (
  result
) => ErrorHandler.extrinsicSuccessful(result)
export const IS_FINALIZED: SubscriptionPromise.ResultEvaluator = (result) =>
  result.isFinalized

export const IS_ERROR: SubscriptionPromise.ResultEvaluator = (result) =>
  result.isError || result.internalError
export const EXTRINSIC_FAILED: SubscriptionPromise.ResultEvaluator = (result) =>
  ErrorHandler.extrinsicFailed(result)

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
      EXTRINSIC_FAILED(result) || IS_ERROR(result),
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
export async function submitSignedTx(
  tx: SubmittableExtrinsic,
  opts?: Partial<SubscriptionPromise.Options>
): Promise<ISubmittableResult> {
  log.info(`Submitting ${tx.method}`)
  const options = parseSubscriptionOptions(opts)
  const { promise, subscription } = makeSubscriptionPromise(options)

  let latestResult: SubmittableResult
  const unsubscribe = await tx.send((result) => {
    latestResult = result
    subscription(result)
  })

  const { api } = await getConnectionOrConnect()
  const handleDisconnect = (): void => {
    const result = new SubmittableResult({
      events: latestResult.events || [],
      internalError: new Error('connection error'),
      status:
        latestResult.status ||
        api.registry.createType('ExtrinsicStatus', 'future'),
    })
    subscription(result)
  }
  api.once('disconnected', handleDisconnect)

  return promise
    .catch((e) => Promise.reject(ErrorHandler.getExtrinsicError(e) || e))
    .finally(() => {
      unsubscribe()
      api.off('disconnected', handleDisconnect)
    })
}
export const dispatchTx = submitSignedTx

/**
 * Checks the TxError/TxStatus for issues that may be resolved via resigning.
 *
 * @param reason Polkadot API returned error or ISubmittableResult.
 * @returns Whether or not this issue may be resolved via resigning.
 */
export function isRecoverableTxError(
  reason: Error | ISubmittableResult
): boolean {
  if (reason instanceof Error) {
    return (
      reason.message.includes(TxOutdated) ||
      reason.message.includes(TxPriority) ||
      reason.message.includes(TxDuplicate) ||
      false
    )
  }
  if (
    reason &&
    typeof reason === 'object' &&
    typeof reason.status === 'object'
  ) {
    const { status } = reason as ISubmittableResult
    if (status.isUsurped) return true
  }
  return false
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
