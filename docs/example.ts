/* eslint-disable no-console */
import Kilt, {
  ICType,
  CTypeUtils,
  IRequestAttestationForClaim,
  MessageBodyType,
  ISubmitAttestationForClaim,
  AttestedClaim,
  Identity,
  Claim,
  Accumulator,
  CombinedPresentation,
} from '../src'

const privKey =
  '{"XMLName":{"Space":"","Local":""},"Counter":0,"ExpiryDate":1610554062,"P":"iDYKxuFGt1Xv1aqMLaagjrOPX0hjkOlFrKOp4NPnSBHmQ9SFETUX1M43q3jLsGz+UEWFS3+SS9QpP4CTkl3p/w==","Q":"92MJOhwjESn7QohCCY1oBxsToAfccGoKtE3sBoaNxHWoowSiCy8fMG+B1sO5QU+bV3i1xwvVno9o30RcMoXEaw==","PPrime":"RBsFY3CjW6r36tVGFtNQR1nHr6QxyHSi1lHU8GnzpAjzIepCiJqL6mcb1bxl2DZ/KCLCpb/JJeoUn8BJyS70/w==","QPrime":"e7GEnQ4RiJT9oUQhBMa0A42J0APuODUFWib2A0NG4jrUUYJRBZePmDfA62HcoKfNq7xa44Xqz0e0b6IuGULiNQ==","ECDSA":"MHcCAQEEILO+g4uSDheZ6PSLxR7olFzUhZpeO9tQu84hX6UeIevaoAoGCCqGSM49AwEHoUQDQgAEKvmUz3HIZy890jE78CC9V9BuN8taO+L8GjAeS14v0CL7GCFZ1GMnaSZi4WG3mOjJlJ80CnMowIbUT3Fw1TluFw==","NonrevSk":null}'
