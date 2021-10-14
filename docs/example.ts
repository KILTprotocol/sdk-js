/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-console */
import Kilt, {
  IAcceptClaimsForCTypes,
  IRequestAttestationForClaim,
  ISubmitAttestationForClaim,
  ISubmitClaimsForCTypes,
  KeyRelationship,
} from '@kiltprotocol/sdk-js'
import type {
  AttestedClaim,
  Claim,
  CType,
  ICType,
  Did,
} from '@kiltprotocol/sdk-js'
import { KeyringPair } from '@polkadot/keyring/types'

const NODE_URL = 'ws://127.0.0.1:9944'
const SEP = '_'

async function setup(): Promise<{
  claimerLightDid: Did.LightDidDetails
  attesterOnChainDid: Did.FullDidDetails
  attester: KeyringPair
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
  const keyring = new Kilt.Utils.Keyring.Keyring({
    // KILT has registered the ss58 prefix 38
    ss58Format: 38,
    type: 'ed25519',
  })
  // generate a Mnemonic for the attester
  // const generateAttesterMnemonic = Kilt.Utils.UUID.generate()
  const attesterMnemonic =
    'receive clutch item involve chaos clutch furnace arrest claw isolate okay together'
  // or we just use unsafe precalculated keys (just for demo purposes!):
  const attester = keyring.addFromMnemonic(
    attesterMnemonic,
    // using ed25519 bc this identity has test coins from the start on the development chain spec
    { signingKeyPairType: 'ed25519' }
  )
  console.log(
    'Attester free balance is:',
    (await Kilt.Balance.getBalances(attester.address)).free.toString()
  )

  // Build an on chain DID for the attester to make transactions on the KILT chain, using our demo keystore
  const keystore = new Kilt.Did.DemoKeystore()
  const attesterOnChainDid = await Kilt.Did.createOnChainDidFromSeed(
    attester,
    keystore,
    attesterMnemonic,
    // using ed25519 as key type because this is how the endowed identity is set up
    Kilt.Did.SigningAlgorithms.Ed25519
  )

  // Will print `did:kilt:014sxSYXakw1ZXBymzT9t3Yw91mUaqKST5bFUEjGEpvkTuckar`.
  console.log(attesterOnChainDid.did)

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
      .then((tx) =>
        attesterOnChainDid.authorizeExtrinsic(tx, keystore, attester.address)
      )
      .then((tx) => Kilt.BlockchainUtils.signAndSubmitTx(tx, attester))
  } catch (e) {
    console.log(
      'Error while storing CType. Probably either insufficient funds or ctype does already exist.',
      e
    )
  }

  // ------------------------- Claimer  ----------------------------------------
  // How to generate an Identity
  // const mnemonic = Kilt.Utils.UUID.generate()
  const claimerMnemonic =
    'wish rather clinic rather connect culture frown like quote effort cart faculty'

  // Create a light DID from the generated authentication key.
  const claimerLightDid = await Kilt.Did.createLightDidFromSeed(
    keystore,
    claimerMnemonic
  )

  // const did = claimer.did

  // At this point the generated Identity has no tokens.
  // If you want to interact with the blockchain, you will have to get some.
  // Contact faucet@kilt.io and provide the address of the identity
  // All tokens generated are play tokens and hold no value

  const rawClaim = {
    name: 'Alice',
    age: 29,
  }

  const claim = Kilt.Claim.fromCTypeAndClaimContents(
    ctype,
    rawClaim,
    claimerLightDid.did
  )

  console.log('Claimer', claimerLightDid.did, '\n')
  console.log('Attester', attesterOnChainDid.did, '\n')
  console.log('Ctype', ctype, '\n')
  console.log('Claim', claim, '\n')

  return {
    claimerLightDid,
    attesterOnChainDid,
    attester,
    ctype,
    claim,
  }
}

