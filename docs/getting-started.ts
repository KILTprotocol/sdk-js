/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-console */
import * as Kilt from '@kiltprotocol/sdk-js'
import { IDidDetails, KeyRelationship } from '@kiltprotocol/sdk-js'
import type {
  SubmittableExtrinsic,
  IRequestForAttestation,
  MessageBody,
  IDidKeyDetails,
} from '@kiltprotocol/sdk-js'
import { mnemonicGenerate } from '@polkadot/util-crypto'

const NODE_URL = 'ws://127.0.0.1:9944'

let tx: SubmittableExtrinsic
let authorizedTx: SubmittableExtrinsic

async function main(): Promise<void> {
  /* 1. Initialize KILT SDK and set up node endpoint */
  await Kilt.init({ address: NODE_URL })

  /* 2. How to generate an account with light DIDs */
  // Initialize a keyring
  const keyring = new Kilt.Utils.Keyring({
    ss58Format: 38,
    type: 'ed25519',
  })
  // Initialize the demo keystore
  const keystore = new Kilt.Did.DemoKeystore()
  // Create a mnemonic seed
  const claimerMnemonic = mnemonicGenerate()
  // Generate a new keypair for authentication with the generated seed
  const claimerSigningKeypair = await keystore.generateKeypair({
    alg: Kilt.Did.SigningAlgorithms.Ed25519,
    seed: claimerMnemonic,
  })
  const claimerEncryptionKeypair = await keystore.generateKeypair({
    alg: Kilt.Did.EncryptionAlgorithms.NaclBox,
    seed: claimerMnemonic,
  })
  // Create a light DID from the generated authentication key.
  const claimerLightDid = new Kilt.Did.LightDidDetails({
    authenticationKey: {
      publicKey: claimerSigningKeypair.publicKey,
      type: Kilt.Did.DemoKeystore.getKeypairTypeForAlg(
        claimerSigningKeypair.alg
      ),
    },
    encryptionKey: {
      publicKey: claimerEncryptionKeypair.publicKey,
      type: Kilt.Did.DemoKeystore.getKeypairTypeForAlg(
        claimerEncryptionKeypair.alg
      ),
    },
  })
  // Example `did:kilt:light:014rXt3vRYupKgtUJgjGjQG45PBa6uDbDzF48iFn96F9RYrBMB:oWFlomlwdWJsaWNLZXlYIABgPwMAHGu5yMbBpdiiFH2djWzJqbSpUc0ymDIVlqV0ZHR5cGVmeDI1NTE5`.
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

  const fullDid = await Kilt.Did.createOnChainDidFromSeed(
    account,
    keystore,
    accountMnemonic,
    // using ed25519 as key type because this is how the endowed account is set up
    Kilt.Did.SigningAlgorithms.Ed25519
  )

  tx = await ctype.store()
  authorizedTx = await fullDid.authorizeExtrinsic(tx, keystore, account.address)
  await Kilt.BlockchainUtils.signAndSubmitTx(authorizedTx, account, {
    resolveOn: Kilt.BlockchainUtils.IS_IN_BLOCK,
    reSign: true,
  })

  /* signAndSubmitTx can be passed SubscriptionPromise.Options, to control resolve and reject criteria, set tip value, or activate re-sign-re-send capabilities:
  // await Kilt.BlockchainUtils.signAndSubmitTx(tx, account, {
  //   resolveOn: Kilt.BlockchainUtils.IS_FINALIZED,
  //   rejectOn: Kilt.BlockchainUtils.IS_ERROR,
  //   reSign: true,
  //   tip: 10_000_000,
  // })

  /* or manually step by step */
  // const chain = Kilt.connect()
  // chain.signTx(account, tx, 10_000)
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
  await requestForAttestation.signWithDid(keystore, claimerLightDid)
  /* The `requestForAttestation` object looks like this: */
  console.log(requestForAttestation)

  /* Before we can send the request for an attestation to an Attester, we should first fetch the on chain did and create an encryption key. */
  const attesterFullDid = (await Kilt.Did.resolveDoc(fullDid.did))
    ?.details as IDidDetails

  /* Creating an encryption key */

  /* First, we create the request for an attestation message in which the Claimer automatically encodes the message with the public key of the Attester: */
  const messageBody: MessageBody = {
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

  const attesterEncryptionKey = attesterFullDid.getKeys(
    KeyRelationship.keyAgreement
  )[0] as IDidKeyDetails<string>

  const claimerEncryptionKey = claimerLightDid.getKeys(
    KeyRelationship.keyAgreement
  )[0] as IDidKeyDetails<string>

  /* The message can be encrypted as follows: */
  const encryptedMessage = await message.encrypt(
    claimerEncryptionKey,
    attesterEncryptionKey,
    keystore
  )

  /* Therefore, **during decryption** both the **sender account and the validity of the message are checked automatically**. */
  const decrypted = await Kilt.Message.decrypt(encryptedMessage, keystore)
  /* At this point the Attester has the original request for attestation object: */
  if (decrypted.body.type === Kilt.Message.BodyType.REQUEST_ATTESTATION) {
    const extractedRequestForAttestation: IRequestForAttestation =
      decrypted.body.content.requestForAttestation

    /* The Attester creates the attestation based on the IRequestForAttestation object she received: */
    const attestation = Kilt.Attestation.fromRequestAndDid(
      extractedRequestForAttestation,
      attesterFullDid.did
    )

    /* The complete `attestation` object looks as follows: */
    console.log(attestation)

    /* Now the Attester can store and authorize the attestation on the blockchain, which also costs tokens: */
    tx = await attestation.store()
    authorizedTx = await fullDid.authorizeExtrinsic(
      tx,
      keystore,
      account.address
    )
    await Kilt.BlockchainUtils.signAndSubmitTx(authorizedTx, account, {
      resolveOn: Kilt.BlockchainUtils.IS_IN_BLOCK,
      reSign: true,
    })

    /* The request for attestation is fulfilled with the attestation, but it needs to be combined into the `Credential` object before sending it back to the Claimer: */
    const credential = Kilt.Credential.fromRequestAndAttestation(
      extractedRequestForAttestation,
      attestation
    )
    /* The complete `credential` object looks as follows: */
    console.log(credential)

    /* The Attester has to send the `credential` object back to the Claimer in the following message: */
    const messageBodyBack: MessageBody = {
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
      const verifierSigningKeypair = await keystore.generateKeypair({
        alg: Kilt.Did.SigningAlgorithms.Ed25519,
        seed: verifierMnemonic,
      })
      const verifierEncryptionKeypair = await keystore.generateKeypair({
        alg: Kilt.Did.EncryptionAlgorithms.NaclBox,
        seed: verifierMnemonic,
      })
      // Create the verifier's light DID from the generated authentication key.
      const verifierLightDID = new Kilt.Did.LightDidDetails({
        authenticationKey: {
          publicKey: verifierSigningKeypair.publicKey,
          type: Kilt.Did.DemoKeystore.getKeypairTypeForAlg(
            verifierSigningKeypair.alg
          ),
        },
        encryptionKey: {
          publicKey: verifierEncryptionKeypair.publicKey,
          type: Kilt.Did.DemoKeystore.getKeypairTypeForAlg(
            verifierEncryptionKeypair.alg
          ),
        },
      })

      /* 6.1. Request presentation for CTYPE */
      const messageBodyForClaimer: MessageBody = {
        type: Kilt.Message.BodyType.REQUEST_CREDENTIAL,
        content: { cTypes: [{ cTypeHash: ctype.hash }] },
      }
      const messageForClaimer = new Kilt.Message(
        messageBodyForClaimer,
        verifierLightDID.did,
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

      const messageBodyForVerifier: MessageBody = {
        content: [credentialForVerifier],
        type: Kilt.Message.BodyType.SUBMIT_CREDENTIAL,
      }
      const messageForVerifier = new Kilt.Message(
        messageBodyForVerifier,
        claimerLightDid.did,
        verifierLightDID.did
      )

      const verifierEncryptionKey = verifierLightDID.getKeys(
        KeyRelationship.keyAgreement
      )[0] as IDidKeyDetails<string>

      /* The message can be encrypted as follows: */
      const encryptedMessageForVerifier = await messageForVerifier.encrypt(
        claimerEncryptionKey,
        verifierEncryptionKey,
        keystore
      )

      /* Therefore, **during decryption** both the **sender account and the validity of the message are checked automatically**. */
      const decryptedMessageForVerifier = await Kilt.Message.decrypt(
        encryptedMessageForVerifier,
        keystore
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
