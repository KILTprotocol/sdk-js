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

const NODE_URL = 'ws://127.0.0.1:9944'

async function main(): Promise<void> {
  /* 1. Initialize KILT SDK and set up node endpoint */
  await Kilt.init({ address: NODE_URL })
  const { api } =
    await Kilt.ChainHelpers.BlockchainApiConnection.getConnectionOrConnect()

  /* 2. How to generate an account with light DIDs */
  // Initialize a keyring
  const keyring = new Kilt.Utils.Keyring({
    ss58Format: 38,
    type: 'ed25519',
  })
  // Initialize the demo keystore
  const keystore = new Kilt.Did.DemoKeystore()
  // Generate a new keypair for authentication
  const claimerMnemonic = mnemonicGenerate()
  const claimerKeystoreSigningKey = await keystore.generateKeypair({
    alg: Kilt.Did.SigningAlgorithms.Sr25519,
    seed: claimerMnemonic,
  })
  const claimerAuthenticationKey: Kilt.Did.NewLightDidAuthenticationKey = {
    publicKey: claimerKeystoreSigningKey.publicKey,
    type: Kilt.Did.DemoKeystore.getKeyTypeForAlg(
      claimerKeystoreSigningKey.alg
    ) as Kilt.Did.LightDidSupportedVerificationKeyType,
  }
  const claimerKeystoreEncryptionKey = await keystore.generateKeypair({
    alg: Kilt.Did.EncryptionAlgorithms.NaclBox,
    seed: claimerMnemonic,
  })
  const claimerEncryptionKey: Kilt.NewDidEncryptionKey = {
    publicKey: claimerKeystoreEncryptionKey.publicKey,
    type: Kilt.Did.DemoKeystore.getKeyTypeForAlg(
      claimerKeystoreEncryptionKey.alg
    ) as Kilt.EncryptionKeyType,
  }
  // Create a light DID from the generated authentication key.
  const claimerLightDid = Kilt.Did.LightDidDetails.fromDetails({
    authenticationKey: claimerAuthenticationKey,
    encryptionKey: claimerEncryptionKey,
  })
  // Example `did:kilt:light:004oLh6pqc8dVqHJ6TXdopJzrLm3Y64HbHvvihATYj5KiizbRM:z1Ac9CMtYCTRWjetJfJqJoV7FcNQfmHbgaABnPm8S8UM29z77w5MVGL3mTgACDa2CJYU6Svcw6o9YK9KGDBXZEx`.
  console.log(claimerLightDid.did)

  /* 3.1. Building a CTYPE */
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
  /* To store the CTYPE on the blockchain, you have to call: */
  const accountMnemonic =
    'receive clutch item involve chaos clutch furnace arrest claw isolate okay together'
  const account = keyring.addFromMnemonic(accountMnemonic)

  /* We create a full DID for the attester */
  const attesterMnemonic = mnemonicGenerate()
  const attesterKeystoreSigningKey = await keystore.generateKeypair({
    alg: Kilt.Did.SigningAlgorithms.Sr25519,
    seed: attesterMnemonic,
  })
  const attesterAuthenticationKey: Kilt.NewDidVerificationKey = {
    publicKey: attesterKeystoreSigningKey.publicKey,
    type: Kilt.Did.DemoKeystore.getKeyTypeForAlg(
      attesterKeystoreSigningKey.alg
    ) as Kilt.VerificationKeyType,
  }
  const attesterKeystoreEncryptionKey = await keystore.generateKeypair({
    alg: Kilt.Did.EncryptionAlgorithms.NaclBox,
    seed: attesterMnemonic,
  })
  const attesterEncryptionKey: Kilt.NewDidEncryptionKey = {
    publicKey: attesterKeystoreEncryptionKey.publicKey,
    type: Kilt.Did.DemoKeystore.getKeyTypeForAlg(
      attesterKeystoreEncryptionKey.alg
    ) as Kilt.EncryptionKeyType,
  }
  const attesterFullDid = await new Kilt.Did.FullDidCreationBuilder(
    api,
    attesterAuthenticationKey
  )
    .addEncryptionKey(attesterEncryptionKey)
    .setAttestationKey(attesterAuthenticationKey)
    .consumeWithHandler(keystore, account.address, async (creationTx) => {
      await Kilt.BlockchainUtils.signAndSubmitTx(creationTx, account, {
        resolveOn: Kilt.BlockchainUtils.IS_IN_BLOCK,
        reSign: true,
      })
    })

  const ctypeCreationTx = await ctype.getStoreTx()
  const attesterCtypeCreationAuthorizedTx =
    await attesterFullDid.authorizeExtrinsic(
      ctypeCreationTx,
      keystore,
      account.address
    )
  await Kilt.BlockchainUtils.signAndSubmitTx(
    attesterCtypeCreationAuthorizedTx,
    account,
    {
      resolveOn: Kilt.BlockchainUtils.IS_IN_BLOCK,
      reSign: true,
    }
  )

  /* signAndSubmitTx can be passed SubscriptionPromise.Options, to control resolve and reject criteria, set tip value, or activate re-sign-re-send capabilities:
  // await Kilt.BlockchainUtils.signAndSubmitTx(attesterCtypeCreationAuthorizedTx, account, {
  //   resolveOn: Kilt.BlockchainUtils.IS_FINALIZED,
  //   rejectOn: Kilt.BlockchainUtils.IS_ERROR,
  //   reSign: true,
  //   tip: 10_000_000,
  // })

  /* or manually step by step */
  // const chain = Kilt.connect()
  // chain.signTx(account, attesterCtypeCreationAuthorizedTx, 10_000)
  // await Kilt.BlockchainUtils.submitSignedTx(tx)

  /* At the end of the process, the `CType` object should contain the following. */
  console.log(ctype)

  /* To construct a claim, we need to know the structure of the claim that is defined in a CTYPE */
  const rawClaim = {
    name: 'Alice',
    age: 29,
  }

  /* Now we can easily create the KILT compliant claim */
  const claim = Kilt.Claim.fromCTypeAndClaimContents(
    ctype,
    rawClaim,
    claimerLightDid.did
  )

  /* As a result we get the following KILT claim: */
  console.log(claim)

  /* 5.1.1. Requesting an Attestation */
  const requestForAttestation = Kilt.RequestForAttestation.fromClaim(claim)
  await requestForAttestation.signWithDidKey(
    keystore,
    claimerLightDid,
    claimerLightDid.authenticationKey.id
  )
  /* The `requestForAttestation` object looks like this: */
  console.log(requestForAttestation)

  /* Creating an encryption key */

  /* First, we create the request for an attestation message in which the Claimer automatically encodes the message with the public key of the Attester: */
  const messageBody: Kilt.MessageBody = {
    content: { requestForAttestation },
    type: Kilt.Message.BodyType.REQUEST_ATTESTATION,
  }
  const message = new Kilt.Message(
    messageBody,
    claimerLightDid.did,
    attesterFullDid.did
  )

  /* The complete `message` looks as follows: */
  console.log(message)

  /* The message can be encrypted as follows: */
  const encryptedMessage = await message.encrypt(
    claimerLightDid.encryptionKey!.id,
    claimerLightDid,
    keystore,
    attesterFullDid.assembleKeyId(attesterFullDid.encryptionKey!.id)
  )

  /* Therefore, **during decryption** both the **sender account and the validity of the message are checked automatically**. */
  const decrypted = await Kilt.Message.decrypt(
    encryptedMessage,
    keystore,
    attesterFullDid
  )
  /* At this point the Attester has the original request for attestation object: */
  if (decrypted.body.type === Kilt.Message.BodyType.REQUEST_ATTESTATION) {
    const extractedRequestForAttestation: Kilt.IRequestForAttestation =
      decrypted.body.content.requestForAttestation

    /* The Attester creates the attestation based on the IRequestForAttestation object she received: */
    const attestation = Kilt.Attestation.fromRequestAndDid(
      extractedRequestForAttestation,
      attesterFullDid.did
    )

    /* The complete `attestation` object looks as follows: */
    console.log(attestation)

    /* Now the Attester can store and authorize the attestation on the blockchain, which also costs tokens: */
    const attestationCreationTx = await attestation.getStoreTx()
    const attesterAttestationCreationAuthorizedTx =
      await attesterFullDid.authorizeExtrinsic(
        attestationCreationTx,
        keystore,
        account.address
      )
    await Kilt.BlockchainUtils.signAndSubmitTx(
      attesterAttestationCreationAuthorizedTx,
      account,
      {
        resolveOn: Kilt.BlockchainUtils.IS_IN_BLOCK,
        reSign: true,
      }
    )

    /* The request for attestation is fulfilled with the attestation, but it needs to be combined into the `Credential` object before sending it back to the Claimer: */
    const credential = Kilt.Credential.fromRequestAndAttestation(
      extractedRequestForAttestation,
      attestation
    )
    /* The complete `credential` object looks as follows: */
    console.log(credential)

    /* The Attester has to send the `credential` object back to the Claimer in the following message: */
    const messageBodyBack: Kilt.MessageBody = {
      content: credential,
      type: Kilt.Message.BodyType.SUBMIT_ATTESTATION,
    }
    const messageBack = new Kilt.Message(
      messageBodyBack,
      attesterFullDid.did,
      claimerLightDid.did
    )

    /* The complete `messageBack` message then looks as follows: */
    console.log(messageBack)

    /* After receiving the message, the Claimer just needs to save it and can use it later for verification: */
    if (messageBack.body.type === Kilt.Message.BodyType.SUBMIT_ATTESTATION) {
      const myCredential = Kilt.Credential.fromCredential({
        ...messageBack.body.content,
        request: requestForAttestation,
      })

      /* 6. Verify a Claim */

      /* As in the attestation, you need a second account to act as the verifier: */
      const verifierMnemonic = mnemonicGenerate()
      const verifierKeystoreSigningKey = await keystore.generateKeypair({
        alg: Kilt.Did.SigningAlgorithms.Sr25519,
        seed: verifierMnemonic,
      })
      const verifierAuthenticationKey: Kilt.Did.NewLightDidAuthenticationKey = {
        publicKey: verifierKeystoreSigningKey.publicKey,
        type: Kilt.Did.DemoKeystore.getKeyTypeForAlg(
          verifierKeystoreSigningKey.alg
        ) as Kilt.Did.LightDidSupportedVerificationKeyType,
      }
      const verifierKeystoreEncryptionKey = await keystore.generateKeypair({
        alg: Kilt.Did.EncryptionAlgorithms.NaclBox,
        seed: verifierMnemonic,
      })
      const verifierEncryptionKey: Kilt.NewDidEncryptionKey = {
        publicKey: verifierKeystoreEncryptionKey.publicKey,
        type: Kilt.Did.DemoKeystore.getKeyTypeForAlg(
          verifierKeystoreEncryptionKey.alg
        ) as Kilt.EncryptionKeyType,
      }
      // Create the verifier's light DID from the generated authentication key.
      const verifierLightDid = Kilt.Did.LightDidDetails.fromDetails({
        authenticationKey: verifierAuthenticationKey,
        encryptionKey: verifierEncryptionKey,
      })

      /* 6.1. Request presentation for CTYPE */
      const messageBodyForClaimer: Kilt.MessageBody = {
        type: Kilt.Message.BodyType.REQUEST_CREDENTIAL,
        content: { cTypes: [{ cTypeHash: ctype.hash }] },
      }
      const messageForClaimer = new Kilt.Message(
        messageBodyForClaimer,
        verifierLightDid.did,
        claimerLightDid.did
      )

      /* Now the claimer can send a message to verifier including the credential: */
      console.log('Requested from verifier:', messageForClaimer.body.content)

      const copiedCredential = Kilt.Credential.fromCredential(
        JSON.parse(JSON.stringify(myCredential))
      )

      const credentialForVerifier = await copiedCredential.createPresentation({
        selectedAttributes: ['name'],
        signer: keystore,
        claimerDid: claimerLightDid,
      })

      const messageBodyForVerifier: Kilt.MessageBody = {
        content: [credentialForVerifier],
        type: Kilt.Message.BodyType.SUBMIT_CREDENTIAL,
      }
      const messageForVerifier = new Kilt.Message(
        messageBodyForVerifier,
        claimerLightDid.did,
        verifierLightDid.did
      )

      /* The message can be encrypted as follows: */
      const encryptedMessageForVerifier = await messageForVerifier.encrypt(
        claimerLightDid.encryptionKey!.id,
        claimerLightDid,
        keystore,
        verifierLightDid.assembleKeyId(verifierLightDid.encryptionKey!.id)
      )

      /* Therefore, **during decryption** both the **sender account and the validity of the message are checked automatically**. */
      const decryptedMessageForVerifier = await Kilt.Message.decrypt(
        encryptedMessageForVerifier,
        keystore,
        verifierLightDid
      )

      /* 6.2 Verify presentation */
      /* When verifying the claimer's message, the verifier has to use their session which was created during the CTYPE request: */
      if (
        decryptedMessageForVerifier.body.type ===
        Kilt.Message.BodyType.SUBMIT_CREDENTIAL
      ) {
        const claims = decryptedMessageForVerifier.body.content
        console.log('before verifying', credentialForVerifier)

        const verifiablePresentation = Kilt.Credential.fromCredential(claims[0])
        const isValid = await verifiablePresentation.verify()
        console.log('Verification success?', isValid)
        console.log('Credential from verifier perspective:\n', claims)
      }
    }
  }
}

// execute
main().finally(() => Kilt.disconnect())