async function doAttestation(
  claimerLightDid: Did.LightDidDetails,
  attesterOnChainDid: Did.FullDidDetails,
  attester: KeyringPair,
  claim: Claim
): Promise<{
  credential: AttestedClaim
}> {
  console.log(
    ((s) => s.padEnd(40 + s.length / 2, SEP).padStart(80, SEP))(' ATTESTATION ')
  )
  // Initialize the demo keystore
  const keystore = new Kilt.Did.DemoKeystore()

  // ------------------------- CLAIMER -----------------------------------------
  // And we need to build a request for an attestation

  const requestForAttestation = Kilt.RequestForAttestation.fromClaim(claim)
  await requestForAttestation.signWithDid(keystore, claimerLightDid)
  // The claimer can send a message to the attester requesting to do the attestation
  const claimerRequestMessage = new Kilt.Message(
    {
      type: Kilt.Message.BodyType.REQUEST_ATTESTATION_FOR_CLAIM,
      content: { requestForAttestation },
    },
    claimerLightDid.did,
    attesterOnChainDid.did
  )

  // The message can be encrypted as follows
  const encryptMessage = await claimerRequestMessage.encrypt(
    claimerLightDid.getKey(KeyRelationship.keyAgreement)[0],
    attesterOnChainDid.getKey(KeyRelationship.keyAgreement)[0],
    keystore
  )

  // claimer sends [[encrypted]] to the attester

  // ------------------------- Attester ----------------------------------------
  // When the Attester receives the message, she can decrypt it,
  // internally checks the sender is the owner of the identity
  // and checks the hash and signature of the message
  const reqAttestationDec = await Kilt.Message.decrypt(
    encryptMessage,
    keystore,
    {
      resolver: attesterOnChainDid.getKey(KeyRelationship.keyAgreement)[0],
    }
  )

  const claimersRequest = Kilt.RequestForAttestation.fromRequest(
    (reqAttestationDec.body as IRequestAttestationForClaim).content
      .requestForAttestation
  )
  // Attester can check the data and verify the data has not been tampered with
  if (!claimersRequest.verifyData()) {
    console.log('data is false')
  }

  // Attester can check if the signature of the claimer matches the request for attestation object
  claimersRequest.verifySignature({
    resolver: claimerLightDid.getKey(KeyRelationship.keyAgreement)[0],
  })

  const attestation = Kilt.Attestation.fromRequestAndDid(
    claimersRequest,
    attesterOnChainDid.did
  )
  console.log('the attestation: ', attestation)
  await attestation
    .store()
    .then((tx) =>
      attesterOnChainDid.authorizeExtrinsic(tx, keystore, attester.address)
    )
    .then((tx) =>
      Kilt.BlockchainUtils.signAndSubmitTx(tx, attester, {
        resolveOn: Kilt.BlockchainUtils.IS_IN_BLOCK,
        reSign: true,
      })
    )
  // And send a message back
  const attesterAttestationMessage = new Kilt.Message(
    {
      type: Kilt.Message.BodyType.SUBMIT_ATTESTATION_FOR_CLAIM,
      content: { attestation },
    },
    attesterOnChainDid.did,
    claimerLightDid.did
  )

  const submitAttestationEnc = await attesterAttestationMessage.encrypt(
    attesterOnChainDid.getKey(KeyRelationship.keyAgreement)[0],
    claimerLightDid.getKey(KeyRelationship.keyAgreement)[0],
    keystore
  )

  // ------------------------- CLAIMER -----------------------------------------
  // internally, the decrypt checks the sender is the owner of the identity
  // and checks the hash and signature of the message
  const submitAttestationDec = await Kilt.Message.decrypt(
    submitAttestationEnc,
    keystore,
    {
      resolver: claimerLightDid.getKey(KeyRelationship.keyAgreement)[0],
    }
  )

  const credential = Kilt.AttestedClaim.fromRequestAndAttestation(
    // The claimer has access to the request for attestation
    requestForAttestation,
    (submitAttestationDec.body as ISubmitAttestationForClaim).content
      .attestation
  )

  console.log('RFA Message', reqAttestationDec.body, '\n')
  console.log('Submit attestation:', submitAttestationDec.body, '\n')
  console.log('AttestedClaim', credential, '\n')

  return {
    credential,
  }
}

