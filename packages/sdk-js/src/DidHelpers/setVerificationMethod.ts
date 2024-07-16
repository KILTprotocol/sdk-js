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
import type { VerificationRelationship, DidUrl } from '@kiltprotocol/types'

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
 * @param options Any {@link SharedArguments} and additional parameters.
 * @param options.publicKey The public key to be used for this verification method.
 * @param options.relationship The relationship for which this verification method shall be useable.
 *
 * @returns A set of {@link TransactionHandlers}.
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
    const didEncryptionKey: NewDidEncryptionKey = {
      publicKey: pk.publicKey,
      type: pk.keyType as any,
    }
    didKeyUpdateTx = options.api.tx.did.addKeyAgreementKey(
      publicKeyToChain(didEncryptionKey)
    )
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
        didKeyUpdateTx = options.api.tx.did.assertionMethod(
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

/**
 * Removes the verification method for the selected `verificationMethodId` and  `relationship`.
 *
 * Note: authentication verification method can not be removed.
 *
 * @param options Any {@link SharedArguments} and additional parameters.
 * @param options.relationship The relationship for which this verification method shall be useable.
 * @param options.verificationMethodId The id of the verification method that should be removed.
 *
 * @returns A set of {@link TransactionHandlers}.
 */
export function removeVerificationMethod(
  options: SharedArguments & {
    verificationMethodId: DidUrl
    relationship: Omit<VerificationRelationship, 'authentication'>
  }
): TransactionHandlers {
  let didKeyUpdateTx
  switch (options.relationship) {
    case 'authentication': {
      throw new Error('authentication verification methods can not be removed')
    }
    case 'capabilityDelegation': {
      if (
        options.didDocument.capabilityDelegation &&
        options.didDocument.capabilityDelegation.includes(
          options.verificationMethodId
        )
      ) {
        didKeyUpdateTx = options.api.tx.did.removeDelegationKey()
      } else {
        throw new Error(
          'the specified capabilityDelegation method does not exist in the DID Document'
        )
      }
      break
    }
    case 'keyAgreement': {
      if (
        options.didDocument.keyAgreement &&
        options.didDocument.keyAgreement.includes(options.verificationMethodId)
      ) {
        didKeyUpdateTx = options.api.tx.did.removeKeyAgreementKey(
          urlFragmentToChain(options.verificationMethodId)
        )
      } else {
        throw new Error(
          'the specified keyAgreement key does not exist in the DID Document'
        )
      }
      break
    }
    case 'assertionMethod': {
      if (
        options.didDocument.assertionMethod &&
        options.didDocument.assertionMethod.includes(
          options.verificationMethodId
        )
      ) {
        didKeyUpdateTx = options.api.tx.did.removeAttestationKey()
      } else {
        throw new Error(
          'the specified assertionMethod does not exist in the DID Document'
        )
      }
      break
    }
    default: {
      throw new Error('the specified method relationship is not supported')
    }
  }

  return transact({
    ...options,
    call: didKeyUpdateTx,
    expectedEvents: [{ section: 'did', method: 'DidUpdated' }],
  })
}
