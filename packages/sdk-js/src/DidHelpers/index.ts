/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  Did,
  DidUrl,
  ISubmittableResult,
  ResolutionResult,
  SignerInterface,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { authorizeTx, signersForDid } from '@kiltprotocol/did'
import { Signers } from '@kiltprotocol/utils'

import {
  IS_FINALIZED,
  IS_IN_BLOCK,
  signAndSubmitTx,
} from 'chain-helpers/src/blockchain/Blockchain'
import type { Call, Extrinsic, Event } from '@polkadot/types/interfaces'
import { getSignersForKeypair } from 'utils/src/Signers'
import { u8aToHex } from 'utils/src/Crypto'
import type {
  SharedArguments,
  TransactionHandlers,
  TransactionResult,
} from './interfaces'
import { DidResolver } from '..'

/**
 * Selects and returns a DID signer for a given purpose and algorithm.
 *
 * @param options All options.
 * @param options.signers Signers from which to choose from; can also be `KeyringPair` instances or other key pair representations.
 * @param options.relationship Which verification relationship the key should have to the DID.
 * Defaults to `authentication`.
 * @param options.algorithm Optionally filter signers by algorithm(s).
 * @param options.didDocument The DID's DID document.
 */
export async function selectSigner({
  didDocument,
  signers,
  relationship = 'authentication',
  algorithm,
}: Pick<SharedArguments, 'didDocument' | 'signers'> & {
  relationship?: string
  algorithm?: string | string[]
}): Promise<SignerInterface<string, DidUrl> | undefined> {
  const mappedSigners = await signersForDid(didDocument, ...signers)
  const selectors = [
    Signers.select.byDid(didDocument, {
      verificationRelationship: relationship,
    }),
  ]
  if (typeof algorithm !== 'undefined') {
    Signers.select.byAlgorithm(
      Array.isArray(algorithm) ? algorithm : [algorithm]
    )
  }

  return Signers.selectSigner(mappedSigners, ...selectors)
}

/**
 * Instructs a transaction (state transition) as this DID (with this DID as the origin).
 *
 * @param options
 * @param options.call The transaction / call to execute.
 * @returns
 */
export function transact(
  options: SharedArguments & {
    call: Extrinsic
    methods: string[]
  }
): TransactionHandlers {
  const submit: TransactionHandlers['submit'] = async ({
    awaitFinalized = true,
    timeout = 0,
  } = {}) => {
    const didSigners = await signersForDid(
      options.didDocument,
      ...options.signers
    )
    const authorized: SubmittableExtrinsic = await authorizeTx(
      options.didDocument.id,
      options.call,
      didSigners,
      options.submitterAccount
    )

    let signedTx
    try {
      signedTx = await signAndSubmitTx(
        authorized,
        options.submitterAccountSigner,
        {
          resolveOn: awaitFinalized ? IS_FINALIZED : IS_IN_BLOCK,
        }
      )
    } catch (e) {
      // ToDo return error result.
      throw new Error('todo rejected or unknown')
    }

    // signedTx.events[0].event.method
    return signedTx

    // return signedTx
    //   .then((r): TransactionResult => {
    //   return { status: 'confirmed' }
    // })
  }

  const getSubmittable: TransactionHandlers['getSubmittable'] = async (
    submitOptions:
      | {
          signSubmittable?: boolean // default: true
        }
      | undefined = {}
  ) => {
    const didSigners = await signersForDid(
      options.didDocument,
      ...options.signers
    )
    const authorized: SubmittableExtrinsic = await authorizeTx(
      options.didDocument.id,
      options.call,
      didSigners,
      options.submitterAccount
    )

    let signedHex
    if (submitOptions.signSubmittable) {
      const signed =
        'address' in options.submitterAccountSigner
          ? await authorized.signAsync(options.submitterAccountSigner)
          : await authorized.signAsync(options.submitterAccountSigner.id, {
              signer: Signers.getPolkadotSigner([
                options.submitterAccountSigner,
              ]),
            })
      signedHex = signed.toHex()
    } else {
      signedHex = authorized.toHex()
    }
    return {
      txHex: signedHex,
    }
    // const hex = authorized.toHex()
  }

  return {
    submit,
    getSubmittable,
  }
}

// either confirmed or failed because it's in block.
async function checkEvents(
  did: Did,
  didSigners: SignerInterface[],
  result: ISubmittableResult,
  expectedEvents: Array<{ section: string; method: string }>
): Promise<TransactionResult> {
  const isSuccess =
    result.dispatchError &&
    expectedEvents.every(
      ({ section, method }) =>
        typeof result.findRecord(section, method) !== 'undefined'
    )
  const {didDocument} = await DidResolver.resolve(did)

  const didResolutionSuccess = !!didDocument;
  const status: TransactionResult['status'] = isSuccess && didResolutionSuccess ? 'confirmed' : 'failed'


  return {
    status,
    get asFailed(): TransactionResult['asFailed'] {
      if (status === 'failed') {
        throw new Error('')
        return {
          error: new Error(""),
          txHash: u8aToHex(result.txHash),
          signers: didSigners,
          didDocument?: didDocument,
          block: { hash: HexString; number: BigInt },
          events: GenericEvent[]
        }
      } else {
        throw new Error("can't be")
      }
    },
    get asUnknown(): TransactionResult['asUnknown'] {
      throw new Error("can't be")
    },
    get asRejected(): TransactionResult['asRejected'] {
      throw new Error("can't be")
    },
    get asConfirmed(): TransactionResult['asConfirmed'] {
      throw new Error("can't be")
    },
  }

  // if (result.dispatchError) {
  //   return {
  //     status: 'unknown',
  //     get asUnknown() {
  //       return {
  //         error: new Error(''),
  //         txHash: u8aToHex(result.txHash),
  //       }
  //     },
  //   }
  // }
  //
  // if (result.internalError) {
  //   return {
  //     status: 'failed',
  //     asFailed: {
  //       error: new Error(''),
  //       txHash: u8aToHex(result.txHash),
  //     },
  //   }
  // }
  //
  // // Check the expected number of events.
  // if (result.events.length !== expectedMethods.length) {
  //   return {
  //     status: 'unknown',
  //     asUnknown: {
  //       error: new Error(''),
  //       txHash: u8aToHex(result.txHash),
  //     },
  //   }
  // }
  //
  // for (const event of result.events) {
  //   if (!expectedMethods.includes(event.event.method)) {
  //     return {
  //       status: 'unknown',
  //       asUnknown: {
  //         error: new Error(''),
  //         txHash: u8aToHex(result.txHash),
  //       },
  //     }
  //   }
  // }
  return undefined
}
