/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-console */

import * as Kilt from '@kiltprotocol/sdk-js'
import { KeyRelationship, KeyringPair } from '@kiltprotocol/sdk-js'
import type {
  Credential,
  Claim,
  CType,
  ICType,
  Did,
  IAcceptCredential,
  IRequestAttestation,
  ISubmitAttestation,
  ISubmitCredential,
  IDidKeyDetails,
} from '@kiltprotocol/sdk-js'
import { mnemonicGenerate } from '@polkadot/util-crypto'

const NODE_URL = 'ws://127.0.0.1:9944'
const SEP = '_'

async function setup(): Promise<{
  claimerLightDid: Did.LightDidDetails
  attesterFullDid: Did.FullDidDetails
  attester: KeyringPair
  claim: Claim
  ctype: CType
  keystore: Did.DemoKeystore
}> {
  console.log(
    ((s) => s.padEnd(40 + s.length / 2, SEP).padStart(80, SEP))(' SETUP ')
  )
  await Kilt.init({ address: NODE_URL })

  // ------------------------- Attester ----------------------------------------

  // To get an attestation, we need an Attester
  // we can generate a new keypair:

  const keyring = new Kilt.Utils.Keyring({
    // KILT has registered the ss58 prefix 38
    ss58Format: 38,
    type: 'ed25519',
  })
  // generate a Mnemonic for the attester
  const attesterMnemonic =
    'receive clutch item involve chaos clutch furnace arrest claw isolate okay together'

  // or we just use unsafe precalculated keys (just for demo purposes!):
  const attester = keyring.addFromMnemonic(
    attesterMnemonic,
    // using ed25519 bc this account has test coins from the start on the development chain spec
    { signingKeyPairType: 'ed25519' }
  )
  console.log(
    'Attester free balance is:',
    (await Kilt.Balance.getBalances(attester.address)).free.toString()
  )

  // Build an on chain DID for the attester to make transactions on the KILT chain, using our demo keystore
  const keystore = new Kilt.Did.DemoKeystore()
  const attesterFullDid = await Kilt.Did.createOnChainDidFromSeed(
    attester,
    keystore,
    attesterMnemonic,
    // using ed25519 as key type because this is how the endowed account is set up
    Kilt.Did.SigningAlgorithms.Ed25519
  )

  // Will print `did:kilt:014sxSYXakw1ZXBymzT9t3Yw91mUaqKST5bFUEjGEpvkTuckar`.
  console.log(attesterFullDid.did)

  // ------------------------- CType    ----------------------------------------
  // First build a schema
  const ctypeSchema: ICType['schema'] = {
    $id: 'kilt:ctype:0x3b53bd9a535164136d2df46d0b7146b17b9821490bc46d4dfac7e06811631803',
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
    owner: attesterFullDid.did,
  }

  // Build the CType object
  const ctype = new Kilt.CType(rawCtype)
  // Store ctype on blockchain
  // signAndSubmitTx can be passed SubscriptionPromise.Options, to control resolve and reject criteria, set tip value, or activate re-sign-re-send capabilities.
  // ! This costs tokens !
  // Also note, that the same ctype can only be stored once on the blockchain.
  try {
    await ctype
      .getStoreTx()
      .then((tx) =>
        attesterFullDid.authorizeExtrinsic(tx, keystore, attester.address)
      )
      .then((tx) =>
        Kilt.BlockchainUtils.signAndSubmitTx(tx, attester, {
          resolveOn: Kilt.BlockchainUtils.IS_IN_BLOCK,
          reSign: true,
        })
      )
  } catch (e) {
    console.log(
      'Error while storing CType. Probably either insufficient funds or ctype does already exist.',
      e
    )
  }

  // ------------------------- Claimer  ----------------------------------------
  // How to generate an account and subsequently a derived DID from the account.
  const claimerMnemonic =
    'wish rather clinic rather connect culture frown like quote effort cart faculty'

  // Generate authentication and encryption keys used to derive a light DID from them.
  const claimerSigningKeypair = await keystore.generateKeypair({
    alg: Kilt.Did.SigningAlgorithms.Ed25519,
    seed: claimerMnemonic,
  })
  const claimerEncryptionKeypair = await keystore.generateKeypair({
    alg: Kilt.Did.EncryptionAlgorithms.NaclBox,
    seed: claimerMnemonic,
  })
  // Using the generated authentication and encryption keys to derive a light DID.
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

  // At this point the generated account has no tokens.
  // If you want to interact with the blockchain, you will have to get some.
  // Contact faucet@kilt.io and provide the address of the account
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
  console.log('Attester', attesterFullDid.did, '\n')
  console.log('Ctype', ctype, '\n')
  console.log('Claim', claim, '\n')

  return {
    claimerLightDid,
    attesterFullDid,
    attester,
    ctype,
    claim,
    keystore,
  }
}

