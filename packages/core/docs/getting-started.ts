/* eslint-disable no-console */
import * as Kilt from '../src'
import {
  IRequestAttestationForClaim,
  Message,
  MessageBodyType,
  ISubmitAttestationForClaim,
  ISubmitClaimsForCTypesClassic,
  Identity,
} from '../src'
import { DEFAULT_WS_ADDRESS } from '../src/blockchainApiConnection'

async function main(): Promise<void> {
  /* 2. How to generate an Identity */
  const claimerMnemonic = Kilt.Identity.generateMnemonic()
  // mnemonic: coast ugly state lunch repeat step armed goose together pottery bind mention
  console.log('claimer mnemonic', claimerMnemonic)
  const claimer = await Kilt.Identity.buildFromMnemonic(claimerMnemonic)
  // claimer.address: 5HXfLqrqbKoKyi61YErwUrWEa1PWxikEojV7PCnLJgxrWd6W
  console.log('claimer address', claimer.address)

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
  Kilt.connect(DEFAULT_WS_ADDRESS)
  const identity = await Kilt.Identity.buildFromMnemonic(
    'receive clutch item involve chaos clutch furnace arrest claw isolate okay together'
  )
  await ctype.store(identity)

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
    claimer.address
  )

  /* As a result we get the following KILT claim: */
  console.log(claim)

  /* 5.1.1. Requesting an Attestation */
  const {
    message: requestForAttestation,
  } = await Kilt.RequestForAttestation.fromClaimAndIdentity(claim, claimer)

  /* The `requestForAttestation` object looks like this: */
  console.log(requestForAttestation)

  /* before we can send the request for an attestation to an Attester, we should first create an Attester identity like above */
  const attesterMnemonic =
    'receive clutch item involve chaos clutch furnace arrest claw isolate okay together'
  const attester = await Kilt.Identity.buildFromMnemonic(attesterMnemonic)

  /* First, we create the request for an attestation message in which the Claimer automatically encodes the message with the public key of the Attester: */
  const messageBody: IRequestAttestationForClaim = {
    content: { requestForAttestation },
    type: MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM,
  }
  const message = new Kilt.Message(
    messageBody,
    claimer,
    attester.getPublicIdentity()
  )

  /* The complete `message` looks as follows: */
  console.log(message)

  /* The message can be encrypted as follows: */
  const encrypted = message.encrypt()

  /* Therefore, **during decryption** both the **sender identity and the validity of the message are checked automatically**. */
  const decrypted = Kilt.Message.decrypt(encrypted, attester)

  /* At this point the Attester has the original request for attestation object: */
  if (decrypted.body.type === MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM) {
    const extractedRequestForAttestation: IRequestAttestationForClaim =
      decrypted.body

    /* The Attester creates the attestation based on the IRequestForAttestation object she received: */
    const attestation = Kilt.Attestation.fromRequestAndPublicIdentity(
      extractedRequestForAttestation.content.requestForAttestation,
      attester.getPublicIdentity()
    )

    /* The complete `attestation` object looks as follows: */
    console.log(attestation)

    /* Now the Attester can store the attestation on the blockchain, which also costs tokens: */
    await attestation.store(attester)

    /* The request for attestation is fulfilled with the attestation, but it needs to be combined into the `AttestedClaim` object before sending it back to the Claimer: */
    const attestedClaim = Kilt.AttestedClaim.fromRequestAndAttestation(
      requestForAttestation,
      attestation
    )
    /* The complete `attestedClaim` object looks as follows: */
    console.log(attestedClaim)

    /* The Attester has to send the `attestedClaim` object back to the Claimer in the following message: */
    const messageBodyBack: ISubmitAttestationForClaim = {
      content: attestedClaim,
      type: MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM,
    }
    const messageBack = new Message(
      messageBodyBack,
      attester,
      claimer.getPublicIdentity()
    )

    /* The complete `messageBack` message then looks as follows: */
    console.log(messageBack)

    /* After receiving the message, the Claimer just needs to save it and can use it later for verification: */
    if (
      messageBack.body.type === MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM
    ) {
      const myAttestedClaim = Kilt.AttestedClaim.fromAttestedClaim({
        ...messageBack.body.content,
        request: requestForAttestation,
      })
      console.log(myAttestedClaim)

      /* As in the attestation, you need a second identity to act as the verifier: */
      const verifierMnemonic = Identity.generateMnemonic()
      const verifier = await Kilt.Identity.buildFromMnemonic(verifierMnemonic)

      /* 6.1.1. Without privacy enhancement */
      const {
        session: verifierSession,
      } = await Kilt.Verifier.newRequestBuilder()
        .requestPresentationForCtype({
          ctypeHash: ctype.hash,
          requestUpdatedAfter: new Date(), // request accumulator newer than NOW or the latest available
          properties: ['age', 'name'], // publicly shown to the verifier
        })
        .finalize(
          false, // don't allow privacy enhanced verification
          verifier,
          claimer.getPublicIdentity()
        )

      /* Now the claimer can send a message to verifier including the attested claim: */
      const messageBodyForVerifier: ISubmitClaimsForCTypesClassic = {
        content: [myAttestedClaim],
        type: MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_CLASSIC,
      }
      const messageForVerifier = new Kilt.Message(
        messageBodyForVerifier,
        claimer,
        verifier.getPublicIdentity()
      )

      /* When verifying the claimer's message, the verifier has to use their session which was created during the CTYPE request: */
      const {
        verified: isValid, // whether the presented attested claim(s) are valid
        claims, // the attested claims (potentially only with requested properties)
      } = await Kilt.Verifier.verifyPresentation(
        messageForVerifier,
        verifierSession
      )
      console.log('Verifcation success?', isValid)
      console.log('Attested claims from verifier perspective:\n', claims)
    }
  }
}
// execute
main().finally(() => Kilt.disconnect(DEFAULT_WS_ADDRESS))
