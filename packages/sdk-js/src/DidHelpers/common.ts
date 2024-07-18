/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable jsdoc/require-jsdoc */
// functions in this file are not meant to be public

import type { ApiPromise } from '@polkadot/api'
import type { SpRuntimeDispatchError } from '@kiltprotocol/augment-api'
import { Blockchain } from '@kiltprotocol/chain-helpers'
import { multibaseKeyToDidKey } from '@kiltprotocol/did'

import type {
  AcceptedPublicKeyEncodings,
  SharedArguments,
  TransactionHandlers,
} from './interfaces.js'

export function mapError(err: SpRuntimeDispatchError, api: ApiPromise): Error {
  if (err.isModule) {
    const { docs, method, section } = api.registry.findMetaError(err.asModule)
    return new Error(`${section}.${method}: ${docs}`)
  }
  return new Error(`${err.type}: ${err.value.toHuman()}`)
}

export function assertStatus(expected: string, actual?: string): void {
  if (actual !== expected) {
    const getterName = `as${expected.slice(0, 1).toUpperCase()}${expected.slice(
      1
    )}`
    throw new Error(`can't access '${getterName}' when status is '${actual}'`)
  }
}

export async function submitImpl(
  getSubmittable: TransactionHandlers['getSubmittable'],
  options: Pick<SharedArguments, 'api'> & {
    didNonce?: number | BigInt
    awaitFinalized?: boolean
  }
): ReturnType<TransactionHandlers['submit']> {
  const submittable = await getSubmittable(options)

  const { awaitFinalized = true } = options
  const result = await Blockchain.submitSignedTx(
    options.api.tx(submittable.txHex),
    {
      resolveOn: awaitFinalized
        ? (res) => res.isFinalized || res.isError
        : (res) => res.isInBlock || res.isError,
      rejectOn: () => false,
    }
  )

  return submittable.checkResult(result)
}

export function convertPublicKey(pk: AcceptedPublicKeyEncodings): {
  publicKey: Uint8Array
  type: string
} {
  let publicKey: Uint8Array
  let type: string

  if (typeof pk === 'string') {
    ;({ publicKey, keyType: type } = multibaseKeyToDidKey(pk))
  } else if ('publicKeyMultibase' in pk) {
    ;({ publicKey, keyType: type } = multibaseKeyToDidKey(
      pk.publicKeyMultibase
    ))
  } else if (
    'publicKey' in pk &&
    pk.publicKey.constructor.name === 'Uint8Array'
  ) {
    ;({ publicKey, type } = pk)
  } else {
    throw new Error('invalid public key')
  }
  return { publicKey, type }
}
