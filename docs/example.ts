/* eslint-disable no-console */
import Kilt, {
  ICType,
  CTypeUtils,
  Identity,
  Claim,
  AttesterIdentity,
  Credential,
  CType,
} from '../src'
import constants from '../src/test/constants'
import { IRevocationHandle } from '../src/types/Attestation'
import { getBalance } from '../src/balance/Balance.chain'
import PublicAttesterIdentity from '../src/attesteridentity/PublicAttesterIdentity'

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
  } = await Kilt.Attester.initiateAttestation(
    attester,
    claimer.getPublicIdentity()
  )

  // ------------------------- CLAIMER -----------------------------------------
  // And we need to build a request for an attestation

  const {
    message: reqAttestation,
    session: claimerSession,
  } = await Kilt.Claimer.requestAttestation({
    claim,
    identity: claimer,
    initiateAttestationMsg: initiateAttestationMessage,
    attesterPubKey: attester.getPublicIdentity(),
  })

  // The message can be encrypted as follows
  const reqAttestationEnc = reqAttestation.getEncryptedMessage()

  // claimer sends [[encrypted]] to the attester

  // ------------------------- Attester ----------------------------------------
  // Check the validity of the message
  Kilt.Message.ensureHashAndSignature(reqAttestationEnc, claimer.getAddress())
  // When the Attester receives the message, she can decrypt it
  const reqAttestationDec = Kilt.Message.createFromEncryptedMessage(
    reqAttestationEnc,
    attester
  )

  // And make sure, that the sender is the owner of the identity
  Kilt.Message.ensureOwnerIsSender(reqAttestationDec)

  const {
    revocationHandle,
    message: submitAttestation,
  } = await Kilt.Attester.issueAttestation(
    attester,
    reqAttestationDec,
    claimer.getPublicIdentity(),
    attestersSession
  )
  console.log(
    'revocationHandle should be stored for revocation: ',
    revocationHandle
  )

  // And send a message back
  const submitAttestationEnc = submitAttestation.getEncryptedMessage()

  // ------------------------- CLAIMER -----------------------------------------
  Kilt.Message.ensureHashAndSignature(
    submitAttestationEnc,
    attester.getAddress()
  )
  const submitAttestationDec = Kilt.Message.createFromEncryptedMessage(
    submitAttestationEnc,
    claimer
  )

  const credential = await Kilt.Claimer.buildCredential(
    claimer,
    submitAttestationDec,
    claimerSession
  )

  console.log(
    (s => s.padEnd(40 + s.length / 2, '_').padStart(80, '_'))(' ATTESTATION ')
  )
  console.log('RFO Message', reqAttestation.body, '\n')
  console.log('Submit attestation:', submitAttestation.body, '\n')
  console.log('AttestedClaim', credential, '\n')

  return {
    credential,
    revocationHandle,
  }
}

async function doVerification(
  claimer: Identity,
  attesterPub: PublicAttesterIdentity,
  credential: Credential,
  privacyEnhanced: boolean
): Promise<void> {
  const verifier = await Kilt.Identity.buildFromMnemonic()
  // ------------------------- Verifier ----------------------------------------
  const { session, message: request } = await Kilt.Verifier.newRequestBuilder()
    .requestPresentationForCtype({
      ctypeHash: credential.attestation.cTypeHash,
      requestUpdatedAfter: new Date(), // request accumulator newer than NOW or the latest available
      properties: ['age'],
    })
    .finalize(privacyEnhanced, verifier, claimer.getPublicIdentity())

  // ------------------------- Claimer -----------------------------------------
  const presentation = await Kilt.Claimer.createPresentation(
    claimer,
    request,
    verifier.getPublicIdentity(),
    [credential],
    [attesterPub],
    privacyEnhanced
  )

  // ------------------------- Verifier ----------------------------------------
  // The verifier needs the public identity of the attester. Either he already has a list of trusted
  // attesters or he needs to resolve them differently. A Decentralized Identity (DID) would be an
  // option for that.
  const { verified, claims } = await Kilt.Verifier.verifyPresentation(
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
  await doVerification(claimer, attester.getPublicIdentity(), credential, true)
  await doVerification(claimer, attester.getPublicIdentity(), credential, false)
  await Kilt.Attester.revokeAttestation(attester, revocationHandle)
  // should fail
  await doVerification(claimer, attester.getPublicIdentity(), credential, true)
  await doVerification(claimer, attester.getPublicIdentity(), credential, false)
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
