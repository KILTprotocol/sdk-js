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
  DidUrl,
  SubmittableExtrinsic,
  VerificationRelationship,
} from '@kiltprotocol/types'

import { convertPublicKey } from './common.js'
import type {
  AcceptedPublicKeyEncodings,
  SharedArguments,
  TransactionHandlers,
} from './interfaces.js'
import { transactInternal } from './transact.js'

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
  const callFactory = async (): Promise<SubmittableExtrinsic> => {
    const { publicKey, relationship, didDocument, api } = options
    const pk = convertPublicKey(publicKey)

    switch (relationship) {
      case 'keyAgreement': {
        const txs: SubmittableExtrinsic[] = []
        didDocument.keyAgreement?.forEach((id) =>
          txs.push(api.tx.did.removeKeyAgreementKey(urlFragmentToChain(id)))
        )
        txs.push(
          api.tx.did.addKeyAgreementKey(
            publicKeyToChain(pk as NewDidEncryptionKey)
          )
        )
        return api.tx.utility.batchAll(txs)
      }
      case 'authentication': {
        return api.tx.did.setAuthenticationKey(
          publicKeyToChain(pk as NewDidVerificationKey)
        )
      }
      case 'capabilityDelegation': {
        return api.tx.did.setDelegationKey(
          publicKeyToChain(pk as NewDidVerificationKey)
        )
      }
      case 'assertionMethod': {
        return api.tx.did.setAttestationKey(
          publicKeyToChain(pk as NewDidVerificationKey)
        )
      }
      default: {
        throw new Error('unsupported relationship')
      }
    }
  }

  return transactInternal({
    ...options,
    callFactory,
    expectedEvents: [{ section: 'did', method: 'DidUpdated' }],
  })
}

/**
 * Removes the verification method for the selected `verificationMethodId` and  `relationship`.
 *
 * Note: authentication verification method can not be removed.
 *
 * @param options Any {@link SharedArguments} and additional parameters.
 * @param options.relationship The relationship for which this verification method shall be removed.
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
  const callFactory = async (): Promise<SubmittableExtrinsic> => {
    const { relationship, didDocument, api, verificationMethodId } = options
    switch (relationship) {
      case 'authentication': {
        throw new Error(
          'authentication verification methods can not be removed'
        )
      }
      case 'capabilityDelegation': {
        if (didDocument.capabilityDelegation?.includes(verificationMethodId)) {
          return api.tx.did.removeDelegationKey()
        }
        throw new Error(
          'the specified capabilityDelegation method does not exist in the DID Document'
        )
      }
      case 'keyAgreement': {
        if (didDocument.keyAgreement?.includes(verificationMethodId)) {
          return api.tx.did.removeKeyAgreementKey(
            urlFragmentToChain(verificationMethodId)
          )
        }
        throw new Error(
          'the specified keyAgreement key does not exist in the DID Document'
        )
      }
      case 'assertionMethod': {
        if (didDocument.assertionMethod?.includes(verificationMethodId)) {
          return api.tx.did.removeAttestationKey()
        }
        throw new Error(
          'the specified assertionMethod does not exist in the DID Document'
        )
      }
      default: {
        throw new Error('the specified method relationship is not supported')
      }
    }
  }

  return transactInternal({
    ...options,
    callFactory,
    expectedEvents: [{ section: 'did', method: 'DidUpdated' }],
  })
}
