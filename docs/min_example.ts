/* eslint-disable no-console */
import Kilt, {
  ICType,
  CTypeUtils,
  Identity,
  Claim,
  AttesterIdentity,
  Credential,
  CType,
  PublicAttesterIdentity,
  IRevocationHandle,
} from '../src'
import constants from '../src/test/constants'

const NODE_URL = 'ws://127.0.0.1:9944'

async function setup(): Promise<{
  claimer: Identity
  attester: AttesterIdentity
  claim: Claim
  ctype: CType
}> {
  console.log(
    (s => s.padEnd(40 + s.length / 2, '_').padStart(80, '_'))(' SETUP ')
  )
  // ------------------------- Attester ----------------------------------------
  const attester = await Kilt.AttesterIdentity.buildFromMnemonic(
    'receive clutch item involve chaos clutch furnace arrest claw isolate okay together',
    {
      key: {
        publicKey: constants.PUBLIC_KEY.valueOf(),
        privateKey: constants.PRIVATE_KEY.valueOf(),
      },
    }
  )
  await attester.updateAccumulator(attester.getAccumulator())

  // ------------------------- CType    ----------------------------------------
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
      'Ctype not stored. Probably either insufficient funds or ctype does already exist.'
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

  console.log('Claimer:', claimer.getAddress(), '\n')
  console.log('Attester:', attester.getAddress(), '\n')
  console.log('Ctype:', ctype, '\n')
  console.log('Claim:', claim, '\n')

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
  console.log(
    (s => s.padEnd(40 + s.length / 2, '_').padStart(80, '_'))(' ATTESTATION ')
  )
  // ------------------------- Attester ----------------------------------------

  const {
    message: initiateAttestationMessage,
    session: attestersSession,
  } = await Kilt.Attester.initiateAttestation(
    attester,
    claimer.getPublicIdentity()
  )

  // ------------------------- CLAIMER -----------------------------------------
  const {
    message: reqAttestation,
    session: claimerSession,
  } = await Kilt.Claimer.requestAttestation(
    claim,
    claimer,
    attester.getPublicIdentity(),
    {
      initiateAttestationMsg: initiateAttestationMessage,
    }
  )

  // ------------------------- Attester ----------------------------------------

  const {
    revocationHandle,
    message: submitAttestation,
  } = await Kilt.Attester.issueAttestation(
    attester,
    reqAttestation,
    claimer.getPublicIdentity(),
    attestersSession
  )

  // ------------------------- CLAIMER -----------------------------------------
  const credential = await Kilt.Claimer.buildCredential(
    claimer,
    submitAttestation,
    claimerSession
  )

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
  console.log(
    (s => s.padEnd(40 + s.length / 2, '_').padStart(80, '_'))(' VERIFICATION ')
  )
  const verifier = await Kilt.Identity.buildFromMnemonic()
  // ------------------------- Verifier ----------------------------------------
  const { session, message: request } = await Kilt.Verifier.newRequestBuilder()
    .requestPresentationForCtype({
      ctypeHash: credential.attestation.cTypeHash,
      requestUpdatedAfter: new Date(), // request accumulator newer than NOW or the latest available
      properties: ['name'],
    })
    .finalize(privacyEnhanced, verifier, claimer.getPublicIdentity())
  console.log('Request Attributes: ', request.body.content, '\n')

  // ------------------------- CLAIMER -----------------------------------------
  const presentation = await Kilt.Claimer.createPresentation(
    claimer,
    request,
    verifier.getPublicIdentity(),
    [credential],
    [attesterPub],
    privacyEnhanced
  )
  console.log(
    'Presentation: ',
    JSON.parse(presentation.body.content.valueOf() as any).prooflist[0],
    '\n'
  )

  // ------------------------- Verifier ----------------------------------------
  const { verified, claims } = await Kilt.Verifier.verifyPresentation(
    presentation,
    session,
    [await Kilt.Attester.getLatestAccumulator(attesterPub)],
    [attesterPub]
  )

  console.log('Received claims: ', JSON.stringify(claims), '\n')
  console.log('All valid? ', verified, '\n')
}

// do an attestation and a verification
async function example(): Promise<void> {
  const { claimer, attester, claim } = await setup()

  const { credential } = await doAttestation(claimer, attester, claim)
  // should succeed
  await doVerification(claimer, attester.getPublicIdentity(), credential, true)
  await doVerification(claimer, attester.getPublicIdentity(), credential, true)

  // await doVerification(claimer, attester.getPublicIdentity(), credential, false)
  // await Kilt.Attester.revokeAttestation(attester, revocationHandle)
  // // should fail
  // await doVerification(claimer, attester.getPublicIdentity(), credential, true)
  // await doVerification(claimer, attester.getPublicIdentity(), credential, false)
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
