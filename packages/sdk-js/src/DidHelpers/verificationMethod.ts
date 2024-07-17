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
  const { publicKey, relationship, didDocument, api } = options
  const pk = convertPublicKey(publicKey)

  let didKeyUpdateTx
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
      didKeyUpdateTx = api.tx.utility.batchAll(txs)
      break
    }
    case 'authentication': {
      didKeyUpdateTx = api.tx.did.setAuthenticationKey(
        publicKeyToChain(pk as NewDidVerificationKey)
      )
      break
    }
    case 'capabilityDelegation': {
      didKeyUpdateTx = api.tx.did.setDelegationKey(
        publicKeyToChain(pk as NewDidVerificationKey)
      )
      break
    }
    case 'assertionMethod': {
      didKeyUpdateTx = api.tx.did.setAttestationKey(
        publicKeyToChain(pk as NewDidVerificationKey)
      )
      break
    }
    default: {
      throw new Error('unsupported relationship')
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
  const { relationship, didDocument, api, verificationMethodId } = options
  let didKeyUpdateTx
  switch (relationship) {
    case 'authentication': {
      throw new Error('authentication verification methods can not be removed')
    }
    case 'capabilityDelegation': {
      if (didDocument.capabilityDelegation?.includes(verificationMethodId)) {
        didKeyUpdateTx = api.tx.did.removeDelegationKey()
      } else {
        throw new Error(
          'the specified capabilityDelegation method does not exist in the DID Document'
        )
      }
      break
    }
    case 'keyAgreement': {
      if (didDocument.keyAgreement?.includes(verificationMethodId)) {
        didKeyUpdateTx = api.tx.did.removeKeyAgreementKey(
          urlFragmentToChain(verificationMethodId)
        )
      } else {
        throw new Error(
          'the specified keyAgreement key does not exist in the DID Document'
        )
      }
      break
    }
    case 'assertionMethod': {
      if (didDocument.assertionMethod?.includes(verificationMethodId)) {
        didKeyUpdateTx = api.tx.did.removeAttestationKey()
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
