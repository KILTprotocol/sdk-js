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
  /* 1 Setup */
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
  console.log(`Attester KILT address: ${attesterAccount.address}`)

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
        type: Kilt.Did.DidUtils.getVerificationKeyTypeForSigningAlgorithm(
          keypair.alg
        ),
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
        type: Kilt.Did.DidUtils.getEncryptionKeyTypeForEncryptionAlgorithm(
          keypair.alg
        ),
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
  const attesterAuthorisedCtypeTx = await ctype
    .getStoreTx()
    .then((tx) =>
      attesterFullDid.authorizeExtrinsic(tx, keystore, attesterAccount.address)
    )
  await Kilt.BlockchainUtils.signAndSubmitTx(
    attesterAuthorisedCtypeTx,
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
          type: Kilt.Did.DidUtils.getVerificationKeyTypeForSigningAlgorithm(
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
        type: Kilt.Did.DidUtils.getEncryptionKeyTypeForEncryptionAlgorithm(
          keypair.alg
        ),
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

  /* 6 Attest and send a credential */
  /* 6.1 Decrypt the request for attestation message */
  const decryptedRequestForAttestationMessage = await Kilt.Message.decrypt(
    encryptedRequestForAttestationMessage,
    keystore,
    attesterFullDid
  )
  let extractedRequestForAttestation: Kilt.IRequestForAttestation
  if (
    decryptedRequestForAttestationMessage.body.type ===
    Kilt.Message.BodyType.REQUEST_ATTESTATION
  ) {
    extractedRequestForAttestation =
      decryptedRequestForAttestationMessage.body.content.requestForAttestation
  } else {
    throw new Error('Invalid request for attestation received.')
  }

  /* 6.2 Create the attestation object */
  const attestation = Kilt.Attestation.fromRequestAndDid(
    extractedRequestForAttestation,
    attesterFullDid.did
  )
  console.log('Attestation:')
  console.log(JSON.stringify(attestation, undefined, 2))

  /* 6.3 Store the attestation on the KILT blockchain */
  const attesterAuthorisedAttestationTx = await attestation
    .store()
    .then((tx) =>
      attesterFullDid.authorizeExtrinsic(tx, keystore, attesterAccount.address)
    )
  await Kilt.BlockchainUtils.signAndSubmitTx(
    attesterAuthorisedAttestationTx,
    attesterAccount,
    {
      resolveOn: Kilt.BlockchainUtils.IS_IN_BLOCK,
      reSign: true,
    }
  )
  console.log('Attestation written on the blockchain!')

  /* 6.4 Build a attestation object for the claimer */
  const credential = Kilt.Credential.fromRequestAndAttestation(
    extractedRequestForAttestation,
    attestation
  )
  console.log('Credential:')
  console.log(JSON.stringify(credential, undefined, 2))

  /* 6.5 Build and encrypt the request for attestation message */
  const credentialMessage = new Kilt.Message(
    {
      content: credential,
      type: Kilt.Message.BodyType.SUBMIT_ATTESTATION,
    },
    attesterFullDid.did,
    claimerLightDid.did
  )
  console.log('Credential message:')
  console.log(JSON.stringify(credentialMessage, undefined, 2))

  /* 7 Verify a credential */
  /* 7.1 Generate a verifier light DID */
  const verifierAuthenticationKey: Kilt.Did.NewLightDidAuthenticationKey =
    await keystore
      .generateKeypair({
        alg: Kilt.Did.SigningAlgorithms.Ed25519,
      })
      .then((keypair) => {
        return {
          publicKey: keypair.publicKey,
          type: Kilt.Did.DidUtils.getVerificationKeyTypeForSigningAlgorithm(
            keypair.alg
          ) as Kilt.Did.LightDidSupportedVerificationKeyType,
        }
      })
  const verifierEncryptionKey: Kilt.NewDidEncryptionKey = await keystore
    .generateKeypair({
      alg: Kilt.Did.EncryptionAlgorithms.NaclBox,
    })
    .then((keypair) => {
      return {
        publicKey: keypair.publicKey,
        type: Kilt.Did.DidUtils.getEncryptionKeyTypeForEncryptionAlgorithm(
          keypair.alg
        ),
      }
    })
  const verifierLightDid = Kilt.Did.LightDidDetails.fromDetails({
    authenticationKey: verifierAuthenticationKey,
    encryptionKey: verifierEncryptionKey,
  })
  console.log(`Verifier DID: ${verifierLightDid.did}`)

  /* 7.2 Build a request for credential message */
  const requestForCredentialMessage = new Kilt.Message(
    {
      type: Kilt.Message.BodyType.REQUEST_CREDENTIAL,
      content: {
        cTypes: [
          { cTypeHash: ctype.hash, trustedAttesters: [attesterFullDid.did] },
        ],
      },
    },
    verifierLightDid.did,
    claimerLightDid.did
  )
  console.log('Request for credential message:')
  console.log(JSON.stringify(requestForCredentialMessage, undefined, 2))

  /* 7.5 Create a presentation for the request credential */
  const selectedCredential = await credential.createPresentation({
    selectedAttributes: ['name'],
    signer: keystore,
    claimerDid: claimerLightDid,
  })
  console.log('Presentation:')
  console.log(JSON.stringify(selectedCredential))

  /* 7.6 Create a presentation message and encrypt for the verifier */
  const presentationMessage = new Kilt.Message(
    {
      content: [selectedCredential],
      type: Kilt.Message.BodyType.SUBMIT_CREDENTIAL,
    },
    claimerLightDid.did,
    verifierLightDid.did
  )
  console.log('Presentation message:')
  console.log(JSON.stringify(presentationMessage, undefined, 2))

  const encryptedPresentationMessage = await presentationMessage.encrypt(
    claimerLightDid.encryptionKey!.id,
    claimerLightDid,
    keystore,
    verifierLightDid.assembleKeyId(verifierLightDid.encryptionKey!.id)
  )

  /* 7.7 Decrypt and verify presentation message */
  const decryptedPresentationMessage = await Kilt.Message.decrypt(
    encryptedPresentationMessage,
    keystore,
    verifierLightDid
  )
  if (
    decryptedPresentationMessage.body.type ===
    Kilt.Message.BodyType.SUBMIT_CREDENTIAL
  ) {
    const presentedCredential = decryptedPresentationMessage.body.content.pop()!
    const isValid = await Kilt.Credential.fromCredential(
      presentedCredential
    ).verify()
    console.log(`Presented credential validity status: ${isValid}`)
    console.log('Credential from verifier perspective:')
    console.log(JSON.stringify(presentedCredential, undefined, 2))
  }
}

// execute
main().finally(() => Kilt.disconnect())
