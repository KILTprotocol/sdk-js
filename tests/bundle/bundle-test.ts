/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/// <reference lib="dom" />

import { KiltAddress, SignerInterface } from '@kiltprotocol/types'

const { kilt } = window
const Kilt = kilt

async function runAll() {
  const api = await kilt.connect('ws://127.0.0.1:9944')

  const didPublicKey = new Uint8Array([
    136, 220, 52, 23, 213, 5, 142, 196, 180, 80, 62, 12, 18, 234, 26, 10, 137,
    190, 32, 15, 233, 137, 34, 66, 61, 67, 52, 1, 79, 166, 176, 238,
  ])
  const [didKeypair] = await kilt.getSignersForKeypair({
    keypair: {
      publicKey: didPublicKey,
      secretKey: new Uint8Array([
        171, 248, 229, 189, 190, 48, 198, 86, 86, 192, 163, 203, 209, 129, 255,
        138, 86, 41, 74, 105, 223, 237, 210, 121, 130, 170, 206, 74, 118, 144,
        145, 21,
      ]),
    },
    type: 'Ed25519',
  })
  const faucet = {
    publicKey: new Uint8Array([
      238, 93, 102, 137, 215, 142, 38, 187, 91, 53, 176, 68, 23, 64, 160, 101,
      199, 189, 142, 253, 209, 193, 84, 34, 7, 92, 63, 43, 32, 33, 181, 210,
    ]),
    secretKey: new Uint8Array([
      205, 253, 96, 36, 210, 176, 235, 162, 125, 84, 204, 146, 164, 76, 217,
      166, 39, 198, 155, 45, 189, 161, 94, 215, 229, 128, 133, 66, 81, 25, 174,
      3,
    ]),
  }

  const [submitter] = (await kilt.getSignersForKeypair({
    keypair: faucet,
    type: 'Ed25519',
  })) as Array<SignerInterface<'Ed25519', KiltAddress>>

  // ┏━━━━━━━━━━━━┓
  // ┃ create DID ┃
  // ┗━━━━━━━━━━━━┛
  //
  // Generate the DID-signed creation tx and submit it to the blockchain with the specified account.
  // The DID Document will have one Verification Key with an authentication relationship.
  //
  // Note the following parameters:
  // - `api`: The connected blockchain api.
  // - `signers`: The keys for verification materials inside the DID Document. For creating a DID,
  // only the key for the verification method is required.
  // - `submitter`: The account used to submit the transaction to the blockchain. Note: the submitter account must have
  // enough funds to cover the required storage deposit.
  // - `fromPublicKey`: The public key that will feature as the DID's initial authentication method and will determine the DID identifier.

  const transactionHandler = Kilt.DidHelpers.createDid({
    api,
    signers: [didKeypair],
    submitter,
    fromPublicKey: { publicKey: didPublicKey, type: 'ed25519' },
  })

  // The `createDid` function returns a transaction handler, which includes two methods:
  // - `submit`: Submits a transaction for inclusion in a block, resulting in its execution in the blockchain runtime.
  // - `getSubmittable`: Produces transaction that can be submitted to a blockchain node for inclusion, or signed and submitted by an external service.

  // Submit transaction.
  // Note: `submit()` by default, waits for the block to be finalized. This behaviour can be overwritten
  // in the function's optional parameters.
  const didDocumentTransactionResult = await transactionHandler.submit()

  // Once the transaction is submitted, the result should be checked.
  // For the sake of this example, we will only check if the transaction went through.
  if (didDocumentTransactionResult.status !== 'confirmed') {
    throw new Error('create DID failed')
  }

  // Get the DID Document from the transaction result.
  let { didDocument } = didDocumentTransactionResult.asConfirmed

  // ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  // ┃ Create Verification Method ┃
  // ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
  //
  // - `DidHelpers` include a function to add a verification methods.
  // Similar to `createDid`, setting a verification method requires some parameters.
  //
  // - `didDocument` is the latest state of the DID Document that shall be updated.
  // - `signers` includes all the keypairs included in the DID documents and necessary for the
  // specified operation, in this case, the keypair of the authentication key, which is necessary to
  // allow updates to the DID Document.
  // - `publicKey` is the key used for the verification method.
  //
  // Note: setting a verification method will remove any existing method for the specified relationship.

  // TODO: use mnemonic here.
  // const seed = randomAsU8a(32)
  // const keyAgreementKeypair = Crypto.makeEncryptionKeypairFromSeed(seed)
  const keyAgreementKeypair = Kilt.generateKeypair({
    type: 'x25519',
  })
  const vmTransactionResult = await Kilt.DidHelpers.setVerificationMethod({
    api,
    didDocument,
    signers: [didKeypair],
    submitter,
    publicKey: keyAgreementKeypair,
    relationship: 'keyAgreement',
  }).submit()

  if (vmTransactionResult.status !== 'confirmed') {
    throw new Error('add verification method failed')
  }
  ;({ didDocument } = vmTransactionResult.asConfirmed)

  // ┏━━━━━━━━━━━━━━━━━┓
  // ┃ Claim web3name  ┃
  // ┗━━━━━━━━━━━━━━━━━┛
  const claimW3nTransactionResult = await Kilt.DidHelpers.claimWeb3Name({
    api,
    didDocument,
    submitter,
    signers: [didKeypair],
    name: 'example123',
  }).submit()

  if (claimW3nTransactionResult.status !== 'confirmed') {
    throw new Error('claim web3name failed')
  }

  // TODO: does the DID Document change after adding a w3n?
  ;({ didDocument } = claimW3nTransactionResult.asConfirmed)

  // ┏━━━━━━━━━━━━━━━━┓
  // ┃ Add a service  ┃
  // ┗━━━━━━━━━━━━━━━━┛
  const addServiceTransactionResult = await Kilt.DidHelpers.addService({
    api,
    submitter,
    signers: [didKeypair],
    didDocument,
    // TODO:  change service endpoint.
    service: {
      id: '#my_service',
      type: ['http://schema.org/EmailService'],
      serviceEndpoint: ['mailto:info@kilt.io'],
    },
  }).submit()

  if (addServiceTransactionResult.status !== 'confirmed') {
    throw new Error('add service failed')
  }
  ;({ didDocument } = addServiceTransactionResult.asConfirmed)

  // ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
  // ┃ Remove a Verification Method ┃
  // ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
  //
  // Removing a verification method can be done by specifying its id.
  //
  // Note:
  // - The provided `didDocument` must include the specified verification method.
  // - The authentication verification method can not be removed.
  const removeVmTransactionResult =
    await Kilt.DidHelpers.removeVerificationMethod({
      api,
      didDocument,
      signers: [didKeypair],
      submitter,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      verificationMethodId: didDocument.keyAgreement![0],
      relationship: 'keyAgreement',
    }).submit()

  if (removeVmTransactionResult.status !== 'confirmed') {
    throw new Error('remove verification method failed')
  }
  ;({ didDocument } = removeVmTransactionResult.asConfirmed)

  // ┏━━━━━━━━━━━━━━━━━━┓
  // ┃ Release web3name ┃
  // ┗━━━━━━━━━━━━━━━━━━┛
  //
  // A web3name can be released from a DID and potentially claimed by another DID.
  const releaseW3nTransactionResult = await Kilt.DidHelpers.releaseWeb3Name({
    api,
    didDocument,
    submitter,
    signers: [didKeypair],
  }).submit()

  if (releaseW3nTransactionResult.status !== 'confirmed') {
    throw new Error('release web3name failed')
  }
  ;({ didDocument } = releaseW3nTransactionResult.asConfirmed)

  // ┏━━━━━━━━━━━━━━━━━━┓
  // ┃ Remove a service ┃
  // ┗━━━━━━━━━━━━━━━━━━┛
  //
  // Services can be removed by specifying the service `id`
  const removeServiceTransactionResult = await Kilt.DidHelpers.removeService({
    api,
    submitter,
    signers: [didKeypair],
    didDocument,
    id: '#my_service',
  }).submit()

  if (removeServiceTransactionResult.status !== 'confirmed') {
    throw new Error('remove service failed')
  }
  ;({ didDocument } = removeServiceTransactionResult.asConfirmed)

  // ┏━━━━━━━━━━━━━━━━━━┓
  // ┃ Deactivate a DID ┃
  // ┗━━━━━━━━━━━━━━━━━━┛
  //
  // _Permanently_ deactivate the DID, removing all verification methods and services from its document.
  // Deactivating a DID cannot be undone, once a DID has been deactivated, all operations on it (including attempts at re-creation) are permanently disabled.
  const deactivateDidTransactionResult = await Kilt.DidHelpers.deactivateDid({
    api,
    submitter,
    signers: [didKeypair],
    didDocument,
  }).submit()

  if (deactivateDidTransactionResult.status !== 'confirmed') {
    throw new Error('deactivate DID failed')
  }
  ;({ didDocument } = deactivateDidTransactionResult.asConfirmed)

  // Release the connection to the blockchain.
  await api.disconnect()
}

window.runAll = runAll
