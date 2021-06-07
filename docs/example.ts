/* eslint-disable no-console */
import Kilt from '@kiltprotocol/sdk-js'
import type {
  AttestedClaim,
  Actors,
  Claim,
  CType,
  ICType,
  Identity,
} from '@kiltprotocol/sdk-js'

const NODE_URL = 'ws://127.0.0.1:9944'
const SEP = '_'

async function setup(): Promise<{
  claimer: Identity
  attester: Identity
  claim: Claim
  ctype: CType
}> {
  console.log(
    ((s) => s.padEnd(40 + s.length / 2, SEP).padStart(80, SEP))(' SETUP ')
  )
  await Kilt.init({ address: NODE_URL })

  // ------------------------- Attester ----------------------------------------

  // To get an attestation, we need an Attester
  // we can generate a new keypair:
  // const attester = await Kilt.AttesterIdentity.buildFromMnemonic("...")
  // or we just use unsafe precalculated keys (just for demo purposes!):
  const attester = Kilt.Identity.buildFromMnemonic(
    'receive clutch item involve chaos clutch furnace arrest claw isolate okay together',
    // using ed25519 bc this identity has test coins from the start on the development chain spec
    { signingKeyPairType: 'ed25519' }
  )
  console.log(
    'Attester free balance is:',
    (await Kilt.Balance.getBalances(attester.address)).free.toString()
  )

  // ------------------------- CType    ----------------------------------------
  // First build a schema
  const ctypeSchema: ICType['schema'] = {
    $id:
      'kilt:ctype:0x3b53bd9a535164136d2df46d0b7146b17b9821490bc46d4dfac7e06811631803',
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
    title: 'title',
  }
  // Generate the Hash for it
  const ctypeHash = Kilt.CTypeUtils.getHashForSchema(ctypeSchema)

  // Put everything together
  const rawCtype: ICType = {
    schema: ctypeSchema,
    hash: ctypeHash,
    owner: attester.address,
  }

  // Build the CType object
  const ctype = new Kilt.CType(rawCtype)

  // Store ctype on blockchain
  // signAndSubmitTx can be passed SubscriptionPromise.Options, to control resolve and reject criteria, set tip value, or activate re-sign-re-send capabilities.
  // ! This costs tokens !
  // Also note, that the completely same ctype can only be stored once on the blockchain.
  try {
    await ctype
      .store()
      .then((tx) => Kilt.BlockchainUtils.signAndSubmitTx(tx, attester))
  } catch (e) {
    console.log(
      'Error while storing CType. Probably either insufficient funds or ctype does already exist.',
      e
    )
  }

  // ------------------------- Claimer  ----------------------------------------
  // How to generate an Identity
  // const mnemonic = Kilt.Identity.generateMnemonic()
  const claimer = Kilt.Identity.buildFromMnemonic(
    'wish rather clinic rather connect culture frown like quote effort cart faculty'
  )
  // const address = claimer.address

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
    owner: claimer.address,
  })

  console.log('Claimer', claimer.address, '\n')
  console.log('Attester', attester.address, '\n')
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
  attester: Identity,
  claim: Claim
): Promise<{
  credential: AttestedClaim
  revocationHandle: Actors.types.IRevocationHandle
}> {
  console.log(
    ((s) => s.padEnd(40 + s.length / 2, SEP).padStart(80, SEP))(' ATTESTATION ')
  )
  // ------------------------- Attester ----------------------------------------

  // const {
  //   message: initiateAttestationMessage,
  //   session: attestersSession,
  // } = await Attester.initiateAttestation(attester, claimer.getPublicIdentity())

  // ------------------------- CLAIMER -----------------------------------------
  // And we need to build a request for an attestation

  const {
    message: reqAttestation,
    session: claimerSession,
  } = Kilt.Actors.Claimer.requestAttestation(
    claim,
    claimer,
    attester.getPublicIdentity()
    // {
    //   initiateAttestationMsg: initiateAttestationMessage,
    // }
  )

  // The message can be encrypted as follows
  const reqAttestationEnc = reqAttestation.encrypt(
    claimer,
    attester.getPublicIdentity()
  )

  // claimer sends [[encrypted]] to the attester

  // ------------------------- Attester ----------------------------------------
  // Check the validity of the message
  Kilt.Message.ensureHashAndSignature(reqAttestationEnc, claimer.address)
  // When the Attester receives the message, she can decrypt it
  const reqAttestationDec = Kilt.Message.decrypt(reqAttestationEnc, attester)

  // And make sure, that the sender is the owner of the identity
  Kilt.Message.ensureOwnerIsSender(reqAttestationDec)

  const {
    revocationHandle,
    message: submitAttestation,
  } = await Kilt.Actors.Attester.issueAttestation(
    attester,
    reqAttestationDec,
    claimer.getPublicIdentity()
    // attestersSession
  )
  console.log(
    'revocationHandle should be stored for revocation: ',
    revocationHandle
  )

  // And send a message back
  const submitAttestationEnc = submitAttestation.encrypt(
    attester,
    claimer.getPublicIdentity()
  )

  // ------------------------- CLAIMER -----------------------------------------
  Kilt.Message.ensureHashAndSignature(submitAttestationEnc, attester.address)
  const submitAttestationDec = Kilt.Message.decrypt(
    submitAttestationEnc,
    claimer
  )

  const credential = Kilt.Actors.Claimer.buildCredential(
    submitAttestationDec,
    claimerSession
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
  credential: AttestedClaim
): Promise<void> {
  console.log(
    ((s) => s.padEnd(40 + s.length / 2, SEP).padStart(80, SEP))(
      ' VERIFICATION '
    )
  )
  const verifierMnemonic = Kilt.Identity.generateMnemonic()
  const verifier = Kilt.Identity.buildFromMnemonic(verifierMnemonic)
  // ------------------------- Verifier ----------------------------------------
  const { session, message: request } = Kilt.Actors.Verifier.newRequestBuilder()
    .requestPresentationForCtype({
      ctypeHash: credential.attestation.cTypeHash,
      requestUpdatedAfter: new Date(),
      properties: ['age'],
    })
    .finalize(verifier, claimer.getPublicIdentity())

  // ------------------------- Claimer -----------------------------------------
  const presentation = Kilt.Actors.Claimer.createPresentation(
    claimer,
    request,
    verifier.getPublicIdentity(),
    [credential]
  )

  // ------------------------- Verifier ----------------------------------------
  // The verifier needs the public identity of the attester. Either he already has a list of trusted
  // attesters or he needs to resolve them differently. A Decentralized Identity (DID) would be an
  // option for that.
  const { verified, claims } = await Kilt.Actors.Verifier.verifyPresentation(
    presentation,
    session
  )
  console.log('Received claims: ', JSON.stringify(claims))
  console.log('All valid? ', verified)
}

// do an attestation and a verification
async function example(): Promise<boolean> {
  const { claimer, attester, claim } = await setup()

  const { credential, revocationHandle } = await doAttestation(
    claimer,
    attester,
    claim
  )
  // should succeed
  await doVerification(claimer, credential)
  await doVerification(claimer, credential)

  // revoke
  await Kilt.Actors.Attester.revokeAttestation(attester, revocationHandle)

  // should fail
  await doVerification(claimer, credential)
  await doVerification(claimer, credential)

  return true
}

// connect to the blockchain, execute the examples and then disconnect
;(async () => {
  const done = await example()
  if (!done) {
    throw new Error('Example did not finish')
  }
})()
  .catch((e) => {
    console.error('Error Error Error!\n')
    setTimeout(() => {
      throw e
    }, 1)
  })
  .finally(() => Kilt.disconnect())
