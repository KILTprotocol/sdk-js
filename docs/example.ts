/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { mnemonicGenerate } from '@polkadot/util-crypto'

import * as Kilt from '@kiltprotocol/sdk-js'

const NODE_URL = 'ws://127.0.0.1:9944'
const SEP = '_'

async function setup(): Promise<{
  claimerLightDid: Kilt.Did.LightDidDetails
  attesterFullDid: Kilt.Did.FullDidDetails
  attester: Kilt.KeyringPair
  claim: Kilt.Claim
  ctype: Kilt.CType
  keystore: Kilt.Did.DemoKeystore
}> {
  console.log(
    ((s) => s.padEnd(40 + s.length / 2, SEP).padStart(80, SEP))(' SETUP ')
  )
  await Kilt.init({ address: NODE_URL })
  const { api } =
    await Kilt.ChainHelpers.BlockchainApiConnection.getConnectionOrConnect()

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
  const authKey = await keystore.generateKeypair({
    alg: Kilt.Did.SigningAlgorithms.Ed25519,
  })
  const attesterFullDid = await new Kilt.Did.FullDidCreationBuilder(api, {
    publicKey: authKey.publicKey,
    type: Kilt.Did.DemoKeystore.getKeyTypeForAlg(
      authKey.alg
    ) as Kilt.VerificationKeyType,
  }).consumeWithHandler(keystore, attester.address, async (tx) => {
    Kilt.BlockchainUtils.signAndSubmitTx(tx, attester, {
      resolveOn: Kilt.BlockchainUtils.IS_IN_BLOCK,
      reSign: true,
    })
  })

  // Will print `did:kilt:4sxSYXakw1ZXBymzT9t3Yw91mUaqKST5bFUEjGEpvkTuckar`.
  console.log(attesterFullDid.did)

  // ------------------------- CType    ----------------------------------------
  // First build a schema
  const ctypeSchema: Kilt.ICType['schema'] = {
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
  const rawCtype: Kilt.ICType = {
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
  const claimerLightDid = Kilt.Did.LightDidDetails.fromDetails({
    authenticationKey: {
      publicKey: claimerSigningKeypair.publicKey,
      type: Kilt.Did.DemoKeystore.getKeyTypeForAlg(
        claimerSigningKeypair.alg
      ) as Kilt.Did.LightDidSupportedVerificationKeyType,
    },
    encryptionKey: {
      publicKey: claimerEncryptionKeypair.publicKey,
      type: Kilt.Did.DemoKeystore.getKeyTypeForAlg(
        claimerEncryptionKeypair.alg
      ) as Kilt.EncryptionKeyType,
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
  claimerLightDid: Kilt.Did.LightDidDetails,
  attesterFullDid: Kilt.Did.FullDidDetails,
  attester: Kilt.KeyringPair,
  claim: Kilt.Claim,
  keystore: Kilt.Did.DemoKeystore
): Promise<{
  credential: Kilt.Credential
}> {
  console.log(
    ((s) => s.padEnd(40 + s.length / 2, SEP).padStart(80, SEP))(' ATTESTATION ')
  )

  // ------------------------- CLAIMER -----------------------------------------
  // And we need to build a request for an attestation

  const requestForAttestation = Kilt.RequestForAttestation.fromClaim(claim)
  await requestForAttestation.signWithDidKey(
    keystore,
    claimerLightDid,
    claimerLightDid.authenticationKey.id
  )
  // The claimer can send a message to the attester requesting to do the attestation
  const claimerRequestMessage = new Kilt.Message(
    {
      type: Kilt.Message.BodyType.REQUEST_ATTESTATION,
      content: { requestForAttestation },
    },
    claimerLightDid.did,
    attesterFullDid.did
  )

  // The message can be encrypted as follows
  const encryptedMessage = await claimerRequestMessage.encrypt(
    claimerLightDid.encryptionKey!.id,
    claimerLightDid,
    keystore,
    attesterFullDid.assembleKeyId(attesterFullDid.encryptionKey!.id)
  )

  // claimer sends [[encrypted]] to the attester
  // ------------------------- Attester ----------------------------------------
  // When the Attester receives the message, she can decrypt it,
  // internally checks the sender is the owner of the account
  // and checks the hash and signature of the message
  const reqAttestationDec = await Kilt.Message.decrypt(
    encryptedMessage,
    keystore,
    attesterFullDid
  )

  const claimersRequest = Kilt.RequestForAttestation.fromRequest(
    (reqAttestationDec.body as Kilt.IRequestAttestation).content
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
    attesterFullDid.encryptionKey!.id,
    attesterFullDid,
    keystore,
    claimerLightDid.assembleKeyId(claimerLightDid.encryptionKey!.id)
  )

  // ------------------------- CLAIMER -----------------------------------------
  // internally, the decrypt checks the sender is the owner of the account
  // and checks the hash and signature of the message
  const submitAttestationDec = await Kilt.Message.decrypt(
    submitAttestationEnc,
    keystore,
    claimerLightDid
  )

  const credential = Kilt.Credential.fromRequestAndAttestation(
    // The claimer has access to the request for attestation
    requestForAttestation,
    (submitAttestationDec.body as Kilt.ISubmitAttestation).content.attestation
  )

  console.log('RFA Message', reqAttestationDec.body, '\n')
  console.log('Submit attestation:', submitAttestationDec.body, '\n')
  console.log('Credential', credential, '\n')

  return {
    credential,
  }
}

async function doVerification(
  claimerLightDid: Kilt.Did.LightDidDetails,
  credential: Kilt.Credential,
  keystore: Kilt.Did.DemoKeystore
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
  const verifierLightDid = Kilt.Did.LightDidDetails.fromDetails({
    authenticationKey: {
      publicKey: verifierSigningKeypair.publicKey,
      type: Kilt.Did.DemoKeystore.getKeyTypeForAlg(
        verifierSigningKeypair.alg
      ) as Kilt.Did.LightDidSupportedVerificationKeyType,
    },
    encryptionKey: {
      publicKey: verifierEncryptionKeypair.publicKey,
      type: Kilt.Did.DemoKeystore.getKeyTypeForAlg(
        verifierEncryptionKeypair.alg
      ) as Kilt.EncryptionKeyType,
    },
  })

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
      verifierLightDid.encryptionKey!.id,
      verifierLightDid,
      keystore,
      claimerLightDid.assembleKeyId(claimerLightDid.encryptionKey!.id)
    )

  // ------------------------- Claimer -----------------------------------------
  // The claimer receives a message from the verifier of the accepted ctypes
  const verifierAcceptedCredentialsMessageDec = await Kilt.Message.decrypt(
    verifierAcceptedCredentialsMessageEnc,
    keystore,
    claimerLightDid
  )

  const ctypeHash = (
    verifierAcceptedCredentialsMessageDec.body as Kilt.IAcceptCredential
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
      claimerLightDid.encryptionKey!.id,
      claimerLightDid,
      keystore,
      verifierLightDid.assembleKeyId(verifierLightDid.encryptionKey!.id)
    )

  // ------------------------- Verifier ----------------------------------------
  // The verifier needs the public account of the attester. Either he already has a list of trusted
  // attesters or he needs to resolve them differently. A Decentralized Identity (DID) would be an
  // option for that.

  const verifierSubmitCredentialsMessageDec = await Kilt.Message.decrypt(
    claimerSubmitCredentialsMessageEnc,
    keystore,
    verifierLightDid
  )
  const presentationMessage = (
    verifierSubmitCredentialsMessageDec.body as Kilt.ISubmitCredential
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