const pubKey =
  '{"XMLName":{"Space":"","Local":""},"Counter":0,"ExpiryDate":1610554062,"N":"g6DWNN/cWep9/lCc6gg0tA8wS1y5LgQx2/fM/wMpYJE8MTZ9SJ3y9kjIBAeSb4aY3vsFhRp8aWsEZzAA0Qu0kW4bzyKN1RU7A0tlmkmDetCxu7Gy2zQMHlTg4YkAVxVYAIIIWhHKHrVLzH7zCsuXos1qm/sthByVdEXv4HPjCZU=","Z":"BiDMFSNGKLIcHJY3tmh2vgiW7D3f5g5b+6Bjf0ns3/rPOg8x0BJ+CzqOLQL+loNIomOzBm/Pk36q3pmPPFMfug80AwUlZOvKTrzj29Agq4DF7p4jruElRyZsdGNjlFkVzILFT/9yrXfjD/9DAHXGm6/4unVnwKP4I0j1r9sLYtg=","S":"Bxm9bNpNLZUM6gy74aR0HW2DadFuy/l+MOdZkG2BiFxbTEP24GXBYA3+d1xajplWEm2iLF4w2OeviIpr8VIzDNy6dXRyGcTnGzj6sVeGlR5u3N+8M2XNH1pNEymLQQbUAt3ogYSWiJW88bxHCf3AZiS91XT1Zh3ENCS9NsyGzt8=","G":"Angd7BuIjTeWGsVLGVCtv+5dx1TMEUr/Z5Fhk7OFUNBexY8fuNfzxfeclgSQpC+nyIAFHc3RB+3Fcs2vOSygopVfLEJo9h7dSjtlcxSZ1wE8YNgouHwfVuq4KWixzIk7Le+IeUzNaQNOL9SI3h5mlxJ5QOO2Src+BPQuFjXPSfI=","H":"U1MyQqwl1LrZY5G61Z2ZDM3zWQKv78HOluCrtxCDBsMvYNRLvhbppOhOdsnG3axN5NIH01/R6mlYojBDg9L7xSwR+1QpmHGUbwkemADlUZQ9c98Up1ORKxNW0asQJdPHV4NGqjQbDfJzejdGJwd95scmSpqLNvRTT+L0iW0ln4A=","T":"BEIUJ5pXzFZPeoB3us341EWxwE7HByM4NaPYRS6YVtDcJdz+H9EEKdUcXhUVrJAQ2OZy2FP0+SNvQVk8AxWDiD73tHUUKDnkMoKSkHPnEnsCInGHr4iTYE2zp8/uEBFxNppq5SP9gQOzE2qekGket2co0W/+jKNtg63u1udlZjo=","R":["OpuoX8xEvGaULH7ir3G/W9zBB1gmYN6lllJsk8+QGGQxydbrtoQiFfhU1Tyqm59sq3GIhksiYB6Th6jYq3BIFKVynX993FPYU2HS2dceFk5kvymIx33u2nTyMzFvox2b6IkKHKXfbtx/VWWlVYcywFOAOiQ1Xa7dXDx1ebuGowE=","Jamoy887kQjyTKjHwgFGxOKugcGIxdUhK9pE/nDTFttU6ndo5qm04AVB5n4WUaFurrKlNSIICheAXI10kIy37Ogr1N4Ge/7TbyZ/hXB8DBzoJbD3MVpXblq9hrhEkb+yyJ9uipnKckflQBWGzl+grXV17SWVhd5TKpUrMw1cDYs=","YGogpko2T4xWQjipZN691tpWJYffyX5evzh2EJAZSpP3evnMbro0Et5Bk+2NY9yt/GoJW8qkVkwEdaYU0jQiGS27F3aJ5e00VOCnZ6bIXJKgcTTxqc5c9NrpJVWNX9n5G590OVTNqlLUOFw3/mIY26A2MKxsa56j2K0V4IM0FI4=","Jca8++mT6d93MK0S8Fb6rtu7TpV9TGqM0mSvO0JKuyRvEro3anRbvZ8sHRLt2q2ePIyCQHz2eUc4iJ1vQLnzMxVavQ3xS5AAS27Tw+xM64JhWV6BFDqZgaEcu22jEi+Rrjjqss2nmC6CQYJZt5g5P0dXGV2JKDcrUaGCtzc4cNE=","ZIV6MWKglRL5B9vv5RmBigbieiuebmy/mcpycXlyQcoZEeNCzuGs/JgRnGr05umbcsQ5ZNSS3TKiL5CM/Z4fanuSu6jNnVoHvSkxI3x28ZpMV8C43CXkS6smmiZP+2SSL419Q247ZbP04T5wHcZ6GooCLxnfx5DeEtRze3UU1Wk=","IbwQtY9iF7C/rNKkTilHP5jEj9r3aI1tRVU9WeMzE9yxrE0mggzpcoCM0lJFLcqVyWhKD3PWssuXwNiLJipUL+sH/u8Qk8Bu6sv/USlUU7sgSJ4akl2Lp+5oYSkzHiZTeJtLg0OVGZnka3pGxzg0ihkkT6Bdk8K2OicTNxlHzgI=","ZQ9/qIgvOx/8dyXlAFeZH+2lriSPaj/NDzPCxR9sXqBYJskSkSrdGogxP2RZeAGyDh7NvwUtvBDQ/vLKz/O3ANPUOnaRx1n4uBF+uBdt0h3Ml/DckhL5k2+nHQsnZWPFxkdpatCIFWcvYuldx+gXLePBaRmNnKMoxAgT+tJnJcw=","ZGfBOqHujseUhLZdfs8kq+/kmG3yMwUAmQrGgTdNej8npNsOyD/Am/SoPdSjpr1enuMgBzva/bjn3/z8nncpia65+v9Pn5831UuFp8h53/1WaEHvN/yctnIKb8k1IRtPlSvnfq7qwC/sIGvHq+ZTj3/ie57rTSkSMrmdFL8PMM0=","TM38T4ekWiNWICCgry7GsppfVt2ImPv4SL//f/J3beP34K1afJCsHk50XJwi8qyMz8HqEVK2sWvMQzJ8Amct4sAfRYIZNmqH7mSR7LwIXvihwv1dUlJv2R7MLTjEGkEnJHE5cCR0K5GxjeQSSgNHAu33MOth3ipsK9ZmF+slSkI=","YwMb/IVn2NsA4y8ZiiBxCWoOg0tsqyYKTakxDZnRhw+wHwhnA3+T87X4tOSAx+dYlmtj3UQzUAeFRYztr2YTrF2boS/YFeAiVh6swPgFOScvmOuf5O4fJn7z+iXr+ivgFccswxBhxqa9MdF8ReqHaVouj8LLyk33fZgWduwfnA=="],"EpochLength":432000,"Params":{"LePrime":120,"Lh":256,"Lm":256,"Ln":1024,"Lstatzk":80,"Le":597,"LeCommit":456,"LmCommit":592,"LRA":1104,"LsCommit":593,"Lv":1700,"LvCommit":2036,"LvPrime":1104,"LvPrimeCommit":1440},"Issuer":"","ECDSA":"MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEKvmUz3HIZy890jE78CC9V9BuN8taO+L8GjAeS14v0CL7GCFZ1GMnaSZi4WG3mOjJlJ80CnMowIbUT3Fw1TluFw==","NonrevPk":null}'

