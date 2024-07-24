/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Extrinsic } from '@polkadot/types/interfaces'
import { Blockchain } from '@kiltprotocol/chain-helpers'
import { authorizeTx, signersForDid } from '@kiltprotocol/did'
import type {
  SubmittableExtrinsic,
  SharedArguments,
  TransactionHandlers,
} from '@kiltprotocol/types'
import { extractSubmitterSignerAndAccount, submitImpl } from './common.js'
import { checkResultImpl } from './checkResult.js'

/**
 * Instructs a transaction (state transition) as this DID (with this DID as the origin).
 *
 * @param options Any {@link SharedArguments} and additional parameters.
 * @param options.callFactory Async callback producing the transaction / call to execute.
 * @returns A set of {@link TransactionHandlers}.
 */
export function transactInternal(
  options: SharedArguments & {
    callFactory: () => Promise<Extrinsic | SubmittableExtrinsic>
    expectedEvents?: Array<{ section: string; method: string }>
  }
): TransactionHandlers {
  const getSubmittable: TransactionHandlers['getSubmittable'] = async (
    submitOptions:
      | {
          signSubmittable?: boolean // default: false
          didNonce?: number | BigInt
        }
      | undefined = {}
  ) => {
    const {
      didDocument,
      signers,
      submitter,
      callFactory,
      api,
      expectedEvents,
    } = options
    const { didNonce, signSubmittable = false } = submitOptions
    const call = await callFactory()
    const didSigners = await signersForDid(didDocument, ...signers)

    const { submitterSigner, submitterAccount } =
      extractSubmitterSignerAndAccount(submitter)

    let authorized: SubmittableExtrinsic = await authorizeTx(
      didDocument,
      call,
      didSigners,
      submitterAccount,
      typeof didNonce !== 'undefined'
        ? {
            txCounter: api.createType('u64', didNonce),
          }
        : {}
    )

    if (signSubmittable) {
      if (typeof submitterSigner === 'undefined') {
        throw new Error('submitter does not include a secret key')
      }
      authorized = await Blockchain.signTx(authorized, submitterSigner)
    }

    return {
      txHex: authorized.toHex(),
      checkResult: (input) =>
        checkResultImpl(input, api, expectedEvents, didDocument.id, signers),
    }
  }

  const submit: TransactionHandlers['submit'] = (submitOptions) =>
    submitImpl(getSubmittable, { ...options, ...submitOptions })

  return {
    submit,
    getSubmittable,
  }
}

/**
 * Instructs a transaction (state transition) as this DID (with this DID as the origin).
 *
 * @param options Any {@link SharedArguments} and additional parameters.
 * @param options.call The transaction / call to execute.
 * @returns A set of {@link TransactionHandlers}.
 */
export function transact(
  options: SharedArguments & {
    call: Extrinsic | SubmittableExtrinsic
    expectedEvents?: Array<{ section: string; method: string }>
  }
): TransactionHandlers {
  return transactInternal({ ...options, callFactory: async () => options.call })
}
