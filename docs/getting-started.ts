/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-console */
import Kilt, { KeyRelationship } from '@kiltprotocol/sdk-js'
import type {
  SubmittableExtrinsic,
  IRequestForAttestation,
  MessageBody,
} from '@kiltprotocol/sdk-js'

const NODE_URL = 'ws://127.0.0.1:9944'

let tx: SubmittableExtrinsic
let authorizedTx: SubmittableExtrinsic

async function main(): Promise<void> {
  /* 1. Initialize KILT SDK and set up node endpoint */
  await Kilt.init({ address: NODE_URL })

  /* 2. How to generate an Identity with light DIDs */
  // Initialize a keyring
  const keyring = new Kilt.Utils.Keyring.Keyring({
    ss58Format: 38,
    type: 'ed25519',
  })
  // Initialize the demo keystore
  const keystore = new Kilt.Did.DemoKeystore()
  // Create a mnemonic seed
  const generateClaimerMnemonic = Kilt.Utils.UUID.generate()
  // Generate a new keypair for authentication with the generated seed
  const authenticationKeyPublicDetails = await keystore.generateKeypair({
    alg: Kilt.Did.SigningAlgorithms.Ed25519,
    seed: generateClaimerMnemonic,
  })
  // Create a light DID from the generated authentication key.
  const claimerLightDID = new Kilt.Did.LightDidDetails({
    authenticationKey: {
      publicKey: authenticationKeyPublicDetails.publicKey,
      type: Kilt.Did.DemoKeystore.getKeypairTypeForAlg(
        authenticationKeyPublicDetails.alg
      ),
    },
  })
  // Will print `did:kilt:light:014sxSYXakw1ZXBymzT9t3Yw91mUaqKST5bFUEjGEpvkTuckar`.
  console.log(claimerLightDID.did)

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
  const identity = keyring.createFromUri(
    'receive clutch item involve chaos clutch furnace arrest claw isolate okay together'
  )
  const onChainDidIdentity = await Kilt.Did.createOnChainDidFromSeed(
    identity,
    keystore,
    // using ed25519 as key type because this is how the endowed identity is set up
    'ed25519'
  )

  tx = await ctype.store()
  authorizedTx = await onChainDidIdentity.authorizeExtrinsic(tx, keystore)
  await Kilt.BlockchainUtils.signAndSubmitTx(authorizedTx, identity)

  /* signAndSubmitTx can be passed SubscriptionPromise.Options, to control resolve and reject criteria, set tip value, or activate re-sign-re-send capabilities:
  // await Kilt.BlockchainUtils.signAndSubmitTx(tx, identity, {
  //   resolveOn: Kilt.BlockchainUtils.IS_FINALIZED,
  //   rejectOn: Kilt.BlockchainUtils.IS_ERROR,
  //   reSign: true,
  //   tip: 10_000_000,
  // })

  /* or manually step by step */
  // const chain = Kilt.connect()
  // chain.signTx(identity, tx, 10_000)
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
    claimerLightDID.did
  )

  /* As a result we get the following KILT claim: */
  console.log(claim)

  /* 5.1.1. Requesting an Attestation */
  const requestForAttestation = Kilt.RequestForAttestation.fromClaim(claim)

  /* The `requestForAttestation` object looks like this: */
  console.log(requestForAttestation)

  /* Before we can send the request for an attestation to an Attester, we should first fetch the on chain did and create an encryption key. */
  const attesterOnChainDid = await Kilt.Did.resolveDoc(onChainDidIdentity.did)

  /* Creating an encryption key */

  /* First, we create the request for an attestation message in which the Claimer automatically encodes the message with the public key of the Attester: */
  const messageBody: MessageBody = {
    content: { requestForAttestation },
    type: Kilt.Message.BodyType.REQUEST_ATTESTATION_FOR_CLAIM,
  }
  const message = new Kilt.Message(
    messageBody,
    claimerLightDID.did,
    attesterOnChainDid.details.did
  )

  /* The complete `message` looks as follows: */
  console.log(message)

  /* The message can be encrypted as follows: */
  const encryptedMessage = await message.encrypt(
    claimerLightDID.getKey(KeyRelationship.keyAgreement)[0],
    attesterOnChainDid.details.getKey(KeyRelationship.keyAgreement)[0],
    keystore
  )

  /* Therefore, **during decryption** both the **sender identity and the validity of the message are checked automatically**. */
  const decrypted = await Kilt.Message.decrypt(encryptedMessage, keystore)

  /* At this point the Attester has the original request for attestation object: */
  if (
    decrypted.body.type === Kilt.Message.BodyType.REQUEST_ATTESTATION_FOR_CLAIM
  ) {
    const extractedRequestForAttestation: IRequestForAttestation =
      decrypted.body.content.requestForAttestation

    /* The Attester creates the attestation based on the IRequestForAttestation object she received: */
    const attestation = Kilt.Attestation.fromRequestAndDid(
      extractedRequestForAttestation,
      attesterOnChainDid.details.did
    )

    /* The complete `attestation` object looks as follows: */
    console.log(attestation)

    /* Now the Attester can store and authorize the attestation on the blockchain, which also costs tokens: */
    tx = await attestation.store()
    authorizedTx = await onChainDidIdentity.authorizeExtrinsic(tx, keystore)
    await Kilt.BlockchainUtils.submitSignedTx(authorizedTx, {
      resolveOn: Kilt.BlockchainUtils.IS_IN_BLOCK,
    })

    /* The request for attestation is fulfilled with the attestation, but it needs to be combined into the `AttestedClaim` object before sending it back to the Claimer: */
    const attestedClaim = Kilt.AttestedClaim.fromRequestAndAttestation(
      extractedRequestForAttestation,
      attestation
    )
    /* The complete `attestedClaim` object looks as follows: */
    console.log(attestedClaim)

    /* The Attester has to send the `attestedClaim` object back to the Claimer in the following message: */
    const messageBodyBack: MessageBody = {
      content: attestedClaim,
      type: Kilt.Message.BodyType.SUBMIT_ATTESTATION_FOR_CLAIM,
    }
    const messageBack = new Kilt.Message(
      messageBodyBack,
      attesterOnChainDid.details.did,
      claimerLightDID.did
    )

    /* The complete `messageBack` message then looks as follows: */
    console.log(messageBack)

    /* After receiving the message, the Claimer just needs to save it and can use it later for verification: */
    if (
      messageBack.body.type ===
      Kilt.Message.BodyType.SUBMIT_ATTESTATION_FOR_CLAIM
    ) {
      const myAttestedClaim = Kilt.AttestedClaim.fromAttestedClaim({
        ...messageBack.body.content,
        request: requestForAttestation,
      })

      /* 6. Verify a Claim */

      /* As in the attestation, you need a second identity to act as the verifier: */
      const generateVerifierMnemonic = Kilt.Utils.UUID.generate()
      const verifierAuthenticationKeyPublicDetails = await keystore.generateKeypair(
        {
          alg: Kilt.Did.SigningAlgorithms.Ed25519,
          seed: generateVerifierMnemonic,
        }
      )
      // Create the verifier's light DID from the generated authentication key.
      const verifierLightDID = new Kilt.Did.LightDidDetails({
        authenticationKey: {
          publicKey: verifierAuthenticationKeyPublicDetails.publicKey,
          type: Kilt.Did.DemoKeystore.getKeypairTypeForAlg(
            verifierAuthenticationKeyPublicDetails.alg
          ),
        },
      })

      /* 6.1. Request presentation for CTYPE */
      const messageBodyForClaimer: MessageBody = {
        type: Kilt.Message.BodyType.REQUEST_CLAIMS_FOR_CTYPES,
        content: [{ cTypeHash: ctype.hash }],
      }
      const messageForClaimer = new Kilt.Message(
        messageBodyForClaimer,
        verifierLightDID.did,
        claimerLightDID.did
      )

      /* Now the claimer can send a message to verifier including the attested claim: */
      console.log('Requested from verifier:', messageForClaimer.body.content)

      const copiedCredential = Kilt.AttestedClaim.fromAttestedClaim(
        JSON.parse(JSON.stringify(myAttestedClaim))
      )
      copiedCredential.request.removeClaimProperties(['age'])

      const messageBodyForVerifier: MessageBody = {
        content: [copiedCredential],
        type: Kilt.Message.BodyType.SUBMIT_CLAIMS_FOR_CTYPES,
      }
      const messageForVerifier = new Kilt.Message(
        messageBodyForVerifier,
        claimerLightDID.did,
        verifierLightDID.did
      )

      /* 6.2 Verify presentation */
      /* When verifying the claimer's message, the verifier has to use their session which was created during the CTYPE request: */
      if (
        messageForVerifier.body.type ===
        Kilt.Message.BodyType.SUBMIT_CLAIMS_FOR_CTYPES
      ) {
        const claims = messageForVerifier.body.content
        const isValid = await Kilt.AttestedClaim.fromAttestedClaim(
          claims[0]
        ).verify()
        console.log('Verifcation success?', isValid)
        console.log('Attested claims from verifier perspective:\n', claims)
      }
    }
  }
}

// execute
main().finally(() => Kilt.disconnect())
