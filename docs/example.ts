/* eslint-disable no-console */
import Kilt, {
  ICType,
  CTypeUtils,
  MessageBodyType,
  Identity,
  Claim,
  AttesterIdentity,
  Credential,
  CType,
} from '../src'
import constants from '../src/test/constants'
import { IRevocationHandle } from '../src/types/Attestation'
import { getBalance } from '../src/balance/Balance.chain'

const NODE_URL = 'ws://127.0.0.1:9944'

async function setup(): Promise<{
  claimer: Identity
  attester: AttesterIdentity
  claim: Claim
  ctype: CType
}> {
  // ------------------------- Attester ----------------------------------------

  // To get an attestation, we need an Attester
  // we can generate a new keypair, which will take about 20 minutes:
  // const attester = await Kilt.AttesterIdentity.buildFromMnemonic("...")
  // or we just use unsafe precalculated keys (just for demo purposes!):
  const attester = await Kilt.AttesterIdentity.buildFromMnemonic(
    'receive clutch item involve chaos clutch furnace arrest claw isolate okay together',
    {
      key: {
        publicKey: constants.PUBLIC_KEY.valueOf(),
        privateKey: constants.PRIVATE_KEY.valueOf(),
      },
    }
  )
  console.log('Attester balance is:', await getBalance(attester.getAddress()))
  // TODO: how to handle instantiation? We cannot always upload the accumulator...
  await attester.updateAccumulator(attester.getAccumulator())
  // for privacy enhanced attestations the attester has to initiate the attestation process

  // ------------------------- CType    ----------------------------------------
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
    owner: attester.getAddress(),
  }

  // Build the CType object
  const ctype = new Kilt.CType(rawCtype)

  // Store ctype on blockchain
  // ! This costs tokens !
  // Also note, that the completely same ctype can only be stored once on the blockchain.
  try {
    await ctype.store(attester)
  } catch (e) {
    console.log(
      'Error while storing CType. Probably either insufficient funds or ctype does already exist.',
      e
    )
  }

  // ------------------------- Claimer  ----------------------------------------
  // How to generate an Identity
  // const mnemonic = Kilt.Identity.generateMnemonic()
  const claimer = await Kilt.Identity.buildFromMnemonic(
    'wish rather clinic rather connect culture frown like quote effort cart faculty'
  )
  // const address = claimer.getAddress()

  // At this point the generated Identity has no tokens.
  // If you want to interact with the blockchain, you will have to get some.
  // Contact faucet@kilt.io and provide the address of the identity

  const rawClaim = {
    name: 'Alice',
    age: 29,
  }

  const claim = new Kilt.Claim({
    cTypeHash: ctypeHash,
    contents: rawClaim,
    owner: claimer.getAddress(),
  })

  console.log(
    (s => s.padEnd(40 + s.length / 2, '_').padStart(80, '_'))(' SETUP ')
  )
  console.log('Claimer', claimer.getAddress(), '\n')
  console.log('Attester', attester.getAddress(), '\n')
  console.log('Ctype', ctype, '\n')
  console.log('Claim', claim, '\n')

  return {
    claimer,
    attester,
    ctype,
    claim,
  }
}

async function doAttestation(
  claimer: Identity,
  attester: AttesterIdentity,
  claim: Claim
): Promise<{
  credential: Credential
  revocationHandle: IRevocationHandle
}> {
  // ------------------------- Attester ----------------------------------------

  const {
    message: initiateAttestationMessage,
    session: attestersSession,
  } = await Kilt.Attester.initiateAttestation(attester)

  // ------------------------- CLAIMER -----------------------------------------
  // And we need to build a request for an attestation

  const {
    message: messageBody,
    session: claimerSession,
  } = await Kilt.Claimer.requestAttestation({
    claim,
    identity: claimer,
    initiateAttestationMsg: initiateAttestationMessage,
    attesterPubKey: attester.getPublicIdentity(),
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
    revocationHandle,
    message: submitAttestation,
  } = await Kilt.Attester.issueAttestation(
    attester,
    decrypted.body,
    attestersSession
  )
  console.log(
    'revocationHandle should be stored for revocation: ',
    revocationHandle
  )

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
  const credential = await Kilt.Claimer.buildCredential(
    claimer,
    messageBack.body,
    claimerSession
  )

  console.log(
    (s => s.padEnd(40 + s.length / 2, '_').padStart(80, '_'))(' ATTESTATION ')
  )
  console.log('RFO Message', message, '\n')
  console.log('Submit attestation:', submitAttestation, '\n')
  console.log('AttestedClaim', credential, '\n')
  console.log('AttestedClaim message', messageBack, '\n')

  return {
    credential,
    revocationHandle,
  }
}

async function doVerification(
  claimer: Identity,
  attester: AttesterIdentity,
  credential: Credential,
  pe: boolean
): Promise<void> {
  const attesterPub = attester.getPublicIdentity()
  // ------------------------- Verifier ----------------------------------------
  const [session, request] = await Kilt.Verifier.newRequest()
    .requestPresentationForCtype({
      ctypeHash: credential.attestation.cTypeHash,
      reqUpdatedAfter: new Date(), // request accumulator newer than NOW or the latest available
      attributes: ['age'],
    })
    .finalize(pe)

  // ------------------------- Claimer -----------------------------------------
  // use createPresentation if you don't want to use the privacy enhanced method
  const presentation = await Kilt.Claimer.createPresentation(
    claimer,
    request,
    [credential],
    [attesterPub],
    pe
  )

  // ------------------------- Verifier ----------------------------------------
  // TODO: where das the verifier get the public identity from?
  const [verified, claims] = await Kilt.Verifier.verifyPresentation(
    presentation,
    session,
    [await Kilt.Attester.getLatestAccumulator(attesterPub)],
    [attesterPub]
  )
  console.log(
    (s => s.padEnd(40 + s.length / 2, '_').padStart(80, '_'))(' VERIFICATION ')
  )
  console.log('Received claims: ', JSON.stringify(claims))
  console.log('All valid? ', verified)
}

// do an attestation and a verification
async function example(): Promise<void> {
  const { claimer, attester, claim } = await setup()

  const { credential, revocationHandle } = await doAttestation(
    claimer,
    attester,
    claim
  )
  // should succeed
  await doVerification(claimer, attester, credential, true)
  await doVerification(claimer, attester, credential, false)
  await Kilt.Attester.revokeAttestation(attester, revocationHandle)
  // should fail
  await doVerification(claimer, attester, credential, true)
  await doVerification(claimer, attester, credential, false)
}

// connect to the blockchain, execute the examples and then disconnect
Kilt.connect(NODE_URL)
  .then(example)
  .finally(() => Kilt.disconnect(NODE_URL))
  .then(
    () => process.exit(),
    e => {
      console.log('Error Error Error!', e)
      process.exit(1)
    }
  )
