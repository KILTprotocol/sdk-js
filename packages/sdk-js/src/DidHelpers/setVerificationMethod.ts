/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import {
  type NewDidEncryptionKey,
  type NewDidVerificationKey,
  publicKeyToChain,
  urlFragmentToChain,
} from '@kiltprotocol/did'
import type {
  SubmittableExtrinsic,
  VerificationRelationship,
} from '@kiltprotocol/types'

import { convertPublicKey } from './common.js'
import type {
  AcceptedPublicKeyEncodings,
  SharedArguments,
  TransactionHandlers,
} from './interfaces.js'
import { transact } from './transact.js'

/**
 * Replaces all existing verification methods for the selected `relationship` with `publicKey`.
 *
 * @param options.publicKey The public key to be used for this verification method.
 * @param options.relationship The relationship for which this verification method shall be useable.
 * @param options
 */
export function setVerificationMethod(
  options: SharedArguments & {
    publicKey: AcceptedPublicKeyEncodings
    relationship: VerificationRelationship
  }
): TransactionHandlers {
  const pk = convertPublicKey(options.publicKey)
  let didKeyUpdateTx

  if (options.relationship === 'keyAgreement') {
    // TODO:  check if types of keys are valid?
    const didEncryptionKey: NewDidEncryptionKey = {
      publicKey: pk.publicKey,
      type: pk.keyType as any,
    }
    const txs: SubmittableExtrinsic[] = []
    options.didDocument.keyAgreement?.forEach((id) =>
      txs.push(options.api.tx.did.removeKeyAgreementKey(urlFragmentToChain(id)))
    )
    txs.push(
      options.api.tx.did.addKeyAgreementKey(publicKeyToChain(didEncryptionKey))
    )
    didKeyUpdateTx = options.api.tx.utility.batchAll(txs)
  } else {
    const didVerificationKey: NewDidVerificationKey = {
      publicKey: pk.publicKey,
      type: pk.keyType as any,
    }

    switch (options.relationship) {
      case 'authentication': {
        didKeyUpdateTx = options.api.tx.did.setAuthenticationKey(
          publicKeyToChain(didVerificationKey)
        )
        break
      }
      case 'capabilityDelegation': {
        didKeyUpdateTx = options.api.tx.did.setDelegationKey(
          publicKeyToChain(didVerificationKey)
        )
        break
      }
      case 'assertionMethod': {
        didKeyUpdateTx = options.api.tx.did.setAttestationKey(
          publicKeyToChain(didVerificationKey)
        )
        break
      }
      default: {
        throw new Error('unsupported relationship')
      }
    }
  }

  return transact({
    ...options,
    call: didKeyUpdateTx,
    expectedEvents: [{ section: 'did', method: 'DidUpdated' }],
  })
}
