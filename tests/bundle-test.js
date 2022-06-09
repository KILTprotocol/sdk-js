/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-console, @typescript-eslint/explicit-function-return-type */

const {
  Claim,
  Attestation,
  Credential: KiltCredential,
  CType,
  RequestForAttestation,
  Did,
  BlockchainUtils,
  Utils: { Crypto: KiltCrypto, Keyring },
  Message,
  MessageBodyType,
  VerificationKeyType,
  EncryptionKeyType,
} = window.kilt

function getDefaultMigrationHandler(submitter) {
  return async (e) => {
    await BlockchainUtils.signAndSubmitTx(e, submitter, {
      reSign: true,
      resolveOn: BlockchainUtils.IS_IN_BLOCK,
    })
  }
}

async function createFullDidFromSeed(identity, keystore, seed, api) {
  const lightDid = await Did.DemoKeystoreUtils.createMinimalLightDidFromSeed(
    keystore,
    seed
  )

  const fullDid = await lightDid.migrate(
    identity.address,
    keystore,
    getDefaultMigrationHandler(identity)
  )

  const updatedFullDid = await new Did.FullDidUpdateBuilder(api, fullDid)
    .setAttestationKey(fullDid.authenticationKey)
    .setDelegationKey(fullDid.authenticationKey)
    .buildAndSubmit(
      keystore,
      identity.address,
      getDefaultMigrationHandler(identity)
    )

  return updatedFullDid
}

