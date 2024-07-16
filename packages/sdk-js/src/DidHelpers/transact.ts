/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Extrinsic } from '@polkadot/types/interfaces'

import { authorizeTx, signersForDid } from '@kiltprotocol/did'
import type { KiltAddress, SubmittableExtrinsic } from '@kiltprotocol/types'
import { Signers } from '@kiltprotocol/utils'

import { checkResultImpl, submitImpl } from './common.js'
import type { SharedArguments, TransactionHandlers } from './interfaces.js'

/**
 * Instructs a transaction (state transition) as this DID (with this DID as the origin).
 *
 * @param options
 * @param options.call The transaction / call to execute.
 * @returns
 */
export function transact(
  options: SharedArguments & {
    call: Extrinsic | SubmittableExtrinsic
    expectedEvents?: Array<{ section: string; method: string }>
  }
): TransactionHandlers {
  const getSubmittable: TransactionHandlers['getSubmittable'] = async (
    submitOptions:
      | {
          signSubmittable?: boolean // default: true
          didNonce?: number | BigInt
        }
      | undefined = {}
  ) => {
    const { didDocument, signers, submitter, call, api, expectedEvents } =
      options
    const { didNonce, signSubmittable = true } = submitOptions
    const didSigners = await signersForDid(didDocument, ...signers)

    const submitterAccount = (
      'address' in submitter ? submitter.address : submitter.id
    ) as KiltAddress

    const authorized: SubmittableExtrinsic = await authorizeTx(
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

    let signedHex
    if (signSubmittable) {
      const signed =
        'address' in submitter
          ? await authorized.signAsync(submitter)
          : await authorized.signAsync(submitterAccount, {
              signer: Signers.getPolkadotSigner([submitter]),
            })
      signedHex = signed.toHex()
    } else {
      signedHex = authorized.toHex()
    }

    return {
      txHex: signedHex,
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
