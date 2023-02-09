/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/// <reference lib="dom" />

import type {
  DecryptCallback,
  DidDocument,
  EncryptCallback,
  KeyringPair,
  KiltEncryptionKeypair,
  KiltKeyringPair,
  NewDidEncryptionKey,
  SignCallback,
} from '@kiltprotocol/types'

const { kilt } = window

const {
  Claim,
  Attestation,
  ConfigService,
  Credential,
  CType,
  Did,
  Blockchain,
  Utils: { Crypto, ss58Format },
  Message,
  BalanceUtils,
} = kilt

ConfigService.set({ submitTxResolveOn: Blockchain.IS_IN_BLOCK })

function makeSignCallback(
  keypair: KeyringPair
): (didDocument: DidDocument) => SignCallback {
  return (didDocument) => {
    return async function sign({ data, keyRelationship }) {
      const keyId = didDocument[keyRelationship]?.[0].id
      const keyType = didDocument[keyRelationship]?.[0].type
      if (keyId === undefined || keyType === undefined) {
        throw new Error(
          `Key for purpose "${keyRelationship}" not found in did "${didDocument.uri}"`
        )
      }
      const signature = keypair.sign(data, { withType: false })
      return { signature, keyUri: `${didDocument.uri}${keyId}`, keyType }
    }
  }
}

type StoreDidCallback = Parameters<typeof Did.getStoreTx>['2']

function makeStoreDidCallback(keypair: KiltKeyringPair): StoreDidCallback {
  return async function sign({ data }) {
    const signature = keypair.sign(data, { withType: false })
    return {
      signature,
      keyType: keypair.type,
    }
  }
}

function makeSigningKeypair(
  seed: string,
  type: KiltKeyringPair['type'] = 'sr25519'
): {
  keypair: KiltKeyringPair
  getSignCallback: (didDocument: DidDocument) => SignCallback
  storeDidCallback: StoreDidCallback
} {
  const keypair = Crypto.makeKeypairFromUri(seed, type)
  const getSignCallback = makeSignCallback(keypair)
  const storeDidCallback = makeStoreDidCallback(keypair)

  return {
    keypair,
    getSignCallback,
    storeDidCallback,
  }
}

function makeEncryptionKeypair(seed: string): KiltEncryptionKeypair {
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
}: KiltEncryptionKeypair): (didDocument: DidDocument) => EncryptCallback {
  return (didDocument) => {
    return async function encryptCallback({ data, peerPublicKey }) {
      const keyId = didDocument.keyAgreement?.[0].id
      if (!keyId) {
        throw new Error(`Encryption key not found in did "${didDocument.uri}"`)
      }
      const { box, nonce } = Crypto.encryptAsymmetric(
        data,
        peerPublicKey,
        secretKey
      )
      return { nonce, data: box, keyUri: `${didDocument.uri}${keyId}` }
    }
  }
}

function makeDecryptCallback({
  secretKey,
}: KiltEncryptionKeypair): DecryptCallback {
  return async function decryptCallback({ data, nonce, peerPublicKey }) {
    const decrypted = Crypto.decryptAsymmetric(
      { box: data, nonce },
      peerPublicKey,
      secretKey
    )
    if (decrypted === false) throw new Error('Decryption failed')
    return { data: decrypted }
  }
}

async function createFullDidFromKeypair(
  payer: KiltKeyringPair,
  keypair: KiltKeyringPair,
  encryptionKey: NewDidEncryptionKey
) {
  const api = ConfigService.get('api')
  const sign = makeStoreDidCallback(keypair)

  const storeTx = await Did.getStoreTx(
    {
      authentication: [keypair],
      assertionMethod: [keypair],
      capabilityDelegation: [keypair],
      keyAgreement: [encryptionKey],
    },
    payer.address,
    sign
  )
  await Blockchain.signAndSubmitTx(storeTx, payer)

  const queryFunction = api.call.did?.query ?? api.call.didApi.queryDid
  const encodedDidDetails = await queryFunction(Did.toChain(Did.getFullDidUriFromKey(keypair)))
  return Did.linkedInfoFromChain(encodedDidDetails).document
}

