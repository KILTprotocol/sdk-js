/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { Blockchain } from '@kiltprotocol/chain-helpers'
import { getFullDid, getStoreTx, signingMethodTypes } from '@kiltprotocol/did'
import type { KiltAddress, SignerInterface } from '@kiltprotocol/types'
import { Crypto, Signers } from '@kiltprotocol/utils'

import { checkResultImpl, convertPublicKey, submitImpl } from './common.js'
import type {
  AcceptedPublicKeyEncodings,
  SharedArguments,
  TransactionHandlers,
} from './interfaces.js'

function implementsSignerInterface(input: any): input is SignerInterface {
  return 'algorithm' in input && 'id' in input && 'sign' in input
}

/**
 * Creates an on-chain DID based on an authentication key.
 *
 * @param options.fromPublicKey The public key that will feature as the DID's initial authentication method and will determine the DID identifier.
 * @param options
 */
export function createDid(
  options: Omit<SharedArguments, 'didDocument'> & {
    fromPublicKey: AcceptedPublicKeyEncodings
  }
): TransactionHandlers {
  const getSubmittable: TransactionHandlers['getSubmittable'] = async (
    submitOptions = {}
  ) => {
    const { fromPublicKey, submitter, signers, api } = options
    const { signSubmittable = true } = submitOptions
    const { publicKey, keyType } = convertPublicKey(fromPublicKey)

    if (!signingMethodTypes.includes(keyType)) {
      throw new Error(`unknown key type ${keyType}`)
    }
    const submitterAccount = (
      'address' in submitter ? submitter.address : submitter.id
    ) as KiltAddress

    const accountSigners = (
      await Promise.all(
        signers.map(async (signer) => {
          if (implementsSignerInterface(signer)) {
            return [signer]
          }
          const res = await Signers.getSignersForKeypair({
            keypair: signer,
          })
          return res
        })
      )
    ).flat()

    let didCreation = await getStoreTx(
      {
        authentication: [{ publicKey, type: keyType as 'sr25519' }],
      },
      submitterAccount,
      accountSigners
    )

    if (signSubmittable) {
      didCreation = await Blockchain.signTx(didCreation, submitter)
    }

    return {
      txHex: didCreation.toHex(),
      checkResult: (input) =>
        checkResultImpl(
          input,
          api,
          [{ section: 'did', method: 'DidCreated' }],
          getFullDid(Crypto.encodeAddress(publicKey, 38)),
          signers
        ),
    }
  }

  const submit: TransactionHandlers['submit'] = (submitOptions) =>
    submitImpl(getSubmittable, { ...options, ...submitOptions })

  return { getSubmittable, submit }
}
