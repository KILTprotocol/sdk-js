/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { SubmittableResult } from '@polkadot/api'
import { AnyNumber } from '@polkadot/types/types'

import { ConfigService } from '@kiltprotocol/config'
import type {
  ISubmittableResult,
  KeyringPair,
  SubmittableExtrinsic,
  SubscriptionPromise,
} from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'

import { ErrorHandler } from '../errorhandling/index.js'
import { makeSubscriptionPromise } from './SubscriptionPromise.js'

const log = ConfigService.LoggingFactory.getLogger('Blockchain')

export const TxOutdated = 'Transaction is outdated'
export const TxPriority = 'Priority is too low:'
export const TxDuplicate = 'Transaction Already Imported'

/**
 * Evaluator resolves on extrinsic reaching status "is ready".
 *
 * @param result Submission result.
 * @returns Whether the extrinsic reached status "is ready".
 */
export function IS_READY(result: ISubmittableResult): boolean {
  return result.status.isReady
}

/**
 * Evaluator resolves on extrinsic reaching status "in block".
 *
 * @param result Submission result.
 * @returns Whether the extrinsic reached status "in block".
 */
export function IS_IN_BLOCK(result: ISubmittableResult): boolean {
  return result.isInBlock
}

/**
 * Evaluator resolves on extrinsic reaching status "success".
 *
 * @param result Submission result.
 * @returns Whether the extrinsic reached status "success".
 */
export function EXTRINSIC_EXECUTED(result: ISubmittableResult): boolean {
  return ErrorHandler.extrinsicSuccessful(result)
}

/**
 * Evaluator resolves on extrinsic reaching status "finalized".
 *
 * @param result Submission result.
 * @returns Whether the extrinsic reached status "finalized".
 */
export function IS_FINALIZED(result: ISubmittableResult): boolean {
  return result.isFinalized
}

/**
 * Evaluator resolves on extrinsic reaching status "is error".
 *
 * @param result Submission result.
 * @returns Whether the extrinsic reached status "is error" and the error itself.
 */
export function IS_ERROR(
  result: ISubmittableResult
): boolean | Error | undefined {
  return result.isError || result.internalError
}

/**
 * Evaluator resolves on extrinsic reaching status "is ready".
 *
 * @param result Submission result.
 * @returns Whether the extrinsic reached status "is ready".
 */
export function EXTRINSIC_FAILED(result: ISubmittableResult): boolean {
  return ErrorHandler.extrinsicFailed(result)
}

function defaultResolveOn(): SubscriptionPromise.ResultEvaluator {
  return ConfigService.isSet('submitTxResolveOn')
    ? ConfigService.get('submitTxResolveOn')
    : IS_FINALIZED
}

/**
 * Submits a signed SubmittableExtrinsic and attaches a callback to monitor the inclusion status of the transaction
 * and possible errors in the execution of extrinsics. Returns a promise to that end which by default resolves upon
 * finalization or rejects if any errors occur during submission or execution of extrinsics. This behavior can be adjusted via optional parameters or via the [[ConfigService]].
 *
 * Transaction fees will apply whenever a transaction fee makes it into a block, even if extrinsics fail to execute correctly!
 *
 * @param tx The SubmittableExtrinsic to be submitted. Most transactions need to be signed, this must be done beforehand.
 * @param opts Allows overwriting criteria for resolving/rejecting the transaction result subscription promise. These options take precedent over configuration via the ConfigService.
 * @returns A promise which can be used to track transaction status.
 * If resolved, this promise returns ISubmittableResult that has led to its resolution.
 */
export async function submitSignedTx(
  tx: SubmittableExtrinsic,
  opts: Partial<SubscriptionPromise.Options> = {}
): Promise<ISubmittableResult> {
  const {
    resolveOn = defaultResolveOn(),
    rejectOn = (result: ISubmittableResult) =>
      EXTRINSIC_FAILED(result) || IS_ERROR(result),
  } = opts

  const api = ConfigService.get('api')
  if (!api.hasSubscriptions) {
    throw new SDKErrors.SubscriptionsNotSupportedError()
  }

  log.info(`Submitting ${tx.method}`)
  const { promise, subscription } = makeSubscriptionPromise({
    ...opts,
    resolveOn,
    rejectOn,
  })

  let latestResult: SubmittableResult | undefined
  const unsubscribe = await tx.send((result) => {
    latestResult = result
    subscription(result)
  })

  function handleDisconnect(): void {
    const result = new SubmittableResult({
      events: latestResult?.events || [],
      internalError: new Error('connection error'),
      status:
        latestResult?.status ||
        api.registry.createType('ExtrinsicStatus', 'future'),
      txHash: api.registry.createType('Hash'),
    })
    subscription(result)
  }

  api.once('disconnected', handleDisconnect)

  try {
    return await promise
  } catch (e) {
    throw ErrorHandler.getExtrinsicError(e as ISubmittableResult) || e
  } finally {
    unsubscribe()
    api.off('disconnected', handleDisconnect)
  }
}

export const dispatchTx = submitSignedTx

/**
 * Signs and submits the SubmittableExtrinsic with optional resolution and rejection criteria.
 *
 * @param tx The generated unsigned SubmittableExtrinsic to submit.
 * @param signer The [[KiltKeyringPair]] used to sign the tx.
 * @param opts Partial optional criteria for resolving/rejecting the promise.
 * @param opts.tip Optional amount of Femto-KILT to tip the validator.
 * @returns Promise result of executing the extrinsic, of type ISubmittableResult.
 */
export async function signAndSubmitTx(
  tx: SubmittableExtrinsic,
  signer: KeyringPair,
  {
    tip,
    ...opts
  }: Partial<SubscriptionPromise.Options> & Partial<{ tip: AnyNumber }> = {}
): Promise<ISubmittableResult> {
  const signedTx = await tx.signAsync(signer, { tip })
  return submitSignedTx(signedTx, opts)
}