async function runAll() {
  // init sdk kilt config and connect to chain
  const api = await kilt.connect('ws://127.0.0.1:9944')

  // Accounts
  console.log('Account setup started')
  const FaucetSeed =
    'receive clutch item involve chaos clutch furnace arrest claw isolate okay together'
  const payer = Crypto.makeKeypairFromUri(FaucetSeed)

  const { keypair: aliceKeypair, getSignCallback: aliceSign } =
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

  const { keypair: bobKeypair, getSignCallback: bobSign } =
    makeSigningKeypair('//Bob')
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
  const testDid = Did.createLightDidDocument({
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
  const { keypair, getSignCallback, storeDidCallback } = makeSigningKeypair(
    '//Foo',
    'ed25519'
  )

  const didStoreTx = await Did.getStoreTx(
    { authentication: [keypair] },
    payer.address,
    storeDidCallback
  )
  await Blockchain.signAndSubmitTx(didStoreTx, payer)

  const queryFunction = api.call.did?.query ?? api.call.didApi.queryDid
  const encodedDidDetails = await queryFunction(Did.toChain(Did.getFullDidUriFromKey(keypair)))
  const fullDid = Did.linkedInfoFromChain(encodedDidDetails).document
  const resolved = await Did.resolve(fullDid.uri)

  if (
    resolved &&
    !resolved.metadata.deactivated &&
    resolved.document?.uri === fullDid.uri
  ) {
    console.info('DID matches')
  } else {
    throw new Error('DIDs do not match')
  }

  const deleteTx = await Did.authorizeTx(
    fullDid.uri,
    api.tx.did.delete(BalanceUtils.toFemtoKilt(0)),
    getSignCallback(fullDid),
    payer.address
  )
  await Blockchain.signAndSubmitTx(deleteTx, payer)

  const resolvedAgain = await Did.resolve(fullDid.uri)
  if (!resolvedAgain || resolvedAgain.metadata.deactivated) {
    console.info('DID successfully deleted')
  } else {
    throw new Error('DID was not deleted')
  }

  // CType workflow
  console.log('CType workflow started')
  const DriversLicense = CType.fromProperties('Drivers License', {
    name: {
      type: 'string',
    },
    age: {
      type: 'integer',
    },
  })

  const cTypeStoreTx = await Did.authorizeTx(
    alice.uri,
    api.tx.ctype.add(CType.toChain(DriversLicense)),
    aliceSign(alice),
    payer.address
  )
  await Blockchain.signAndSubmitTx(cTypeStoreTx, payer)

  await CType.verifyStored(DriversLicense)
  console.info('CType successfully stored on chain')

  // Attestation workflow
  console.log('Attestation workflow started')
  const content = { name: 'Bob', age: 21 }
  const claim = Claim.fromCTypeAndClaimContents(
    DriversLicense,
    content,
    bob.uri
  )
  const credential = Credential.fromClaim(claim)
  if (!Credential.isICredential(credential))
    throw new Error('Not a valid Credential')
  Credential.verifyDataIntegrity(credential)
  console.info('Credential data verified')
  if (credential.claim.contents !== content)
    throw new Error('Claim content inside Credential mismatching')

  const presentation = await Credential.createPresentation({
    credential,
    signCallback: bobSign(bob),
  })
  if (!Credential.isPresentation(presentation))
    throw new Error('Not a valid Presentation')
  await Credential.verifySignature(presentation)
  console.info('Presentation signature verified')

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
    bobEncryptCallback(bob),
    `${alice.uri}${alice.keyAgreement[0].id}`
  )

  const decryptedMessage = await Message.decrypt(
    encryptedMessage,
    aliceDecryptCallback
  )
  if (JSON.stringify(message.body) !== JSON.stringify(decryptedMessage.body)) {
    throw new Error('Original and decrypted message are not the same')
  }

  const attestation = Attestation.fromCredentialAndDid(credential, alice.uri)
  Attestation.verifyAgainstCredential(attestation, credential)
  console.info('Attestation Data verified')

  const attestationStoreTx = await Did.authorizeTx(
    alice.uri,
    api.tx.attestation.add(attestation.claimHash, attestation.cTypeHash, null),
    aliceSign(alice),
    payer.address
  )
  await Blockchain.signAndSubmitTx(attestationStoreTx, payer)
  const storedAttestation = Attestation.fromChain(
    await api.query.attestation.attestations(credential.rootHash),
    credential.rootHash
  )
  if (storedAttestation?.revoked === false) {
    console.info('Attestation verified with chain')
  } else {
    throw new Error('Attestation not verifiable with chain')
  }
}

window.runAll = runAll