async function doAttestation(
  claimerLightDid: Did.LightDidDetails,
  attesterFullDid: Did.FullDidDetails,
  attester: KeyringPair,
  claim: Claim,
  keystore: Did.DemoKeystore
): Promise<{
  credential: Credential
}> {
  console.log(
    ((s) => s.padEnd(40 + s.length / 2, SEP).padStart(80, SEP))(' ATTESTATION ')
  )

  // ------------------------- CLAIMER -----------------------------------------
  // And we need to build a request for an attestation

  const requestForAttestation = Kilt.RequestForAttestation.fromClaim(claim)
  await requestForAttestation.signWithDid(keystore, claimerLightDid)
  // The claimer can send a message to the attester requesting to do the attestation
  const claimerRequestMessage = new Kilt.Message(
    {
      type: Kilt.Message.BodyType.REQUEST_ATTESTATION,
      content: { requestForAttestation },
    },
    claimerLightDid.did,
    attesterFullDid.did
  )

  const claimerEncryptionKey = claimerLightDid.getKeys(
    KeyRelationship.keyAgreement
  )[0] as IDidKeyDetails<string>
  const attesterEncryptionKey = attesterFullDid.getKeys(
    KeyRelationship.keyAgreement
  )[0] as IDidKeyDetails<string>

  // The message can be encrypted as follows
  const encryptMessage = await claimerRequestMessage.encrypt(
    claimerEncryptionKey,
    attesterEncryptionKey,
    keystore
  )

  // claimer sends [[encrypted]] to the attester
  // ------------------------- Attester ----------------------------------------
  // When the Attester receives the message, she can decrypt it,
  // internally checks the sender is the owner of the account
  // and checks the hash and signature of the message
  const reqAttestationDec = await Kilt.Message.decrypt(
    encryptMessage,
    keystore,
    { senderDetails: claimerLightDid, receiverDetails: attesterFullDid }
  )

  const claimersRequest = Kilt.RequestForAttestation.fromRequest(
    (reqAttestationDec.body as IRequestAttestation).content
      .requestForAttestation
  )
  // Attester can check the data and verify the data has not been tampered with
  if (!claimersRequest.verifyData()) {
    console.log('data is false')
  }

  // Attester can check if the signature of the claimer matches the request for attestation object
  await claimersRequest.verifySignature()

  const attestation = Kilt.Attestation.fromRequestAndDid(
    claimersRequest,
    attesterFullDid.did
  )
  console.log('the attestation: ', attestation)
  await attestation
    .getStoreTx()
    .then((tx) =>
      attesterFullDid.authorizeExtrinsic(tx, keystore, attester.address)
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
      type: Kilt.Message.BodyType.SUBMIT_ATTESTATION,
      content: { attestation },
    },
    attesterFullDid.did,
    claimerLightDid.did
  )

  const submitAttestationEnc = await attesterAttestationMessage.encrypt(
    attesterEncryptionKey,
    claimerEncryptionKey,
    keystore
  )

  // ------------------------- CLAIMER -----------------------------------------
  // internally, the decrypt checks the sender is the owner of the account
  // and checks the hash and signature of the message
  const submitAttestationDec = await Kilt.Message.decrypt(
    submitAttestationEnc,
    keystore,
    { senderDetails: attesterFullDid, receiverDetails: claimerLightDid }
  )

  const credential = Kilt.Credential.fromRequestAndAttestation(
    // The claimer has access to the request for attestation
    requestForAttestation,
    (submitAttestationDec.body as ISubmitAttestation).content.attestation
  )

  console.log('RFA Message', reqAttestationDec.body, '\n')
  console.log('Submit attestation:', submitAttestationDec.body, '\n')
  console.log('Credential', credential, '\n')

  return {
    credential,
  }
}

