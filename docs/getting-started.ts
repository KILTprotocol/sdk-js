/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { mnemonicGenerate } from '@polkadot/util-crypto'

import * as Kilt from '@kiltprotocol/sdk-js'
import { BN } from '@polkadot/util'

const NODE_URL = 'ws://127.0.0.1:9944'

async function main(): Promise<void> {
  /* 1.1 Set up the crypto and connect to a KILT endpoint */
  const keyring = new Kilt.Utils.Keyring({
    ss58Format: 38,
    type: 'ed25519',
  })
  const keystore = new Kilt.Did.DemoKeystore()

  await Kilt.init({ address: NODE_URL })
  console.log(`Connected to KILT endpoint ${NODE_URL}`)
  const { api } =
    await Kilt.ChainHelpers.BlockchainApiConnection.getConnectionOrConnect()

  /* 1.2 Generate the endowed dev account */
  const devAccount = keyring.addFromMnemonic(
    'receive clutch item involve chaos clutch furnace arrest claw isolate okay together'
  )

  /* 2 Generate an attester account and full DID */
  /* 2.1 Generate and endow a KILT account for the attester */
  const attesterMnemonic = mnemonicGenerate()
  console.log(`Attester mnemonic: ${attesterMnemonic}`)
  const attesterAccount = keyring.addFromMnemonic(attesterMnemonic)
  console.log(`Attester address: ${attesterAccount.address}`)

  const transferAmount = new BN('10000000000000000')
  await Kilt.Balance.makeTransfer(attesterAccount.address, transferAmount).then(
    (tx) =>
      Kilt.BlockchainUtils.signAndSubmitTx(tx, devAccount, {
        resolveOn: Kilt.BlockchainUtils.IS_IN_BLOCK,
        reSign: true,
      })
  )
  console.log(`Attester address funded!`)

  /* 2.2 Create a full DID for the attester */
  const attesterAuthenticationKey: Kilt.NewDidVerificationKey = await keystore
    .generateKeypair({
      alg: Kilt.Did.SigningAlgorithms.Ed25519,
      seed: attesterMnemonic,
    })
    .then((keypair) => {
      return {
        publicKey: keypair.publicKey,
        type: Kilt.Did.DemoKeystore.getKeyTypeForAlg(
          keypair.alg
        ) as Kilt.VerificationKeyType,
      }
    })
  const attesterEncryptionKey: Kilt.NewDidEncryptionKey = await keystore
    .generateKeypair({
      alg: Kilt.Did.EncryptionAlgorithms.NaclBox,
      seed: attesterMnemonic,
    })
    .then((keypair) => {
      return {
        publicKey: keypair.publicKey,
        type: Kilt.Did.DemoKeystore.getKeyTypeForAlg(
          keypair.alg
        ) as Kilt.EncryptionKeyType,
      }
    })
  const attesterFullDid = await new Kilt.Did.FullDidCreationBuilder(
    api,
    attesterAuthenticationKey
  )
    .addEncryptionKey(attesterEncryptionKey)
    .setAttestationKey(attesterAuthenticationKey)
    .consumeWithHandler(keystore, devAccount.address, async (tx) => {
      await Kilt.BlockchainUtils.signAndSubmitTx(tx, devAccount, {
        resolveOn: Kilt.BlockchainUtils.IS_IN_BLOCK,
        reSign: true,
      })
    })
  console.log(`Attester DID: ${attesterFullDid.did}`)

  /* 3 Build and store a Claim Type (CType) */
  /* 3.1 Build a CType */
  const ctype = Kilt.CType.fromSchema({
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    title: 'Drivers License',
    properties: {
      name: {
        type: 'string',
      },
      age: {
        type: 'integer',
      },
    },
    type: 'object',
  })
  console.log('CType: ')
  console.log(JSON.stringify(ctype, undefined, 2))

  /* 3.2 Store the CType on the KILT blockchain */
  const attesterAuthorisedTx = await ctype
    .getStoreTx()
    .then((tx) =>
      attesterFullDid.authorizeExtrinsic(tx, keystore, attesterAccount.address)
    )
  await Kilt.BlockchainUtils.signAndSubmitTx(
    attesterAuthorisedTx,
    attesterAccount,
    {
      resolveOn: Kilt.BlockchainUtils.IS_IN_BLOCK,
      reSign: true,
    }
  )
  console.log('CType written on the blockchain!')

  /* 4 Generate a claimer light DID */
  const claimerAuthenticationKey: Kilt.Did.NewLightDidAuthenticationKey =
    await keystore
      .generateKeypair({
        alg: Kilt.Did.SigningAlgorithms.Ed25519,
      })
      .then((keypair) => {
        return {
          publicKey: keypair.publicKey,
          type: Kilt.Did.DemoKeystore.getKeyTypeForAlg(
            keypair.alg
          ) as Kilt.Did.LightDidSupportedVerificationKeyType,
        }
      })
  const claimerEncryptionKey: Kilt.NewDidEncryptionKey = await keystore
    .generateKeypair({
      alg: Kilt.Did.EncryptionAlgorithms.NaclBox,
    })
    .then((keypair) => {
      return {
        publicKey: keypair.publicKey,
        type: Kilt.Did.DemoKeystore.getKeyTypeForAlg(
          keypair.alg
        ) as Kilt.EncryptionKeyType,
      }
    })
  const claimerLightDid = Kilt.Did.LightDidDetails.fromDetails({
    authenticationKey: claimerAuthenticationKey,
    encryptionKey: claimerEncryptionKey,
  })
  console.log(`Claimer DID: ${claimerLightDid.did}`)

  /* 5 Build a claim and a request for attestation */
  /* 5.1 Build a claim */
  const rawClaim = {
    name: 'Alice',
    age: 29,
  }
  const claim = Kilt.Claim.fromCTypeAndClaimContents(
    ctype,
    rawClaim,
    claimerLightDid.did
  )
  console.log('Claim:')
  console.log(JSON.stringify(claim, undefined, 2))

  /* 5.2 Create a request for attestation */
  const requestForAttestation = Kilt.RequestForAttestation.fromClaim(claim)
  await requestForAttestation.signWithDidKey(
    keystore,
    claimerLightDid,
    claimerLightDid.authenticationKey.id
  )
  console.log('Request for attestation:')
  console.log(JSON.stringify(requestForAttestation, undefined, 2))

  /* 5.3 Build the request for attestation message for the attester */
  const requestForAttestationMessage = new Kilt.Message(
    {
      content: { requestForAttestation },
      type: Kilt.Message.BodyType.REQUEST_ATTESTATION,
    },
    claimerLightDid.did,
    attesterFullDid.did
  )
  console.log('Request for attestation message:')
  console.log(JSON.stringify(requestForAttestationMessage, undefined, 2))

  /* 5.4 Encrypt the request for attestation message */
  const encryptedRequestForAttestationMessage =
    await requestForAttestationMessage.encrypt(
      claimerLightDid.encryptionKey!.id,
      claimerLightDid,
      keystore,
      attesterFullDid.assembleKeyId(attesterFullDid.encryptionKey!.id)
    )

  /* 5 Create an attestation */
  /* 5.1 Decrypt the request for attestation message */
  const decryptedRequestForAttestationMessage = await Kilt.Message.decrypt(
    encryptedRequestForAttestationMessage,
    keystore,
    attesterFullDid
  )
  if (decrypdecryptedRequestForAttestationMessageted.body.type === Kilt.Message.BodyType.REQUEST_ATTESTATION) {
    const extractedRequestForAttestation: Kilt.IRequestForAttestation =
      decryptedRequestForAttestationMessage.body.content.requestForAttestation
  }

  /* 5.2 */
}

// execute
main().finally(() => Kilt.disconnect())
