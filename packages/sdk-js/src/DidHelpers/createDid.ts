/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import {
  DidVerificationMethodType,
  getStoreTx,
  keypairToMultibaseKey,
  multibaseKeyToDidKey,
  signingMethodTypes,
} from '@kiltprotocol/did'
import { KiltAddress, KeyringPair, SignerInterface } from '@kiltprotocol/types'
import * as Did from '@kiltprotocol/did'
import type {
  DidDocument,
  DidUrl,
  VerificationMethod,
} from '@kiltprotocol/types'
import { Signers } from '@kiltprotocol/utils'
import type {
  AcceptedPublicKeyEncodings,
  KeyMultibaseEncoded,
  SharedArguments,
  TransactionHandlers,
} from './interfaces.js'
import { transact } from './index.js'

function convertPublicKey(pk: AcceptedPublicKeyEncodings): {
  publicKey: Uint8Array
  keyType: string
} {
  let didPublicKey: {
    publicKey: Uint8Array
    keyType: string
  }
  if (typeof pk === 'string') {
    didPublicKey = multibaseKeyToDidKey(pk)
  } else if ('publicKeyMultibase' in pk) {
    didPublicKey = multibaseKeyToDidKey(
      (pk as { publicKeyMultibase: KeyMultibaseEncoded }).publicKeyMultibase
    )
  } else if (
    'publicKey' in pk &&
    pk.publicKey.constructor.name === 'Uint8Array'
  ) {
    didPublicKey = {
      publicKey: pk.publicKey,
      keyType: pk.type,
    }
  } else {
    throw new Error('invalid public key')
  }
  return didPublicKey
}

/**
 * Creates an on-chain DID based on an authentication key.
 *
 * @param options.fromPublicKey The public key that will feature as the DID's initial authentication method and will determine the DID identifier.
 * @param options
 */
export async function createDid(
  options: Omit<SharedArguments, 'didDocument'> & {
    fromPublicKey: AcceptedPublicKeyEncodings
  }
): Promise<TransactionHandlers> {
  const didPublicKey = convertPublicKey(options.fromPublicKey)

  if (!signingMethodTypes.includes(didPublicKey.keyType)) {
    throw new Error('invalid public key')
  }

  const didPublicKeyMultibase = keypairToMultibaseKey({
    publicKey: didPublicKey.publicKey,
    type: didPublicKey.keyType as DidVerificationMethodType,
  })

  const submitterAccount = (
    'address' in options.submitter
      ? options.submitter.address
      : options.submitter.id
  ) as KiltAddress

  const didAuthKey: Did.NewDidVerificationKey = {
    publicKey: didPublicKey.publicKey,
    type: didPublicKey.keyType as any,
  }

  function implementsSignerInterface(input: any): boolean {
    return 'algorithm' in input && 'id' in input && 'sign' in input
  }

  const signers: SignerInterface[] = (
    await Promise.all(
      options.signers
        .map(async (signer) => {
          if (implementsSignerInterface(signer)) {
            return signer as SignerInterface
          }
          const res = (await Signers.getSignersForKeypair({
            keypair: signer as
              | KeyringPair
              | {
                  secretKeyMultibase: KeyMultibaseEncoded
                  publicKeyMultibase: KeyMultibaseEncoded
                },
          })) as SignerInterface[]
          return res
        })
        .flat()
    )
  ).flat()

  const fullDid = Did.getFullDidFromVerificationMethod({
    publicKeyMultibase: didPublicKeyMultibase,
  })

  const vm: VerificationMethod = {
    id: `${fullDid}#auth` as DidUrl,
    controller: fullDid,
    type: 'Multikey',
    publicKeyMultibase: didPublicKeyMultibase,
  }

  const didDocument: DidDocument = {
    id: fullDid,
    verificationMethod: [vm],
    authentication: [vm.id],
  }

  const fullDidCreationTx = await getStoreTx(
    {
      authentication: [didAuthKey],
    },
    submitterAccount,
    signers
  )

  return transact({
    ...options,
    didDocument,
    call: fullDidCreationTx,
    expectedEvents: [{ section: 'did', method: 'DidCreated' }],
  })
}
