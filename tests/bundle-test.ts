/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/// <reference lib="dom" />

import type { ApiPromise } from '@polkadot/api'
import type {
  DecryptCallback,
  EncryptCallback,
  EncryptionKeyType,
  KeyringPair,
  KiltKeyringPair,
  LightDidSupportedVerificationKeyType,
  NewDidEncryptionKey,
  NewDidVerificationKey,
  ResponseData,
  SignCallback,
  SigningAlgorithms,
  SigningData,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import type { KeypairType } from '@polkadot/util-crypto/types'

const { kilt } = window

const {
  Claim,
  Attestation,
  Credential,
  CType,
  Did,
  Blockchain,
  Utils: { Crypto, Keyring, ss58Format },
  Message,
  BalanceUtils,
} = kilt

function getDefaultMigrationHandler(submitter: KeyringPair) {
  return async (e: SubmittableExtrinsic) => {
    await Blockchain.signAndSubmitTx(e, submitter, {
      resolveOn: Blockchain.IS_IN_BLOCK,
    })
  }
}

function makeSignCallback(keypair: KeyringPair): SignCallback {
  return async function sign<A extends SigningAlgorithms>({
    alg,
    data,
  }: SigningData<A>): Promise<ResponseData<A>> {
    const signature = keypair.sign(data, { withType: false })
    return { alg, data: signature }
  }
}

function makeSigningKeypair(
  seed: string,
  alg: SigningAlgorithms = 'sr25519'
): {
  keypair: KeyringPair
  sign: SignCallback
} {
  const keypairTypeForAlg: Record<SigningAlgorithms, KeypairType> = {
    ed25519: 'ed25519',
    sr25519: 'sr25519',
    'ecdsa-secp256k1': 'ecdsa',
  }
  const type = keypairTypeForAlg[alg]
  const keypair = new Keyring({ type }).addFromUri(seed, {}, type)
  const sign = makeSignCallback(keypair)

  return {
    keypair,
    sign,
  }
}

function makeEncryptionKeypair(seed: string): {
  secretKey: Uint8Array
  publicKey: Uint8Array
  type: EncryptionKeyType
} {
  const { secretKey, publicKey } = Crypto.naclBoxPairFromSecret(
    Crypto.hash(seed, 256)
  )
  return {
    secretKey,
    publicKey,
    type: 'x25519',
  }
}

function makeEncryptCallback({
  secretKey,
}: {
  secretKey: Uint8Array
  type: EncryptionKeyType
}): EncryptCallback {
  return async function encryptCallback({ data, peerPublicKey, alg }) {
    const { box, nonce } = Crypto.encryptAsymmetric(
      data,
      peerPublicKey,
      secretKey
    )
    return { alg, nonce, data: box }
  }
}

function makeDecryptCallback({
  secretKey,
}: {
  secretKey: Uint8Array
  type: EncryptionKeyType
}): DecryptCallback {
  return async function decryptCallback({ data, nonce, peerPublicKey, alg }) {
    const decrypted = Crypto.decryptAsymmetric(
      { box: data, nonce },
      peerPublicKey,
      secretKey
    )
    if (!decrypted) throw new Error('Decryption failed')
    return { data: decrypted, alg }
  }
}

async function createFullDidFromKeypair(
  payer: KiltKeyringPair,
  keypair: KeyringPair,
  encryptionKey: NewDidEncryptionKey,
  api: ApiPromise
) {
  const type = keypair.type as LightDidSupportedVerificationKeyType
  const lightDid = Did.createDetails({
    authentication: [{ publicKey: keypair.publicKey, type }],
    keyAgreement: [encryptionKey],
  })

  const sign = makeSignCallback(keypair)

  const creationTx = await Did.Chain.getStoreTx(lightDid, payer.address, sign)

  await getDefaultMigrationHandler(payer)(creationTx)
  const fullDid = await Did.query(Did.Utils.getFullDidUri(lightDid.uri))
  if (!fullDid) throw new Error('Cannot query created DID')

  const encodedKey = Did.Chain.encodePublicKey(fullDid.authentication[0])
  const extrinsic = await Did.authorizeBatch({
    did: fullDid,
    batchFunction: api.tx.utility.batchAll,
    extrinsics: [
      await api.tx.did.setAttestationKey(encodedKey),
      await api.tx.did.setDelegationKey(encodedKey),
    ],
    sign,
    submitter: payer.address,
  })
  await Blockchain.signAndSubmitTx(extrinsic, payer, {
    resolveOn: Blockchain.IS_IN_BLOCK,
  })

  const updatedFullDid = await Did.query(fullDid.uri)
  if (!updatedFullDid) throw new Error('Could not update DID keys')
  return updatedFullDid
}

async function runAll() {
  // init sdk kilt config and connect to chain
  await kilt.init({ address: 'ws://127.0.0.1:9944' })
  const api = await kilt.connect()

  if (!api) console.error('No blockchain connection established')
  const keyring = new Keyring({ ss58Format, type: 'ed25519' })
  // Accounts
  console.log('Account setup started')
  const FaucetSeed =
    'receive clutch item involve chaos clutch furnace arrest claw isolate okay together'
  const devFaucet = keyring.createFromUri(FaucetSeed) as KiltKeyringPair

  const { keypair: aliceKeypair, sign: aliceSign } =
    makeSigningKeypair('//Alice')
  const aliceEncryptionKey = makeEncryptionKeypair('//Alice//enc')
  const aliceDecryptCallback = makeDecryptCallback(aliceEncryptionKey)
  const alice = await createFullDidFromKeypair(
    devFaucet,
    aliceKeypair,
    aliceEncryptionKey,
    api
  )
  if (!alice.keyAgreement?.[0])
    throw new Error('Impossible: alice has no encryptionKey')
  console.log('alice setup done')

  const { keypair: bobKeypair, sign: bobSign } = makeSigningKeypair('//Bob')
  const bobEncryptionKey = makeEncryptionKeypair('//Bob//enc')
  const bobEncryptCallback = makeEncryptCallback(bobEncryptionKey)
  const bob = await createFullDidFromKeypair(
    devFaucet,
    bobKeypair,
    bobEncryptionKey,
    api
  )
  if (!bob.keyAgreement?.[0])
    throw new Error('Impossible: bob has no encryptionKey')
  console.log('bob setup done')

  // Light Did Account creation workflow
  const authPublicKey = Crypto.coToUInt8(
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  )
  const encPublicKey = Crypto.coToUInt8(
    '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
  )
  const address = Crypto.encodeAddress(authPublicKey, ss58Format)
  const testDid = Did.createDetails({
    authentication: [{ publicKey: authPublicKey, type: 'ed25519' }],
    keyAgreement: [{ publicKey: encPublicKey, type: 'x25519' }],
  })
  if (
    testDid.uri !==
    `did:kilt:light:01${address}:z1Ac9CMtYCTRWjetJfJqJoV7FcPDD9nHPHDHry7t3KZmvYe1HQP1tgnBuoG3enuGaowpF8V88sCxytDPDy6ZxhW`
  ) {
    throw new Error('DID Test Unsuccessful')
  } else console.info(`light DID successfully created`)

  // Chain Did workflow -> creation & deletion
  console.log('DID workflow started')
  const { keypair, sign } = makeSigningKeypair('//Foo', 'ed25519')

  const authentication = [keypair] as [NewDidVerificationKey]
  const createTx = await Did.Chain.getStoreTx(
    { authentication },
    devFaucet.address,
    sign
  )
  await Blockchain.signAndSubmitTx(createTx, devFaucet, {
    resolveOn: Blockchain.IS_IN_BLOCK,
  })
  const fullDid = await Did.query(
    Did.Utils.getFullDidUriByKey(authentication[0])
  )
  if (!fullDid) throw new Error('Could not fetch created DID details')

  const resolved = await Did.resolveDoc(fullDid.uri)

  if (
    resolved &&
    !resolved.metadata.deactivated &&
    resolved.details?.uri === fullDid.uri
  ) {
    console.info('DID matches')
  } else {
    throw new Error('DIDs do not match')
  }

  const extrinsic = await Did.Chain.getDeleteDidExtrinsic(
    BalanceUtils.toFemtoKilt(0)
  )
  const deleteTx = await Did.authorizeExtrinsic(
    fullDid,
    extrinsic,
    sign,
    devFaucet.address
  )

  await Blockchain.signAndSubmitTx(deleteTx, devFaucet, {
    resolveOn: Blockchain.IS_IN_BLOCK,
  })

  const resolvedAgain = await Did.resolveDoc(fullDid.uri)
  if (resolvedAgain?.metadata.deactivated) {
    console.info('DID successfully deleted')
  } else {
    throw new Error('DID was not deleted')
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
  const authorizedTx = await Did.authorizeExtrinsic(
    alice,
    tx,
    aliceSign,
    devFaucet.address
  )

  await Blockchain.signAndSubmitTx(authorizedTx, devFaucet, {
    resolveOn: Blockchain.IS_IN_BLOCK,
  })

  const stored = await CType.verifyStored(DriversLicense)
  if (stored) {
    console.info('CType successfully stored on chain')
  } else {
    throw new Error('CType not stored')
  }

  const result = await CType.verifyOwner({
    ...DriversLicense,
    owner: alice.uri,
  })
  if (result) {
    console.info('Owner verified')
  } else {
    throw new Error('CType owner does not match ctype creator DID')
  }

  // Attestation workflow
  console.log('Attestation workflow started')
  const content = { name: 'Bob', age: 21 }
  const claim = Claim.fromCTypeAndClaimContents(
    DriversLicense,
    content,
    bob.uri
  )
  const credential = Credential.fromClaim(claim)
  await Credential.sign(credential, bobSign, bob, bob.authentication[0].id)
  if (!Credential.isICredential(credential))
    throw new Error('Not a valid Credential')
  else {
    if (Credential.verifyDataIntegrity(credential))
      console.info('Credential data verified')
    else throw new Error('Credential not verifiable')
    if (await Credential.verifySignature(credential))
      console.info('Credential signature verified')
    else throw new Error('Credential Signature mismatch')
    if (credential.claim.contents !== content)
      throw new Error('Claim content inside Credential mismatching')
  }

  console.log('Test Messaging with encryption + decryption')
  const message = new Message(
    {
      content: {
        credential,
      },
      type: 'request-attestation',
    },
    bob.uri,
    alice.uri
  )
  const encryptedMessage = await message.encrypt(
    bob.keyAgreement[0].id,
    bob,
    bobEncryptCallback,
    `${alice.uri}${alice.keyAgreement[0].id}`
  )

  const decryptedMessage = await Message.decrypt(
    encryptedMessage,
    aliceDecryptCallback,
    alice
  )
  if (JSON.stringify(message.body) !== JSON.stringify(decryptedMessage.body)) {
    throw new Error('Original and decrypted message are not the same')
  }

  const attestation = Attestation.fromCredentialAndDid(credential, alice.uri)
  if (Attestation.verifyAgainstCredential(attestation, credential))
    console.info('Attestation Data verified')
  else throw new Error('Attestation Claim data not verifiable')

  const txAtt = await Attestation.getStoreTx(attestation)
  const authorizedAttTx = await Did.authorizeExtrinsic(
    alice,
    txAtt,
    aliceSign,
    devFaucet.address
  )
  await Blockchain.signAndSubmitTx(authorizedAttTx, devFaucet, {
    resolveOn: Blockchain.IS_IN_BLOCK,
  })
  if (await Attestation.checkValidity(credential.rootHash)) {
    console.info('Attestation verified with chain')
  } else {
    throw new Error('Attestation not verifiable with chain')
  }
}

window.runAll = runAll
