/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/// <reference lib="dom" />

import type { KeypairType } from '@polkadot/util-crypto/types'

import type {
  DecryptCallback,
  DidDocument,
  EncryptCallback,
  EncryptionKeyType,
  KeyringPair,
  KiltKeyringPair,
  NewDidEncryptionKey,
  SignCallback,
  SigningAlgorithms,
} from '@kiltprotocol/types'

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

kilt.config({ submitTxResolveOn: Blockchain.IS_IN_BLOCK })

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
      return { data: signature, keyUri: `${didDocument.uri}${keyId}`, keyType }
    }
  }
}
type StoreDidCallback = Parameters<typeof Did.Chain.getStoreTx>['2']

function makeStoreDidCallback(keypair: KiltKeyringPair): StoreDidCallback {
  return async function sign({ data }) {
    const signature = keypair.sign(data, { withType: false })
    return {
      data: signature,
      keyType: keypair.type,
    }
  }
}

function makeSigningKeypair(
  seed: string,
  alg: SigningAlgorithms = 'sr25519'
): {
  keypair: KiltKeyringPair
  sign: (didDocument: DidDocument) => SignCallback
  signStoreDid: StoreDidCallback
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
  const signStoreDid = makeStoreDidCallback(keypair)

  return {
    keypair,
    sign,
    signStoreDid,
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
}): (didDocument: DidDocument) => EncryptCallback {
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
}: {
  secretKey: Uint8Array
  type: EncryptionKeyType
}): DecryptCallback {
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
  const sign = makeStoreDidCallback(keypair)

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
  await Blockchain.signAndSubmitTx(storeTx, payer)

  const fullDid = await Did.query(Did.Utils.getFullDidUriFromKey(keypair))
  if (!fullDid) throw new Error('Cannot query created DID')
  return fullDid
}

async function runAll() {
  // init sdk kilt config and connect to chain
  const api = await kilt.connect('ws://127.0.0.1:9944')

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
  const { keypair, sign, signStoreDid } = makeSigningKeypair('//Foo', 'ed25519')

  const didStoreTx = await Did.Chain.getStoreTx(
    { authentication: [keypair] },
    payer.address,
    signStoreDid
  )
  await Blockchain.signAndSubmitTx(didStoreTx, payer)

  const fullDid = await Did.query(Did.Utils.getFullDidUriFromKey(keypair))
  if (!fullDid) throw new Error('Could not fetch created DID document')

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

  const deleteTx = await Did.authorizeExtrinsic(
    fullDid.uri,
    api.tx.did.delete(BalanceUtils.toFemtoKilt(0)),
    sign(fullDid),
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
    alice.uri,
    api.tx.ctype.add(CType.toChain(DriversLicense)),
    aliceSign(alice),
    payer.address
  )
  await Blockchain.signAndSubmitTx(cTypeStoreTx, payer)

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
  if (!Credential.isICredential(credential))
    throw new Error('Not a valid Credential')
  if (Credential.verifyDataIntegrity(credential))
    console.info('Credential data verified')
  else throw new Error('Credential not verifiable')
  if (credential.claim.contents !== content)
    throw new Error('Claim content inside Credential mismatching')

  const presentation = await Credential.createPresentation({
    credential,
    signCallback: bobSign(bob),
  })
  if (!Credential.isPresentation(presentation))
    throw new Error('Not a valid Presentation')
  if (await Credential.verifySignature(presentation))
    console.info('Presentation signature verified')
  else throw new Error('Credential Signature mismatch')

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