async function runAll() {
  // init sdk kilt config and connect to chain
  const keystore = new Did.DemoKeystore()
  await window.kilt.init({ address: 'ws://127.0.0.1:9944' })
  const blockchain = await window.kilt.connect()

  if (!blockchain) console.error('No blockchain connection established')
  else blockchain.getStats().then((t) => console.info(t))
  const keyring = new Keyring({ ss58Format: 38, type: 'ed25519' })
  // Accounts
  console.log('Account setup started')
  const FaucetSeed =
    'receive clutch item involve chaos clutch furnace arrest claw isolate okay together'
  const devFaucet = keyring.createFromUri(FaucetSeed)
  const alice = await createFullDidFromSeed(
    devFaucet,
    keystore,
    '//Alice',
    blockchain.api
  )
  console.log('alice setup done')
  const bob = await createFullDidFromSeed(
    devFaucet,
    keystore,
    '//Bob',
    blockchain.api
  )
  console.log('bob setup done')

  // Light Did Account creation workflow
  const authPublicKey = KiltCrypto.coToUInt8(
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  )
  const encPublicKey = KiltCrypto.coToUInt8(
    '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
  )
  const address = KiltCrypto.encodeAddress(authPublicKey, 38)
  const didCreationDetails = {
    authenticationKey: {
      publicKey: authPublicKey,
      type: VerificationKeyType.Ed25519,
    },
    encryptionKey: {
      publicKey: encPublicKey,
      type: EncryptionKeyType.X25519,
    },
  }
  const testDid = Did.LightDidDetails.fromDetails(didCreationDetails)
  if (
    testDid.uri !==
    `did:kilt:light:01${address}:z1Ac9CMtYCTRWjetJfJqJoV7FcPDD9nHPHDHry7t3KZmvYe1HQP1tgnBuoG3enuGaowpF8V88sCxytDPDy6ZxhW`
  ) {
    throw new Error('Did Test Unsuccessful')
  } else console.info(`light did successfully created`)

  // Chain Did workflow -> creation & deletion
  console.log('DID workflow started')
  const keypair = await keystore.generateKeypair({
    alg: Did.SigningAlgorithms.Ed25519,
  })

  const fullDid = await new Did.FullDidCreationBuilder(blockchain.api, {
    publicKey: keypair.publicKey,
    type: VerificationKeyType.Ed25519,
  }).buildAndSubmit(keystore, devFaucet.address, async (tx) => {
    await BlockchainUtils.signAndSubmitTx(tx, devFaucet, {
      reSign: true,
      resolveOn: BlockchainUtils.IS_IN_BLOCK,
    })
  })

  const resolved = await Did.resolveDoc(fullDid.uri)

  if (!resolved.metadata.deactivated && resolved.details.uri === fullDid.uri) {
    console.info('Did matches!')
  } else {
    throw new Error('Dids not matching!')
  }

  const extrinsic = await Did.Chain.getDeleteDidExtrinsic(0)
  const deleteTx = await fullDid.authorizeExtrinsic(
    extrinsic,
    keystore,
    devFaucet.address
  )

  await BlockchainUtils.signAndSubmitTx(deleteTx, devFaucet, {
    resolveOn: BlockchainUtils.IS_IN_BLOCK,
    reSign: true,
  })

  const resolvedAgain = await Did.resolveDoc(fullDid.uri)
  if (resolvedAgain.metadata.deactivated) {
    console.info('Did successfully deleted!')
  } else {
    throw new Error('Did not successfully deleted')
  }

  // CType workflow
  console.log('CType workflow started')
  const DriversLicense = CType.fromSchema({
    $id: 'kilt:ctype:0x1',
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

  const tx = await CType.getStoreTx(DriversLicense)
  const authorizedTx = await alice.authorizeExtrinsic(
    tx,
    keystore,
    devFaucet.address
  )

  await BlockchainUtils.signAndSubmitTx(authorizedTx, devFaucet, {
    resolveOn: BlockchainUtils.IS_IN_BLOCK,
    reSign: true,
  })

  const stored = await CType.verifyStored(DriversLicense)
  if (stored) {
    console.info('CType successfully stored onchain!')
  } else {
    throw new Error('ctype not stored!')
  }

  const result = await CType.verifyOwner({
    ...DriversLicense,
    owner: alice.uri,
  })
  if (result) {
    console.info('owner verified')
  } else {
    throw new Error('ctype owner does not match ctype creator did')
  }

  // Attestation workflow
  console.log('Attestation workflow started')
  const content = { name: 'Bob', age: 21 }
  const claim = Claim.fromCTypeAndClaimContents(
    DriversLicense,
    content,
    bob.uri
  )
  const request = RequestForAttestation.fromClaim(claim)
  const signed = await RequestForAttestation.signWithDidKey(
    request,
    keystore,
    bob,
    bob.authenticationKey.id
  )
  if (!RequestForAttestation.isIRequestForAttestation(signed))
    throw new Error('Not a valid Request!')
  else {
    if (RequestForAttestation.verifyDataIntegrity(signed))
      console.info('Req4Att data verified')
    else throw new Error('Req4Att not verifiable')
    if (RequestForAttestation.verifySignature(signed))
      console.info('Req4Att signature verified')
    else throw new Error('Req4Att Signature mismatch')
    if (signed.claim.contents !== content)
      throw new Error('Claim content inside Req4Att mismatching')
  }

  console.log('Test Messaging with encryption + decryption')
  const body = {
    content: {
      requestForAttestation: signed,
    },
    type: MessageBodyType.REQUEST_ATTESTATION,
  }

  const message = new Message(body, bob.uri, alice.uri)
  const encryptedMessage = await message.encrypt(
    bob.encryptionKey.id,
    bob,
    keystore,
    `${alice.uri}#${alice.encryptionKey.id}`
  )

  const decryptedMessage = await Message.decrypt(
    encryptedMessage,
    keystore,
    alice
  )
  if (JSON.stringify(message.body) !== JSON.stringify(decryptedMessage.body)) {
    throw new Error('original and decrypted message are not the same')
  }

  const attestation = Attestation.fromRequestAndDid(signed, alice.uri)
  const credential = KiltCredential.fromRequestAndAttestation(
    signed,
    attestation
  )
  if (KiltCredential.verifyDataIntegrity(credential))
    console.info('Attested Claim Data verified!')
  else throw new Error('Attested Claim data not verifiable')

  const txAtt = await Attestation.getStoreTx(attestation)
  const authorizedAttTx = await alice.authorizeExtrinsic(
    txAtt,
    keystore,
    devFaucet.address
  )
  await BlockchainUtils.signAndSubmitTx(authorizedAttTx, devFaucet, {
    resolveOn: BlockchainUtils.IS_IN_BLOCK,
    reSign: true,
  })
  if (KiltCredential.verify(credential)) {
    console.info('Attested Claim verified with chain.')
  } else {
    throw new Error('attested Claim not verifiable with chain')
  }
}

window.runAll = runAll
