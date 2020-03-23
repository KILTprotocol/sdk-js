/* eslint-disable no-console */
import Kilt, {
  ICType,
  CTypeUtils,
  MessageBodyType,
  AttestedClaim,
  Identity,
  Claim,
  Accumulator,
  CombinedPresentation,
  AttesterIdentity,
} from '../src'
import constants from '../src/test/constants'
import { IRevocableAttestation } from '../src/types/Attestation'

async function doAttestation(): Promise<{
  claimer: Identity
  attester: AttesterIdentity
  claim: Claim
  attestedClaim: AttestedClaim
  accumulator: Accumulator
  attestation: IRevocableAttestation
}> {
  // How to generate an Identity
  // const mnemonic = Kilt.Identity.generateMnemonic()
  const claimer = await Kilt.Identity.buildFromMnemonic(
    'wish rather clinic rather connect culture frown like quote effort cart faculty'
  )
  // const address = claimer.getAddress()

  // At this point the generated Identity has no tokens.
  // If you want to interact with the blockchain, you will have to get some.
  // Contact faucet@kilt.io and provide the address of the identity

  // How to build a Ctype
  // First build a schema
  const ctypeSchema: ICType['schema'] = {
    $id: 'DriversLicense',
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    properties: {
      name: {
        type: 'string',
      },
      age: {
        type: 'integer',
      },
    },
    type: 'object',
  }
  // Generate the Hash for it
  const ctypeHash = CTypeUtils.getHashForSchema(ctypeSchema)

  // Put everything together
  const rawCtype: ICType = {
    schema: ctypeSchema,
    hash: ctypeHash,
    owner: claimer.getAddress(),
  }

  // Build the CType object
  const ctype = new Kilt.CType(rawCtype)

  // Before you can store the ctype on the blockchain, you have to connect to it.
  // Setup your local node and start it, using the dev chain
  // Kilt.connect('ws://localhost:9944')

  // Store ctype on blockchain
  // ! This costs tokens !
  // Also note, that the completely same ctype can only be stored once on the blockchain.
  // ctype.store(claimer)

  // ------------------------- Attester ----------------------------------------

  // To get an attestation, we need an Attester
  // we can generate a new keypair, which will take about 20 minutes:
  // const attester = await Kilt.AttesterIdentity.buildFromMnemonic("...")
  // or we just use unsafe precalculated keys (just for demo purposes!):
  const attester = await Kilt.AttesterIdentity.buildFromMnemonicAndKey(
    constants.PUBLIC_KEY.valueOf(),
    constants.PRIVATE_KEY.valueOf(),
    'feel hazard trip seven traffic make hero kingdom speed transfer rug success'
  )

  // for privacy enhanced attestations the attester has to initiate the attestation process
  const {
    message: initiateAttestationMessage,
    session: attestersSession,
  } = await Kilt.Attester.initiateAttestation(attester)

  // ------------------------- CLAIMER -----------------------------------------
  // And we need to build a request for an attestation
  const rawClaim = {
    name: 'Alice',
    age: 29,
  }

  const claim = new Kilt.Claim({
    cTypeHash: ctypeHash,
    contents: rawClaim,
    owner: claimer.getAddress(),
  })

  const {
    message: messageBody,
    session: claimerSession,
  } = await Kilt.Claimer.requestAttestation({
    claim,
    identity: claimer,
    initiateAttestationMsg: initiateAttestationMessage,
    attesterPubKey: attester.getPublicGabiKey(),
  })

  // Excursion to the messaging system
  // If the Attester doesn't live on the same machine, we need to send her a message
  const message = new Kilt.Message(
    messageBody,
    claimer,
    attester.getPublicIdentity()
  )
  // The message can be encrypted as follows
  const encrypted = message.getEncryptedMessage()

  // claimer sends [[encrypted]] to the attester

  // ------------------------- Attester ----------------------------------------
  // Check the validity of the message
  Kilt.Message.ensureHashAndSignature(encrypted, claimer.getAddress())
  // When the Attester receives the message, she can decrypt it
  const decrypted = Kilt.Message.createFromEncryptedMessage(encrypted, attester)

  // And make sure, that the sender is the owner of the identity
  Kilt.Message.ensureOwnerIsSender(decrypted)

  if (decrypted.body.type !== MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM) {
    throw new Error('Unexpected message type')
  }
  const {
    attestation,
    message: submitAttestation,
  } = await Kilt.Attester.issueAttestation(
    attester,
    decrypted.body,
    attestersSession
  )
  console.log('Attestation should be stored for revocation: ', attestation)

  // And send a message back
  const messageBack = new Kilt.Message(
    submitAttestation,
    attester,
    claimer.getPublicIdentity()
  )
  const encryptedBack = messageBack.getEncryptedMessage()

  // ------------------------- CLAIMER -----------------------------------------
  Kilt.Message.ensureHashAndSignature(encryptedBack, attester.getAddress())
  // FIXME: Why no work! :_(
  // const decryptedBack = Kilt.Message.createFromEncryptedMessage(
  //   encrypted,
  //   claimer
  // )

  if (messageBack.body.type !== MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM) {
    throw new Error('Should be SUBMIT_ATTESTATION_FOR_CLAIM')
  }
  const attestedClaim = await Kilt.Claimer.buildAttestedClaim(
    claimer,
    messageBack.body,
    claimerSession
  )
  console.log('Claimer', claimer.getAddress(), '\n')
  console.log('Attester', attester.getAddress(), '\n')

  console.log('Ctype', ctype, '\n')
  console.log('Claim', claim, '\n')

  console.log('RFO Message', message, '\n')
  console.log('Submit attestation:', submitAttestation, '\n')
  console.log('AttestedClaim', attestedClaim, '\n')
  console.log('AttestedClaim message', messageBack, '\n')
  const acc = attester.accumulator
  if (typeof acc === 'undefined') {
    throw new Error('No no this is not possible!')
  }
  return {
    claimer,
    attester,
    claim,
    attestedClaim,
    accumulator: acc,
    attestation,
  }
}

