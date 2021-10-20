/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable @typescript-eslint/no-var-requires */

const kilt = require('./packages/sdk-js/dist/sdk-js.umd')

const {
  Claim,
  Attestation,
  AttestedClaim,
  CType,
  RequestForAttestation,
  Did,
  BlockchainUtils,
  Utils: { Crypto, Keyring },
} = kilt
// init sdk kilt config and connect to chain
const keystore = new Did.DemoKeystore()
const init = kilt.init({ address: 'ws://127.0.0.1:9944' })
const blockchain = init.then(() => kilt.connect())

blockchain.then((chain) => {
  if (!chain) console.error('No blockchain connection established')
  else chain.getStats().then((t) => console.info(t))
})
const keyring = new Keyring({ ss58Format: 38, type: 'ed25519' })
// Accounts
const FaucetSeed =
  'receive clutch item involve chaos clutch furnace arrest claw isolate okay together'
const devFaucet = keyring.createFromUri(FaucetSeed)
const Alice = Did.createOnChainDidFromSeed(devFaucet, keystore, '//Alice')
const Bob = Did.createOnChainDidFromSeed(devFaucet, keystore, '//Bob')
const Charlie = Did.createOnChainDidFromSeed(devFaucet, keystore, '//Charlie')
// Light Did Account creation workflow

const authPublicKey = Crypto.coToUInt8(
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
)
const encPublicKey = Crypto.coToUInt8(
  '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
)
const address = Crypto.encodeAddress(authPublicKey, 38)
const didCreationDetails = {
  authenticationKey: {
    publicKey: authPublicKey,
    type: 'ed25519',
  },
  encryptionKey: {
    publicKey: encPublicKey,
    type: 'x25519',
  },
}
const testDid = new Did.LightDidDetails(didCreationDetails)
if (
  testDid.did !==
  `did:kilt:light:01${address}:oWFlomlwdWJsaWNLZXlYILu7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7ZHR5cGVmeDI1NTE5`
)
  throw new Error('Did Test Unsuccessful')
else
  console.info(
    `light did successfully created: ${JSON.stringify(testDid, null, 2)}`
  )

// Chain Did workflow -> creation & deletion
keystore
  .generateKeypair({
    alg: Did.SigningAlgorithms.Ed25519,
  })
  .then(({ publicKey, alg }) => {
    const didIdentifier = keyring.encodeAddress(publicKey)
    const key = { publicKey, type: alg }
    Did.DidChain.generateCreateTx({
      didIdentifier,
      endpointData: {
        urls: ['https://example.com'],
        contentHash: Crypto.hashStr('look I made you some content!'),
        contentType: 'application/json',
      },
      signer: keystore,
      signingPublicKey: key.publicKey,
      alg: key.type,
    })
      .then((tx) =>
        BlockchainUtils.signAndSubmitTx(tx, devFaucet, {
          resolveOn: BlockchainUtils.IS_IN_BLOCK,
        })
      )
      .then(() => {
        Did.DidChain.queryById(didIdentifier)
          .then(
            (query) =>
              (query.did ===
                Did.DidUtils.getKiltDidFromIdentifier(didIdentifier, 'full') &&
                console.info('Did Identifiers matching!')) ||
              new Error('Did Identifiers not matching!')
          )
          .then(() => {
            Did.DidChain.getDeleteDidExtrinsic().then((extrinsic) => {
              Did.DidChain.generateDidAuthenticatedTx({
                didIdentifier,
                txCounter: 1,
                call: extrinsic,
                signer: keystore,
                signingPublicKey: key.publicKey,
                alg: key.type,
              })
                .then((submittable) =>
                  BlockchainUtils.signAndSubmitTx(submittable, devFaucet, {
                    resolveOn: BlockchainUtils.IS_IN_BLOCK,
                  })
                )
                .then(() =>
                  Did.DidChain.queryById(didIdentifier).then(
                    (didResult) =>
                      didResult === null &&
                      console.info('Did successfully deleted!')
                  )
                )
            })
          })
      })
  })
// CType workflow
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

Alice.then((alice) => {
  Did.DidChain.queryById(alice.identifier).then(
    (chainDid) =>
      (!chainDid && console.log('Alice Did on chain!')) ||
      new Error('did not created')
  )
  DriversLicense.store()
    .then((tx) => alice.authorizeExtrinsic(tx, keystore))
    .then((tx) =>
      BlockchainUtils.signAndSubmitTx(tx, devFaucet, {
        resolveOn: BlockchainUtils.IS_IN_BLOCK,
        reSign: true,
      })
    )
    .then(() => {
      DriversLicense.verifyStored().then(
        (stored) =>
          (stored && console.info('CType successfully stored onchain!')) ||
          new Error('ctype not stored!')
      )
      kilt.CTypeUtils.verifyOwner({
        ...DriversLicense,
        owner: alice.did,
      }).then(
        (result) =>
          (result && console.info('owner verified')) ||
          new Error('ctype owner does not match ctype creator did')
      )
    })
})
// Attestation workflow

const content = { name: 'Bob', age: 21 }
Promise.all([Alice, Bob]).then(([alice, bob]) => {
  const claim = Claim.fromCTypeAndClaimContents(
    DriversLicense,
    content,
    bob.did
  )
  const request = RequestForAttestation.fromClaim(claim)
  request.signWithDid(keystore, bob).then((signed) => {
    if (!RequestForAttestation.isIRequestForAttestation(signed))
      throw new Error('Not a valid Request!')
    else {
      if (signed.verifyData()) console.info('Req4Att data verified')
      else throw new Error('Req4Att not verifiable')
      if (signed.verifySignature()) console.info('Req4Att signature verified')
      else throw new Error('Req4Att Signature mismatch')
      if (signed.claim.contents !== content)
        throw new Error('Claim content inside Req4Att mismatching')
    }

    const attestation = Attestation.fromRequestAndDid(signed, alice.did)
    const aClaim = AttestedClaim.fromRequestAndAttestation(signed, attestation)
    if (aClaim.verifyData()) console.info('Attested Claim Data verified!')
    else throw new Error('Attested Claim data not verifiable')

    attestation
      .store()
      .then((tx) => alice.authorizeExtrinsic(tx, keystore))
      .then((tx) =>
        BlockchainUtils.signAndSubmitTx(tx, devFaucet, {
          resolveOn: BlockchainUtils.IS_IN_BLOCK,
          reSign: true,
        }).then(
          (aClaim.verify() &&
            console.info('Attested Claim verified with chain.')) ||
            new Error('attested Claim not verifiable with chain')
        )
      )
  })
})