async function doVerification(
  claimerLightDid: Did.LightDidDetails,
  credential: Credential,
  keystore: Did.DemoKeystore
): Promise<void> {
  console.log(
    ((s) => s.padEnd(40 + s.length / 2, SEP).padStart(80, SEP))(
      ' VERIFICATION '
    )
  )

  const verifierMnemonic = mnemonicGenerate()

  const verifierSigningKeypair = await keystore.generateKeypair({
    alg: Kilt.Did.SigningAlgorithms.Ed25519,
    seed: verifierMnemonic,
  })
  const verifierEncryptionKeypair = await keystore.generateKeypair({
    alg: Kilt.Did.EncryptionAlgorithms.NaclBox,
    seed: verifierMnemonic,
  })
  // Generate authentication and encryption keys used to derive a light DID from them.
  const verifierLightDid = new Kilt.Did.LightDidDetails({
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

  const claimerEncryptionKey = claimerLightDid.getKeys(
    KeyRelationship.keyAgreement
  )[0] as IDidKeyDetails<string>
  const verifierEncryptionKey = verifierLightDid.getKeys(
    KeyRelationship.keyAgreement
  )[0] as IDidKeyDetails<string>
  // ------------------------- Verifier ----------------------------------------
  const verifierAcceptedCredentialsMessage = new Kilt.Message(
    {
      type: Kilt.Message.BodyType.ACCEPT_CREDENTIAL,
      content: [credential.request.claim.cTypeHash],
    },
    verifierLightDid.did,
    claimerLightDid.did
  )

  const verifierAcceptedCredentialsMessageEnc =
    await verifierAcceptedCredentialsMessage.encrypt(
      verifierEncryptionKey,
      claimerEncryptionKey,
      keystore
    )

  // ------------------------- Claimer -----------------------------------------
  // The claimer receives a message from the verifier of the accepted ctypes
  const verifierAcceptedCredentialsMessageDec = await Kilt.Message.decrypt(
    verifierAcceptedCredentialsMessageEnc,
    keystore,
    { senderDetails: verifierLightDid, receiverDetails: claimerLightDid }
  )

  const ctypeHash = (
    verifierAcceptedCredentialsMessageDec.body as IAcceptCredential
  ).content[0]
  console.log('claimer checks the ctypeHash matches', ctypeHash)

  const challenge = Kilt.Utils.UUID.generate()

  const presentation = await credential.createPresentation({
    signer: keystore,
    claimerDid: claimerLightDid,
    challenge,
  })
  const claimerSubmitCredentialsMessage = new Kilt.Message(
    {
      type: Kilt.Message.BodyType.SUBMIT_CREDENTIAL,
      content: [presentation],
    },
    claimerLightDid.did,
    verifierLightDid.did
  )
  // Claimer encrypts the credentials message to the verifier
  const claimerSubmitCredentialsMessageEnc =
    await claimerSubmitCredentialsMessage.encrypt(
      claimerEncryptionKey,
      verifierEncryptionKey,
      keystore
    )

  // ------------------------- Verifier ----------------------------------------
  // The verifier needs the public account of the attester. Either he already has a list of trusted
  // attesters or he needs to resolve them differently. A Decentralized Identity (DID) would be an
  // option for that.

  const verifierSubmitCredentialsMessageDec = await Kilt.Message.decrypt(
    claimerSubmitCredentialsMessageEnc,
    keystore,
    { senderDetails: claimerLightDid, receiverDetails: verifierLightDid }
  )
  const presentationMessage = (
    verifierSubmitCredentialsMessageDec.body as ISubmitCredential
  ).content

  const verifiablePresentation = Kilt.Credential.fromCredential(
    presentationMessage[0]
  )
  const verified = await verifiablePresentation.verify({ challenge })
  console.log('Received claims: ', JSON.stringify(presentationMessage[0]))
  console.log('All valid? ', verified)
}

// do an attestation and a verification
async function example(): Promise<boolean> {
  const { claimerLightDid, attesterFullDid, claim, attester, keystore } =
    await setup()

  const { credential } = await doAttestation(
    claimerLightDid,
    attesterFullDid,
    attester,
    claim,
    keystore
  )
  // should succeed
  await doVerification(claimerLightDid, credential, keystore)
  await doVerification(claimerLightDid, credential, keystore)

  // revoke
  await Kilt.Attestation.getRevokeTx(credential.getHash(), 0)

  // should fail
  await doVerification(claimerLightDid, credential, keystore)
  await doVerification(claimerLightDid, credential, keystore)

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
