/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable jsdoc/require-jsdoc */
// functions in this file are not meant to be public

import { Blockchain } from '@kiltprotocol/chain-helpers'
import { multibaseKeyToDidKey } from '@kiltprotocol/did'
import type {
  KeyringPair,
  KiltAddress,
  MultibaseKeyPair,
  DidHelpersAcceptedPublicKeyEncodings,
  SharedArguments,
  TransactionHandlers,
  TransactionSigner,
} from '@kiltprotocol/types'
import { Keyring, Multikey, Crypto } from '@kiltprotocol/utils'

export async function submitImpl(
  getSubmittable: TransactionHandlers['getSubmittable'],
  options: Pick<SharedArguments, 'api'> & {
    didNonce?: number | BigInt
    awaitFinalized?: boolean
  }
): ReturnType<TransactionHandlers['submit']> {
  const submittable = await getSubmittable({
    ...options,
    signSubmittable: true,
  })

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

export function convertPublicKey(pk: DidHelpersAcceptedPublicKeyEncodings): {
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

export function extractSubmitterSignerAndAccount(
  submitter: KeyringPair | TransactionSigner | MultibaseKeyPair | KiltAddress
): {
  submitterSigner?: TransactionSigner | KeyringPair | undefined
  submitterAccount: KiltAddress
} {
  // KiltAddress
  if (typeof submitter === 'string') {
    return {
      submitterAccount: submitter,
    }
  }
  // KeyringPair
  if ('address' in submitter) {
    return {
      submitterAccount: submitter.address as KiltAddress,
      submitterSigner: submitter,
    }
  }
  // Blockchain.TransactionSigner
  if ('id' in submitter) {
    return {
      submitterAccount: submitter.id as KiltAddress,
      submitterSigner: submitter,
    }
  }
  // MultibaseKeyPair
  if ('publicKeyMultibase' in submitter) {
    const submitterAccount = Crypto.encodeAddress(
      Multikey.decodeMultibaseKeypair(submitter).publicKey,
      38
    )
    const keypair = Multikey.decodeMultibaseKeypair(submitter)
    if (keypair.type === 'x25519') {
      throw new Error('x25519 keys are not supported')
    }
    const keyring = new Keyring().createFromPair(
      keypair,
      undefined,
      keypair.type === 'secp256k1' ? 'ecdsa' : keypair.type
    )
    return {
      submitterAccount,
      submitterSigner: keyring,
    }
  }
  throw new Error('type of submitter is invalid')
}
