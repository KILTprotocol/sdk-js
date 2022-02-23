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
  /* 1.2 Connect to a KILT node and setup the crypto */
  await Kilt.init({ address: NODE_URL })
  const { api } =
    await Kilt.ChainHelpers.BlockchainApiConnection.getConnectionOrConnect()

  const keyring = new Kilt.Utils.Keyring({
    ss58Format: 38,
    type: 'ed25519',
  })
  const keystore = new Kilt.Did.DemoKeystore()
  console.log(`Connected to KILT endpoint ${NODE_URL}`)

  /* 1.3 Generate a dev account with KILT tokens (local deployment only) */
  const devAccount = keyring.addFromMnemonic(
    'receive clutch item involve chaos clutch furnace arrest claw isolate okay together'
  )

  /* 2.1 Generate an attester KILT account and on-chain DID */
  const attesterMnemonic = mnemonicGenerate()
  console.log(`Attester mnemonic: ${attesterMnemonic}`)

  const attesterAccount = keyring.addFromMnemonic(attesterMnemonic)
  console.log(`Attester KILT address: ${attesterAccount.address}`)

  const transferAmount = new BN('10000000000000000')
  await Kilt.Balance.getTransferTx(
    attesterAccount.address,
    transferAmount
  ).then((tx) =>
    Kilt.BlockchainUtils.signAndSubmitTx(tx, devAccount, {
      resolveOn: Kilt.BlockchainUtils.IS_IN_BLOCK,
      reSign: true,
    })
  )
  console.log(`Attester address funded!`)

  const attesterAuthenticationKey: Kilt.NewDidVerificationKey = await keystore
    .generateKeypair({
      alg: Kilt.Did.SigningAlgorithms.Sr25519,
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

  /* 2.2 Build a CType */
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

  /* 2.3 Store the CType on the KILT blockchain */
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

  /* 3.1 Generate a claimer light DID */
  const claimerAuthenticationKey: Kilt.Did.NewLightDidAuthenticationKey =
    await keystore
      .generateKeypair({
        alg: Kilt.Did.SigningAlgorithms.Sr25519,
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

  /* 3.2 Build a claim */
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

  /* 3.3 Build a request for attestation */
  const requestForAttestation = Kilt.RequestForAttestation.fromClaim(claim)
  await requestForAttestation.signWithDidKey(
    keystore,
    claimerLightDid,
    claimerLightDid.authenticationKey.id
  )
  console.log('Request for attestation:')
  console.log(JSON.stringify(requestForAttestation, undefined, 2))

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

  const encryptedRequestForAttestationMessage =
    await requestForAttestationMessage.encrypt(
      claimerLightDid.encryptionKey!.id,
      claimerLightDid,
      keystore,
      attesterFullDid.assembleKeyId(attesterFullDid.encryptionKey!.id)
    )

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

  /* 4.1 Build an attestation */
  const attestation = Kilt.Attestation.fromRequestAndDid(
    extractedRequestForAttestation,
    attesterFullDid.did
  )
  console.log('Attestation:')
  console.log(JSON.stringify(attestation, undefined, 2))

  /* 4.2 Store the attestation on the KILT blockchain */
  const attesterAuthorisedAttestationTx = await attestation
    .getStoreTx()
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

  const credential = Kilt.Credential.fromRequestAndAttestation(
    extractedRequestForAttestation,
    attestation
  )
  console.log('Credential:')
  console.log(JSON.stringify(credential, undefined, 2))

  /* 5.1 Generate a verifier light DID */
  const verifierAuthenticationKey: Kilt.Did.NewLightDidAuthenticationKey =
    await keystore
      .generateKeypair({
        alg: Kilt.Did.SigningAlgorithms.Sr25519,
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

  /* 5.2 Ask for credentials */
  const challenge = Kilt.Utils.UUID.generate()
  const requestForCredentialMessage = new Kilt.Message(
    {
      type: Kilt.Message.BodyType.REQUEST_CREDENTIAL,
      content: {
        cTypes: [
          { cTypeHash: ctype.hash, trustedAttesters: [attesterFullDid.did] },
        ],
        challenge,
      },
    },
    verifierLightDid.did,
    claimerLightDid.did
  )
  console.log('Request for credential message:')
  console.log(JSON.stringify(requestForCredentialMessage, undefined, 2))

  /* 5.3 Build a presentation */
  const selectedCredential = await credential.createPresentation({
    selectedAttributes: ['name'],
    signer: keystore,
    claimerDid: claimerLightDid,
    challenge,
  })
  console.log('Presentation:')
  console.log(JSON.stringify(selectedCredential))

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

  /* 5.4 Verify the presentation */
  const decryptedPresentationMessage = await Kilt.Message.decrypt(
    encryptedPresentationMessage,
    keystore,
    verifierLightDid
  )
  if (
    decryptedPresentationMessage.body.type ===
    Kilt.Message.BodyType.SUBMIT_CREDENTIAL
  ) {
    const credentials = decryptedPresentationMessage.body.content
    const credentialsValidity = await Promise.all(
      credentials.map((cred) => Kilt.Credential.fromCredential(cred).verify())
    )
    const isPresentationValid = credentialsValidity.every(
      (isValid) => isValid === true
    )
    console.log(`Presented credential validity status: ${isPresentationValid}`)
    console.log('Credentials from verifier perspective:')
    console.log(JSON.stringify(credentials, undefined, 2))
  }

  /* 6. Teardown */
  await Kilt.disconnect()
}

// execute
main()