async function doVerification(
  claimerLightDid: Did.LightDidDetails,
  credential: AttestedClaim
): Promise<void> {
  console.log(
    ((s) => s.padEnd(40 + s.length / 2, SEP).padStart(80, SEP))(
      ' VERIFICATION '
    )
  )
  const keyring = new Kilt.Utils.Keyring.Keyring({
    // KILT has registered the ss58 prefix 38
    ss58Format: 38,
    type: 'ed25519',
  })
  const keystore = new Kilt.Did.DemoKeystore()
  const verifierMnemonic = Kilt.Utils.UUID.generate()
  const verifier = keyring.addFromMnemonic(verifierMnemonic)
  // The verifier address
  console.log(verifier.address)
  const verifierLightDid = await Kilt.Did.createLightDidFromSeed(
    keystore,
    verifierMnemonic
  )
  // ------------------------- Verifier ----------------------------------------
  const verifierAcceptedClaimsMessage = new Kilt.Message(
    {
      type: Kilt.Message.BodyType.ACCEPT_CLAIMS_FOR_CTYPES,
      content: [credential.request.claim.cTypeHash],
    },
    verifierLightDid.did,
    claimerLightDid.did
  )

  const verifierAcceptedClaimsMessageEnc = await verifierAcceptedClaimsMessage.encrypt(
    verifierLightDid.getKey(KeyRelationship.keyAgreement[0]),
    claimerLightDid.getKey(KeyRelationship.keyAgreement[0]),
    keystore
  )

  // ------------------------- Claimer -----------------------------------------
  // The claimer receives a message from the verifier of the accepted ctypes
  const verifierAcceptedClaimsMessageDec = await Kilt.Message.decrypt(
    verifierAcceptedClaimsMessageEnc,
    keystore
  )

  const ctypeHash = (verifierAcceptedClaimsMessageDec.body as IAcceptClaimsForCTypes)
    .content[0]
  console.log('claimer checks the ctypeHash matches', ctypeHash)
  // The claimer can create a challenge for the verifier
  const challenge = Kilt.Utils.UUID.generate()

  const presentation = await credential.createPresentation({
    signer: keystore,
    claimerDid: claimerLightDid,
    challenge,
  })
  // Sending the presentation with challenge
  const claimerSubmitClaimsMessage = new Kilt.Message(
    {
      type: Kilt.Message.BodyType.SUBMIT_CLAIMS_FOR_CTYPES,
      content: [presentation],
    },
    claimerLightDid.did,
    verifierLightDid.did
  )
  // Claimer encrypts the claims message to the verifier
  const claimerSubmitClaimsMessageEnc = await claimerSubmitClaimsMessage.encrypt(
    claimerLightDid.getKey(KeyRelationship.keyAgreement[0]),
    verifierLightDid.getKey(KeyRelationship.keyAgreement[0]),
    keystore
  )

  // ------------------------- Verifier ----------------------------------------
  // The verifier needs the public identity of the attester. Either he already has a list of trusted
  // attesters or he needs to resolve them differently. A Decentralized Identity (DID) would be an
  // option for that.

  const verifierSubmitClaimsMessageDec = await Kilt.Message.decrypt(
    claimerSubmitClaimsMessageEnc,
    keystore
  )
  const presentationMessage = (verifierSubmitClaimsMessageDec.body as ISubmitClaimsForCTypes)
    .content
  const verifierablePresentation = Kilt.AttestedClaim.fromAttestedClaim(
    presentationMessage[0]
  )
  const verified = verifierablePresentation.verify({ challenge })

  console.log('Received claims: ', JSON.stringify(presentationMessage))
  console.log('All valid? ', verified)
}

// do an attestation and a verification
async function example(): Promise<boolean> {
  const { claimerLightDid, attesterOnChainDid, claim, attester } = await setup()

  const { credential } = await doAttestation(
    claimerLightDid,
    attesterOnChainDid,
    attester,
    claim
  )
  // should succeed
  await doVerification(claimerLightDid, credential)
  await doVerification(claimerLightDid, credential)

  // revoke
  await Kilt.Attestation.revoke(credential.getHash(), 0)

  // should fail
  await doVerification(claimerLightDid, credential)
  await doVerification(claimerLightDid, credential)

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
