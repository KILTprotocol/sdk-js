/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import {
  NewDidEncryptionKey,
  NewDidVerificationKey,
  publicKeyToChain,
} from '@kiltprotocol/did'
import { VerificationRelationship } from '@kiltprotocol/types'
import { convertPublicKey } from './createDid.js'
import { transact } from './index.js'
import type {
  AcceptedPublicKeyEncodings,
  SharedArguments,
  TransactionHandlers,
} from './interfaces'

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
    const didAuthKey: NewDidEncryptionKey = {
      publicKey: pk.publicKey,
      type: pk.keyType as any,
    }
    didKeyUpdateTx = options.api.tx.did.addKeyAgreementKey(
      publicKeyToChain(didAuthKey)
    )
  } else {
    const didAuthKey: NewDidVerificationKey = {
      publicKey: pk.publicKey,
      type: pk.keyType as any,
    }

    switch (options.relationship) {
      case 'authentication': {
        didKeyUpdateTx = options.api.tx.did.setAuthenticationKey(
          publicKeyToChain(didAuthKey)
        )
        break
      }
      case 'capabilityDelegation': {
        didKeyUpdateTx = options.api.tx.did.setDelegationKey(
          publicKeyToChain(didAuthKey)
        )
        break
      }
      case 'assertionMethod': {
        didKeyUpdateTx = options.api.tx.did.assertionMethod(
          publicKeyToChain(didAuthKey)
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