async function doVerification(
  claimer: Identity,
  attester: AttesterIdentity,
  attestedClaim: AttestedClaim,
  accumulator: Accumulator
): Promise<void> {
  const attesterPubKey = attester.getPublicGabiKey()
  // ------------------------- Verifier ----------------------------------------
  const [session, request] = await Kilt.Verifier.newRequest()
    .requestPresentationForCtype({
      ctypeHash: attestedClaim.attestation.cTypeHash,
      attributes: ['age'],
    })
    .finalize(true)

  // ------------------------- Claimer -----------------------------------------
  // use createPresentation if you don't want to use the privacy enhanced method
  const presentation = await Kilt.Claimer.createPresentation(
    claimer,
    request,
    [attestedClaim],
    [attesterPubKey]
  )

  // ------------------------- Verifier ----------------------------------------
  if (presentation.content instanceof CombinedPresentation) {
    const [verified, claims] = await Kilt.Verifier.verifyPresentation(
      presentation,
      session,
      [accumulator],
      [attesterPubKey]
    )
    console.log('Received claims: ', claims)
    console.log('All valid? ', verified)
  }
}

// do an attestation and a verification
async function example(): Promise<void> {
  const {
    claimer,
    attester,
    attestedClaim,
    attestation,
  } = await doAttestation()
  // should succeed
  await doVerification(claimer, attester, attestedClaim, attester.accumulator)
  await Kilt.Attester.revokeAttestation(attester, attestation)
  // should fail
  await doVerification(claimer, attester, attestedClaim, attester.accumulator)
}

// connect to the blockchain, execute the examples and then disconnect
Kilt.connect('wss://full-nodes.kilt.io:9944')
  .then(example)
  .finally(() => Kilt.disconnect('wss://full-nodes.kilt.io:9944'))
  .then(
    () => process.exit(),
    e => {
      console.log('Error Error Error!', e)
      process.exit(1)
    }
  )
