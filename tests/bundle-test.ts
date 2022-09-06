/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/// <reference lib="dom" />

import type {
  DecryptCallback,
  EncryptCallback,
  EncryptionKeyType,
  KeyringPair,
  KiltKeyringPair,
  NewDidEncryptionKey,
  ResponseData,
  SignCallback,
  SigningAlgorithms,
  SigningData,
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

const resolveOn = Blockchain.IS_IN_BLOCK

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
  keypair: KiltKeyringPair
  sign: SignCallback
} {
  const keypairTypeForAlg: Record<SigningAlgorithms, KeypairType> = {
    ed25519: 'ed25519',
    sr25519: 'sr25519',
    'ecdsa-secp256k1': 'ecdsa',
  }
  const type = keypairTypeForAlg[alg]
  const keypair = new Keyring({ type }).addFromUri(
    seed,
    {},
    type
  ) as KiltKeyringPair
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
  keypair: KiltKeyringPair,
  encryptionKey: NewDidEncryptionKey
) {
  const sign = makeSignCallback(keypair)

  const storeTx = await Did.Chain.getStoreTx(
    {
      authentication: [keypair],
      assertionMethod: [keypair],
      capabilityDelegation: [keypair],
      keyAgreement: [encryptionKey],
    },
    payer.address,
    sign
  )
  await Blockchain.signAndSubmitTx(storeTx, payer, { resolveOn })

  const fullDid = await Did.query(Did.Utils.getFullDidUriFromKey(keypair))
  if (!fullDid) throw new Error('Cannot query created DID')
  return fullDid
}

async function runAll() {
  // init sdk kilt config and connect to chain
  await kilt.init({ address: 'ws://127.0.0.1:9944' })
  const api = await kilt.connect()
  if (!api) throw new Error('No blockchain connection established')

  // Accounts
  console.log('Account setup started')
  const FaucetSeed =
    'receive clutch item involve chaos clutch furnace arrest claw isolate okay together'
  const payer = new Keyring({ ss58Format, type: 'ed25519' }).createFromUri(
    FaucetSeed
  ) as KiltKeyringPair

  const { keypair: aliceKeypair, sign: aliceSign } =
    makeSigningKeypair('//Alice')
  const aliceEncryptionKey = makeEncryptionKeypair('//Alice//enc')
  const aliceDecryptCallback = makeDecryptCallback(aliceEncryptionKey)
  const alice = await createFullDidFromKeypair(
    payer,
    aliceKeypair,
    aliceEncryptionKey
  )
  if (!alice.keyAgreement?.[0])
    throw new Error('Impossible: alice has no encryptionKey')
  console.log('alice setup done')

  const { keypair: bobKeypair, sign: bobSign } = makeSigningKeypair('//Bob')
  const bobEncryptionKey = makeEncryptionKeypair('//Bob//enc')
  const bobEncryptCallback = makeEncryptCallback(bobEncryptionKey)
  const bob = await createFullDidFromKeypair(
    payer,
    bobKeypair,
    bobEncryptionKey
  )
  if (!bob.keyAgreement?.[0])
    throw new Error('Impossible: bob has no encryptionKey')
  console.log('bob setup done')

  // Light DID Account creation workflow
  const authPublicKey = Crypto.coToUInt8(
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  )
  const encPublicKey = Crypto.coToUInt8(
    '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
  )
  const address = Crypto.encodeAddress(authPublicKey, ss58Format)
  const testDid = Did.createLightDidDetails({
    authentication: [{ publicKey: authPublicKey, type: 'ed25519' }],
    keyAgreement: [{ publicKey: encPublicKey, type: 'x25519' }],
  })
  if (
    testDid.uri !==
    `did:kilt:light:01${address}:z1Ac9CMtYCTRWjetJfJqJoV7FcPDD9nHPHDHry7t3KZmvYe1HQP1tgnBuoG3enuGaowpF8V88sCxytDPDy6ZxhW`
  ) {
    throw new Error('DID Test Unsuccessful')
  } else console.info(`light DID successfully created`)

  // Chain DID workflow -> creation & deletion
  console.log('DID workflow started')
  const { keypair, sign } = makeSigningKeypair('//Foo', 'ed25519')

  const didStoreTx = await Did.Chain.getStoreTx(
    { authentication: [keypair] },
    payer.address,
    sign
  )
  await Blockchain.signAndSubmitTx(didStoreTx, payer, { resolveOn })

  const fullDid = await Did.query(Did.Utils.getFullDidUriFromKey(keypair))
  if (!fullDid) throw new Error('Could not fetch created DID details')

  const resolved = await Did.resolve(fullDid.uri)

  if (
    resolved &&
    !resolved.metadata.deactivated &&
    resolved.details?.uri === fullDid.uri
  ) {
    console.info('DID matches')
  } else {
    throw new Error('DIDs do not match')
  }

  const deleteTx = await Did.authorizeExtrinsic(
    fullDid,
    api.tx.did.delete(BalanceUtils.toFemtoKilt(0)),
    sign,
    payer.address
  )
  await Blockchain.signAndSubmitTx(deleteTx, payer, { resolveOn })

  const resolvedAgain = await Did.resolve(fullDid.uri)
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

  const cTypeStoreTx = await Did.authorizeExtrinsic(
    alice,
    api.tx.ctype.add(CType.encode(DriversLicense)),
    aliceSign,
    payer.address
  )
  await Blockchain.signAndSubmitTx(cTypeStoreTx, payer, { resolveOn })

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
  const message = Message.fromBody(
    {
      content: {
        credential,
      },
      type: 'request-attestation',
    },
    bob.uri,
    alice.uri
  )
  const encryptedMessage = await Message.encrypt(
    message,
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

  const attestationStoreTx = await Did.authorizeExtrinsic(
    alice,
    await Attestation.getStoreTx(attestation),
    aliceSign,
    payer.address
  )
  await Blockchain.signAndSubmitTx(attestationStoreTx, payer, { resolveOn })
  if (await Attestation.checkValidity(credential.rootHash)) {
    console.info('Attestation verified with chain')
  } else {
    throw new Error('Attestation not verifiable with chain')
  }
}

window.runAll = runAll