async function doAttestation(): Promise<{
  claimer: Identity
  attester: Identity
  claim: Claim
  attestedClaim: AttestedClaim
  accumulator: Accumulator
}> {
  // How to generate an Identity
  // const mnemonic = Kilt.Identity.generateMnemonic()
  const claimer = await Kilt.Identity.buildFromMnemonic(
    'wish rather clinic rather connect culture frown like quote effort cart faculty'
  )
  // const address = claimer.address

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
    owner: claimer.address,
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
  // const mnemonicForAttester = Kilt.Identity.generateMnemonic()
  const attester = await Kilt.Identity.buildFromMnemonic(
    'feel hazard trip seven traffic make hero kingdom speed transfer rug success'
  )

  // wait ~15 minutes... :)
  // await attester.generateGabiKeys(365 * 24 * 60 * 60 * 1000, 70)
  // for speed and no security use those example keys
  attester.loadGabiKeys(pubKey, privKey)

  // for privacy enhanced attestations the attester has to initiate the attestation process
  const {
    message: initiateAttestationMessage,
    session: attestersSession,
  } = await attester.initiateAttestation()

  // ------------------------- CLAIMER -----------------------------------------
  // And we need to build a request for an attestation
  const rawClaim = {
    name: 'Alice',
    age: 29,
  }

  const claim = new Kilt.Claim({
    cTypeHash: ctypeHash,
    contents: rawClaim,
    owner: claimer.address,
  })

  const [
    requestForAttestation,
    claimerSession,
  ] = await Kilt.RequestForAttestation.fromClaimAndIdentity({
    claim,
    identity: claimer,
    initiateAttestationMsg: initiateAttestationMessage,
    attesterPubKey: attester.publicGabiKey,
  })

  // Excourse to the messaging system
  // If the Attester doesn't live on the same machine, we need to send her a message
  const messageBody: IRequestAttestationForClaim = {
    content: {
      requestForAttestation,
    },
    type: MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM,
  }
  const message = new Kilt.Message(messageBody, claimer, attester)
  // The message can be encrypted as follows
  const encrypted = message.getEncryptedMessage()

  // claimer sends [[encrypted]] to the attester

  // ------------------------- Attester ----------------------------------------
  // Check the validity of the message
  Kilt.Message.ensureHashAndSignature(encrypted, claimer.address)
  // When the Attester receives the message, she can decrypt it
  const decrypted = Kilt.Message.createFromEncryptedMessage(encrypted, attester)

  // And make sure, that the sender is the owner of the identity
  Kilt.Message.ensureOwnerIsSender(decrypted)

  // Lets continue with the original object
  const attestation = Kilt.Attestation.fromRequestAndPublicIdentity(
    requestForAttestation,
    attester
  )
  const [witness, attestationPE] = await attester.issueAttestationPE(
    attestersSession,
    requestForAttestation
  )
  console.log('Witness should be stored for revocation: ', witness.valueOf())

  // Store it on the blockchain
  // ! This costs tokens !
  // attestation.store(attester)
  await attestation.store(attester)

  // And send a message back
  const messageBodyBack: ISubmitAttestationForClaim = {
    content: {
      attestation,
      attestationPE,
    },
    type: MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM,
  }
  const messageBack = new Kilt.Message(messageBodyBack, attester, claimer)
  const encryptedBack = messageBack.getEncryptedMessage()

  // ------------------------- CLAIMER -----------------------------------------
  Kilt.Message.ensureHashAndSignature(encryptedBack, attester.address)
  // FIXME: Why no work! :_(
  // const decryptedBack = Kilt.Message.createFromEncryptedMessage(
  //   encrypted,
  //   claimer
  // )

  if (messageBack.body.type !== MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM) {
    throw new Error('Should be SUBMIT_ATTESTATION_FOR_CLAIM')
  }
  const { content } = messageBack.body
  const attestedClaim = await AttestedClaim.fromRequestAndAttestation(
    claimer,
    requestForAttestation,
    content.attestation,
    claimerSession,
    content.attestationPE
  )
  console.log('Claimer', claimer.address, '\n')
  console.log('Attester', attester.address, '\n')

  console.log('Ctype', ctype, '\n')
  console.log('Claim', claim, '\n')

  console.log('RequestForAttestation', requestForAttestation, '\n')
  console.log('RFO Message', message, '\n')

  console.log('Attestation', attestation, '\n')
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
  }
}

async function doVerification(
  claimer: Identity,
  attester: Identity,
  attestedClaim: AttestedClaim,
  accumulator: Accumulator
): Promise<void> {
  const attesterPubKey = attester.publicGabiKey
  if (typeof attesterPubKey === 'undefined') {
    throw new Error('Attester needs a key pair')
  }
  // ------------------------- Verifier ----------------------------------------
  const [session, request] = await Kilt.Verifier.newRequest()
    .requestPresentationForCtype({
      ctypeHash: attestedClaim.attestation.cTypeHash,
      attributes: ['age'],
    })
    .finalize(true)

  // ------------------------- Claimer -----------------------------------------
  const presentation = await claimer.submitPresentations(
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
    accumulator,
  } = await doAttestation()
  await doVerification(claimer, attester, attestedClaim, accumulator)
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
