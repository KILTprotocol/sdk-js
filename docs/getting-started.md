# Getting Started with the KILT SDK <!-- omit in toc -->

In this simple tutorial we show how you can start developing your own applications on top of the KILT Protocol.
The next examples give you a simple skeleton on how to use the KILT SDK to create identities, CTYPEs and claims, and also how to issue an attestation with the use of our messaging framework.

# Quick Start Guide <!-- omit in toc -->

- [1. Install the SDK](#1-install-the-sdk)
  - [1.1. Prerequisites](#11-prerequisites)
  - [1.2. Connect to a Chain](#11-connect-to-a-chain)
- [2. Generate an Account](#2-generate-an-account)
  - [2.1. Generate a Keystore](#21-generate-a-keystore)
  - [2.2. Generate a light DID for the Claimer](#22-generate-a-light-did-for-the-claimer)
  - [2.3. Generate a full DID for the Attester](#22-generate-a-full-did-for-the-attester)

* [3. Build and store a Claim Type (CTYPE)](#3-build-and-store-a-claim-type-ctype)
  - [3.1. Building a CTYPE](#31-building-a-ctype)
  - [3.2. Storing a CTYPE](#32-storing-a-ctype)
* [4. Build a Claim](#4-build-a-claim)
* [5. Request, create and send an Attestation](#5-request-create-and-send-an-attestation)
  - [5.1. Requesting an Attestation](#51-requesting-an-attestation)
  - [5.2. Sending an Attestation](#52-sending-an-attestation)
* [6. Verify a claim](#6-verify-a-claim)
  - [6.1. Request presentation for CTYPE](#61-request-presentation-for-ctype)
  - [6.2. Verify presentation](#62-verify-presentation)
* [7. Disconnect from chain](#7-disconnect-from-chain)

## 1. Install the SDK

Install the KILT-SDK by running either of the following commands:

```bash
npm install @kiltprotocol/sdk-js
```

Or (recommended) with `yarn`:

```bash
yarn add @kiltprotocol/sdk-js
```

### 1.1. Prerequisites

1. Make a new directory and navigate into it with `mkdir kilt-rocks && cd kilt-rocks`
2. Install the SDK with `yarn add @kiltprotocol/sdk-js`
3. Install typescript with `yarn add typescript`
4. Make a new file, e.g. `touch getting-started.ts`
5. Execute the file with `npx ts-node getting-started.ts`

### Note <!-- omit in toc -->

Some calls in this example are made to asynchronous functions. Therefore, you have to wrap your functions inside an `async` function to execute them properly:

```javascript
async function main() {
  await foo()
}
// execute
main()
```

To keep the examples short, we will not wrap each one in an asynchronous function and expect you to do this on your own. Also, the compiler will complain when you try to `await` a promise on the root level - except if you are using TypeScript 3.8+ and configure your _tsconfig.json_ to enable this (see [the typescript doc](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html#top-level-await) for more).

In case you are unsure, please have a look at our [workshop](https://kiltprotocol.github.io/kilt-workshop-101/#/) where we provide everything ready to be copied and pasted.

💡 At any point, you can **check out our [getting-started.ts](./getting-started.ts) for a working example of the code presented in the following**.

### 1.2 Initializing the KILT SDK

When using the SDK, there are two things you'll always want to do before anything else:

1. Initialize cryptographic dependencies.
   If you don't do this, certain operations like account generation could fail with the notice that "the WASM interface has not been initialized".
2. Set essential configurations, most importantly the endpoint of the KILT node to which you'll want to connect for actions that read or write to blockchain state.
   These operations would throw an error if called before an endpoint has been set.

To keep things simple, we grouped these two steps in a function you can call first thing, before any other code that used the KILT SDK.

```typescript
import * as Kilt from '@kiltprotocol/sdk-js'

await Kilt.init({ address: YOUR_CHAIN_ADDRESS })
```

Again, this is asynchronous, so be sure to wrap this in an `async` function as described above.
Add this line to the `async` functions wrapping the examples below if you run them individually.

### 1.2. Connect to a Chain

Either explicitly:

```typescript
Kilt.config({ address: YOUR_CHAIN_ADDRESS })
await Kilt.connect()
```

Or by setting a default address in the configuration, connecting implicitly.

```typescript
Kilt.config({ address: YOUR_CHAIN_ADDRESS })
```

Note that calling (as described in [1.2](#initializing-the-kilt-sdk))

```typescript
await Kilt.init({ address: YOUR_CHAIN_ADDRESS })
```

initializes the SDK _and_ sets the config, so it is related to the second approach.

There are of KILT chains which you can use, each one having a different address:

1. A local node: `ws://127.0.0.1:9944`
2. The test-net: `wss://peregrine.kilt.io`
3. The dev-net: `wss://kilt-peregrine-stg.kilt.io`
4. The live-net: `wss://spiritnet.kilt.io`

In case you go with option #1, #2 or #3, you have to request test money **since storing a CTYPE on the chain requires tokens and a full did** as transaction fee and deposit.

However, **we recommend to start your local node** and use a mnemonic which already has tokens by using our docker image. Depending on which version of the SDK you are using, you might need to spin up the latest officially released version of the node (working with the latest release of the SDK) or the latest development version of the node (working with the latest development version of the SDK). Either version can be started with the following command by using one between the `latest` and `develop` tag.

**Option #4 is the live network and not recommended to test on as it requires tokens with real value**

```
docker run -p 9944:9944 kiltprotocol/peregrine:{latest,develop} --dev --ws-port 9944 --ws-external --rpc-external --tmp
```

The following account is endowed with funds and can be used to send tokens to other accounts.

```typescript
// Using the keyring to add an account this mnemonic already has tokens
const account = keyring.addFromMnemonic(
  'receive clutch item involve chaos clutch furnace arrest claw isolate okay together',
  // depending on what setup either use ed25519 or sr25519 as key type because this is how the endowed account is set up
  { signingKeyPairType: 'ed25519' }
)
```

## 2. Generate an account and DID

To generate an account first you have to generate a [BIP39 mnemonic](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) and then use it to create the on-chain account and DID:

```typescript
import * as Kilt from '@kiltprotocol/sdk-js'
import { mnemonicGenerate } from '@polkadot/util-crypto'

const keyring = new Kilt.Utils.Keyring.Keyring({
  ss58Format: 38,
  type: 'sr25519',
})
// mnemonic: coast ugly state lunch repeat step armed goose together pottery bind mention
const claimerMnemonic = mnemonicGenerate()

const claimer = keyring.createFromUri(claimerMnemonic)

console.log('claimer address', claimer.address)
```

At this point the generated account has no tokens. If you want to interact with the blockchain, you will have to get some by [requesting them from our faucet](https://faucet.kilt.io/).

### 2.1. Generate a Keystore

To create a light DID, there needs to be a keystore instance that conforms to the [Keystore interface](../types/src/Keystore.ts). For the sake of ease of use, this package includes a [demo keystore](./src/DemoKeystore/DemoKeystore.ts) which can be used to generate key pairs that are kept in memory and disappear at the end of the program execution.

**Using the demo keystore in production is highly discouraged as all the keys are kept in the memory and easily retrievable by malicious actors.**

```typescript
import * as Kilt from '@kiltprotocol/sdk-js'

const keystore = new Kilt.Did.DemoKeystore()

// Signing keypair
const claimerSigningKeypair = await keystore.generateKeypair({
  alg: Kilt.Did.SigningAlgorithms.Ed25519,
  seed: claimerMnemonic,
})

// Encryption keypair
const claimerEncryptionKeypair = await keystore.generateKeypair({
  alg: Kilt.Did.EncryptionAlgorithms.NaclBox,
  seed: claimerMnemonic,
})
```

### 2.2. Generate a light DID for the Claimer

Using the keys from the demo keystore to generate the claimer's light DID.

```typescript
import * as Kilt from '@kiltprotocol/sdk-js'

const claimerLightDid = new Kilt.Did.LightDidDetails({
  authenticationKey: {
    publicKey: claimerSigningKeypair.publicKey,
    type: Kilt.Did.DemoKeystore.getKeypairTypeForAlg(claimerSigningKeypair.alg),
  },
  encryptionKey: {
    publicKey: claimerEncryptionKeypair.publicKey,
    type: Kilt.Did.DemoKeystore.getKeypairTypeForAlg(
      claimerEncryptionKeypair.alg
    ),
  },
})

// Example light DID: `did:kilt:light:014qFxmHnWw5sGMwjskdvMCrASF9Jvu5ggWRTWTK2NNYSLDg56:oWFlomlwdWJsaWNLZXlYIJuIow7rjSdf92qMKYtWV42lF9mctD1nFf8RM24auJhwZHR5cGVmeDI1NTE5`
console.log(claimerLightDid.did)
```

### 2.3 Generate a full DID for the Attester

Before we can send the request for an attestation to an Attester, we should first create an Attester account and a full on-chain DID using the previously generated keyring.. Using the previously generated keyring.

```typescript
import * as Kilt from '@kiltprotocol/sdk-js'
import { mnemonicGenerate } from '@polkadot/util-crypto'

// mnemonic: coast ugly state lunch repeat step armed goose together pottery bind mention
const attesterMnemonic = mnemonicGenerate()

const attester = keyring.createFromUri(attesterMnemonic)

console.log('attester address', attester.address)
```

Providing the attester with funds from the endowed account in order to write transactions on-chain.

```typescript
import * as Kilt from '@kiltprotocol/sdk-js'

const transferAmount = '1000000000000000'
await Kilt.Balance.makeTransfer(attester.address, transferAmount).then((tx) =>
  Kilt.BlockchainUtils.signAndSubmitTx(tx, account, {
    resolveOn: Kilt.BlockchainUtils.IS_FINALIZED,
    reSign: true,
  })
)
```

Then we generate all the keypairs for the attester to construct the attestation, delegation and authentication keys with the keystore. **Note: we are using the same keypairs for the various keys. This is not recommended for production use.**

```typescript
// Signing keypair
const attesterSigningKeypair = await keystore.generateKeypair({
  alg: Kilt.Did.SigningAlgorithms.Ed25519,
  seed: attesterMnemonic,
})

// Encryption keypair
const attesterEncryptionKeypair = await keystore.generateKeypair({
  alg: Kilt.Did.EncryptionAlgorithms.NaclBox,
  seed: attesterMnemonic,
})

const keys: Partial<Record<
  KeyRelationship,
  Did.DidTypes.INewPublicKey<string>
>> = {
  authentication: {
    publicKey: attesterSigningKeypair.publicKey,
    type: Kilt.Did.DemoKeystore.getKeypairTypeForAlg(
      attesterSigningKeypair.alg
    ),
  },
  keyAgreement: {
    publicKey: attesterEncryptionKeypair.publicKey,
    type: Kilt.Did.DemoKeystore.getKeypairTypeForAlg(
      attesterEncryptionKeypair.alg
    ),
  },
  capabilityDelegation: {
    publicKey: attesterSigningKeypair.publicKey,
    type: Kilt.Did.DemoKeystore.getKeypairTypeForAlg(
      attesterSigningKeypair.alg
    ),
  },
  assertionMethod: {
    publicKey: attesterSigningKeypair.publicKey,
    type: Kilt.Did.DemoKeystore.getKeypairTypeForAlg(
      attesterSigningKeypair.alg
    ),
  },
}

const { extrinsic, did } = await Kilt.Did.DidUtils.writeDidFromPublicKeys(
  keystore,
  attester.address,
  keys
)

// The attester must have balance to pay for the transaction to write the newly created full DID on-chain. Submitting the transaction from the extrinsic.

await Kilt.BlockchainUtils.signAndSubmitTx(extrinsic, attester, {
  reSign: true,
  resolveOn: Kilt.BlockchainUtils.IS_FINALIZED,
})

// The resolved full DID
  const attesterFullDid = (await Kilt.Did.resolveDoc(fullDid.did))
    ?.details as IDidDetails

console.log('Full DID', attesterFullDid)

// Example of a full did:
{
  keys: {},
  keyRelationships: {
    authentication: [
      'did:kilt:4siJtc4dYq2gPre8Xj6KJcSjVAdi1gmjctUzjf3AwrtNnhvy#0x49d513f193ca2e6401be6bda48a9cfba479b41f4d8b0b68cb516c1229582f68c',
    ],
    keyAgreement: [
      'did:kilt:4siJtc4dYq2gPre8Xj6KJcSjVAdi1gmjctUzjf3AwrtNnhvy#0xdad1085e0941aa6b67488abfeeb1d16cf3f6e8e8453e89fc57113f9486c4f1a7',
    ],
    assertionMethod: [
      'did:kilt:4siJtc4dYq2gPre8Xj6KJcSjVAdi1gmjctUzjf3AwrtNnhvy#0x3b71b98a6bbb5e7c82d9f0c403fdbc9e87c361a3a55d5b6ebe76e1d2f851eb1d',
    ],
    capabilityDelegation: [
      'did:kilt:4siJtc4dYq2gPre8Xj6KJcSjVAdi1gmjctUzjf3AwrtNnhvy#0xc7fb6237d42aec4a04930c9c45fe9b693681f6514766ef4e804ba57facb8aa2b',
    ],
    none: [],
  },
  didUri: 'did:kilt:4siJtc4dYq2gPre8Xj6KJcSjVAdi1gmjctUzjf3AwrtNnhvy',
  id: '4siJtc4dYq2gPre8Xj6KJcSjVAdi1gmjctUzjf3AwrtNnhvy',
  lastTxIndex: '0x0000000000000002',
}
```

## 3. Build and store a Claim Type (CTYPE)

When building a CTYPE, you only need a JSON schema and your public [SS58 address](<https://github.com/paritytech/substrate/wiki/External-Address-Format-(SS58)>) which you automatically receive when generating an account.

### 3.1. Building a CTYPE

```typescript
import * as Kilt from '@kiltprotocol/sdk-js'

const ctype = Kilt.CType.fromSchema({
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
```

### 3.2. Storing a CTYPE

Before you can store the CTYPE on the blockchain, you have to configure your blockchain address and connect to it.

To store the CTYPE on the blockchain with the attester, you have to call:

```typescript
const tx = await ctype.store()

const authorizedExtrinsic = await attesterFullDid.authorizeExtrinsic(
  tx,
  keystore,
  attester.address
)

// either sign and send in one step
await Kilt.BlockchainUtils.signAndSubmitTx(authorizedExtrinsic, attester)
// signAndSubmitTx can be passed SubscriptionPromise.Options, to control resolve and reject criteria:
await Kilt.BlockchainUtils.signAndSubmitTx(authorizedExtrinsic, attester, {
  resolveOn: Kilt.BlockchainUtils.IS_READY, // resolve once tx is in the tx pool
  rejectOn: Kilt.BlockchainUtils.IS_ERROR, // only reject when IS_ERROR criteria is matched
  timeout: 10_000, // Promise timeout in ms
  tip: 10_000_000, // Amount of Femto-KILT to tip the validator
})

// or step by step
const chain = await Kilt.connect()
const signed = await chain.signTx(attester, authorizedExtrinsic)
await Kilt.BlockchainUtils.submitSignedTx(authorizedExtrinsic)
```

Please note that the **same CTYPE can only be stored once** on the blockchain.

If a transaction fails with an by re-signing recoverable error (e.g. multi device nonce collision),
BlockchainUtils.signAndSubmitTx has the ability to re-sign and re-send the failed tx upt to 2 times, if the appropriate flag is set:

```typescript
await Kilt.BlockchainUtils.signAndSubmitTx(authorizedExtrinsic, account, {
  resolveOn: Kilt.BlockchainUtils.IS_FINALIZED,
  reSign: true,
})
```

At the end of the process, the `CType` object should match the CType below.
This can be saved anywhere, for example on a CTYPE registry service:

```typescript
CType {
  schema: {
    '$schema': 'http://kilt-protocol.org/draft-01/ctype#',
    title: 'Drivers License',
    properties: { name: [Object], age: [Object] },
    type: 'object',
    '$id': 'kilt:ctype:0xd8ad043d91d8fdbc382ee0ce33dc96af4ee62ab2d20f7980c49d3e577d80e5f5'
  },
  owner: null,
  hash: '0xd8ad043d91d8fdbc382ee0ce33dc96af4ee62ab2d20f7980c49d3e577d80e5f5'
}
```

## 4. Build a Claim

To construct a claim, we need to know the structure of the claim that is defined in a CTYPE. Based on the CTYPE, we need to build a basic claim object with the respective fields filled out. In our example, the claim would be:

```typescript
const rawClaim = {
  name: 'Alice',
  age: 29,
}
```

Now we can easily create the KILT compliant claim. We have to include the full CType object, the raw claim object and the address of the owner/creator of the claim in the constructor:

```typescript
const claim = Kilt.Claim.fromCTypeAndClaimContents(
  ctype,
  rawClaim,
  claimer.address
)
```

As a result we get the following KILT claim:

```typescript
Claim {
  cTypeHash: '0xd8ad043d91d8fdbc382ee0ce33dc96af4ee62ab2d20f7980c49d3e577d80e5f5',
  contents: { name: 'Alice', age: 29 },
  owner: '4tJbxxKqYRv3gDvY66BKyKzZheHEH8a27VBiMfeGX2iQrire'
}
```

## 5. Request, create and send an Attestation

First, we need to build a request for an attestation, which has to include a claim and the address of the Claimer.
(_Note_ that this object offers many more functionalities, however, we do not go into the details here).

### 5.1. Requesting an Attestation

```typescript
import * as Kilt from '@kiltprotocol/sdk-js'

const requestForAttestation = Kilt.RequestForAttestation.fromClaimAndaccount(
  claim,
  claimer
)
// The claimer signs the request for attestation with the did
await requestForAttestation.signWithDid(claimerLightDid)
```

The `requestForAttestation` object looks like this:

```typescript
RequestForAttestation {
    claim: Claim {
      cTypeHash: '0x3b53bd9a535164136d2df46d0b7146b17b9821490bc46d4dfac7e06811631803',
      contents: { name: 'Alice', age: 29 },
      owner: 'did:kilt:light:004sJaLoXk5XD2EqXqiiNpy9fKUxgowh9hQCYVs91CPPVxSVVr:oWFlomlwdWJsaWNLZXlYINQuoa9wi7n1fWXMKDA6+QDYyX/t8Fz5vaehLGYTZyl6ZHR5cGVmeDI1NTE5'
    },
    claimHashes: [
      '0x5847086b70b224e6a27952e00ca347005c5032097382a2beb8e83e2b990cd272',
      '0x836739c2acbbb831d5fa2ccd7ed952a005f2dd255cdbfd1669833a9e22ca4f9f',
      '0x9c8a2c70456266d2a2a4207da9f79f8b9a8082a8f4e95a3bbd8b948a198d1c93'
    ],
    claimNonceMap: {
      '0x7ca6424c43f70ce832356513409c2c78a6da7283495949e83acbf13b395033b6': 'aa8d1607-6655-4a20-bdb5-0d3cde151b1b',
      '0x11b4b6f6627c8c5b589ad88be0cec280a04dac5b03608a52ab1b2db09dd27ba7': '3780c8a6-9296-4f7d-bbbc-a634b8513a77',
      '0x77e3da790a5e2dd59c0ddab38ace397e3afc9325e2ce6d17e91b354ba30e27f9': 'ceaa9f13-30f8-4bbb-b389-5f22de7ae7dc'
    },
    legitimations: [],
    delegationId: null,
    rootHash: '0x977628f38de70ba5e70269c287da9185cf727685eb31ff1ca8f3a80208909eb0',
    claimerSignature: {
      signature: '0x102beecf2d1649daa081b45726408a4d82009f045538cc25a0faf60329734b31ff0f93c21173df9f3f6448651bd2c07b8afa97562eb6a8d52adabdf81265ec8b',
      keyId: 'did:kilt:light:004sJaLoXk5XD2EqXqiiNpy9fKUxgowh9hQCYVs91CPPVxSVVr:oWFlomlwdWJsaWNLZXlYINQuoa9wi7n1fWXMKDA6+QDYyX/t8Fz5vaehLGYTZyl6ZHR5cGVmeDI1NTE5#authentication',
      challenge: undefined
    }
  }
```

#### 5.2. Sending an Attestation

If the Attester doesn't live on the same machine, we need to send them a message with the request.
KILT contains a simple messaging system and we describe it through the following example.

First, we create the request for attestation message which the Claimer uses their did and the did of the Attester:

```typescript
import * as Kilt, { MessageBody } from '@kiltprotocol/sdk-js'

const messageBody: MessageBody = {
  content: { requestForAttestation },
  type: Kilt.Message.BodyType.REQUEST_ATTESTATION,
}
const message = new Kilt.Message(
  messageBody,
  claimerLightDid.did,
  attesterFullDid.did
)
```

The complete `message` looks as follows:

```typescript
Message {
  body: {
    content: { requestForAttestation: [RequestForAttestation] },
    type: 'request-attestation'
  },
  createdAt: 1595252779597,
  receiverAddress: '4tEpuncfo6HYdkH8LKg4KJWYSB3mincgdX19VHivk9cxSz3F',
  senderAddress: '4tJbxxKqYRv3gDvY66BKyKzZheHEH8a27VBiMfeGX2iQrire',
  senderBoxPublicKey: '0x04c84fc046c9c783161d9f60a9b884592e58388a99eed2b3824e90951980dd25',
  message: '0xFEED....CAFE',
  nonce: '0x231e9050c63838987c4d956592550fccacf7fd2d065f7e0c',
  hash: '0x60ab82bf615c024ec662b80edbe5f84cb4bcea515fb845c1b0ce21e30d757378',
  signature: '0x01ea1b24e07cc5830764ed3b23631d0d894738384f3ae321d23bcf1501d2893761c92d38fccb8e7269325c03a62e31f36fb3ce23f76de5811a718b73888d2fab89'
}
```

After the message has been created the key agreement of both the claimer and attester must be retrieved in order to encrypt each other's messages using the previously generated DIDs of the claimer and attesters.

```typescript
const claimerEncryptionKey = claimerLightDid.getKeys(
  KeyRelationship.keyAgreement
)[0] as IDidKeyDetails<string>
const attesterEncryptionKey = attesterFullDid.getKeys(
  KeyRelationship.keyAgreement
)[0] as IDidKeyDetails<string>
```

The message can be encrypted with the keystore and keys as follows:

```typescript
const encrypted = message.encrypt(
  claimerEncryptionKey,
  attesterEncryptionKey,
  keystore
)
```

The messaging system is transport agnostic.

```typescript
const decrypted = Kilt.Message.decrypt(encrypted, keystore, {
  senderDetails: claimerLightDid,
  receiverDetails: attesterFullDid,
})
```

As sender account and message validity are also checked during decryption, if the decryption process completes successfully, you can assume that the sender of the message is also the owner of the claim, as the two identites match.
At this point the Attester has the original request for attestation object:

```typescript
if (
  decrypted.body.type === Kilt.Message.BodyType.REQUEST_ATTESTATION
) {
  const extractedRequestForAttestation: IRequestForAttestation =
    decrypted.body.content.requestForAttestation
}
```

The Attester creates the attestation based on the IRequestForAttestation object she received:

```typescript
const attestation = Kilt.Attestation.fromRequestAndDid(
  extractedRequestForAttestation,
  attesterFullDid.did
)
```

The complete `attestation` object looks as follows:

```typescript
Attestation {
    claimHash: '0x977628f38de70ba5e70269c287da9185cf727685eb31ff1ca8f3a80208909eb0',
    cTypeHash: '0x3b53bd9a535164136d2df46d0b7146b17b9821490bc46d4dfac7e06811631803',
    delegationId: null,
    owner: 'did:kilt:4siJtc4dYq2gPre8Xj6KJcSjVAdi1gmjctUzjf3AwrtNnhvy',
    revoked: false
  }
```

Now the Attester must store the attestation on the blockchain, which also costs tokens:

```typescript
const tx = await attestation.store()
const authorizedExtrinsic = attesterFullDid.authorizeExtrinsic(
  tx,
  keystore,
  attester.address
)
await Kilt.BlockchainUtils.signAndSubmitTx(authorizedExtrinsic, attester, {
  resolveOn: Kilt.BlockchainUtils.IS_IN_BLOCK,
  reSign: true,
})
```

The request for attestation is fulfilled with the attestation, but it needs to be combined into the `Credential` object before sending it back to the Claimer:

```typescript
const credential = Kilt.Credential.fromRequestAndAttestation(
  extractedRequestForAttestation,
  attestation
)
```

The complete `credential` object looks as follows:

```typescript
Credential {
  request: RequestForAttestation {
    claim: Claim {
      cTypeHash: '0x3b53bd9a535164136d2df46d0b7146b17b9821490bc46d4dfac7e06811631803',
      contents: [Object],
      owner: 'did:kilt:light:004sJaLoXk5XD2EqXqiiNpy9fKUxgowh9hQCYVs91CPPVxSVVr:oWFlomlwdWJsaWNLZXlYINQuoa9wi7n1fWXMKDA6+QDYyX/t8Fz5vaehLGYTZyl6ZHR5cGVmeDI1NTE5'
    },
    claimHashes: [
      '0x5847086b70b224e6a27952e00ca347005c5032097382a2beb8e83e2b990cd272',
      '0x836739c2acbbb831d5fa2ccd7ed952a005f2dd255cdbfd1669833a9e22ca4f9f',
      '0x9c8a2c70456266d2a2a4207da9f79f8b9a8082a8f4e95a3bbd8b948a198d1c93'
    ],
    claimNonceMap: {
      '0x7ca6424c43f70ce832356513409c2c78a6da7283495949e83acbf13b395033b6': 'aa8d1607-6655-4a20-bdb5-0d3cde151b1b',
      '0x11b4b6f6627c8c5b589ad88be0cec280a04dac5b03608a52ab1b2db09dd27ba7': '3780c8a6-9296-4f7d-bbbc-a634b8513a77',
      '0x77e3da790a5e2dd59c0ddab38ace397e3afc9325e2ce6d17e91b354ba30e27f9': 'ceaa9f13-30f8-4bbb-b389-5f22de7ae7dc'
    },
    legitimations: [],
    delegationId: null,
    rootHash: '0x977628f38de70ba5e70269c287da9185cf727685eb31ff1ca8f3a80208909eb0',
    claimerSignature: {
      signature: '0x102beecf2d1649daa081b45726408a4d82009f045538cc25a0faf60329734b31ff0f93c21173df9f3f6448651bd2c07b8afa97562eb6a8d52adabdf81265ec8b',
      keyId: 'did:kilt:light:004sJaLoXk5XD2EqXqiiNpy9fKUxgowh9hQCYVs91CPPVxSVVr:oWFlomlwdWJsaWNLZXlYINQuoa9wi7n1fWXMKDA6+QDYyX/t8Fz5vaehLGYTZyl6ZHR5cGVmeDI1NTE5#authentication',
      challenge: undefined
    }
  },
  attestation: Attestation {
    claimHash: '0x977628f38de70ba5e70269c287da9185cf727685eb31ff1ca8f3a80208909eb0',
    cTypeHash: '0x3b53bd9a535164136d2df46d0b7146b17b9821490bc46d4dfac7e06811631803',
    delegationId: null,
    owner: 'did:kilt:4siJtc4dYq2gPre8Xj6KJcSjVAdi1gmjctUzjf3AwrtNnhvy',
    revoked: false
  }
}
```

The Attester has to send the `credential` object back to the Claimer in the following message:

```typescript
const messageBodyBack: MessageBody = {
  content: credential,
  type: Kilt.Message.BodyType.SUBMIT_ATTESTATION,
}
const messageBack = new Kilt.Message(
  messageBodyBack,
  attesterFullDid.did,
  claimerLightDid.did
)
```

The complete `messageBack` message then looks as follows:

```typescript
Message {
  body: {
    content: Credential {
      request: [RequestForAttestation],
      attestation: [Attestation]
    },
    type: 'submit-attestation'
  },
  createdAt: 1595254601814,
  receiverAddress: '4tJbxxKqYRv3gDvY66BKyKzZheHEH8a27VBiMfeGX2iQrire',
  senderAddress: '4tEpuncfo6HYdkH8LKg4KJWYSB3mincgdX19VHivk9cxSz3F',
  senderBoxPublicKey: '0x97a9f05a70fe934b365d8b63dea7424b4070d49f64f2baa70e74d984da797d2d',
  message: '0xFEED...CAFE',
  nonce: '0x8f18d3394f4d325106c7b618046f6a8415bff1d5b4d267a8',
  hash: '0x4f4108cf390eda665315cbff7cc21c155ae5895918a8691b04e0c27b803c3bc8',
  signature: '0x01ee177a0ce94603de8958f854d7cec84adc09f6f5ec400e1432dfe6cf69418174b8c841f92664dd7c89818560aafee747e453200dab8a47b39a5fdfa3b4b3d880'
}
```

After receiving the message, the Claimer just needs to save it and use it later for verification:

```typescript
let myCredential: Credential
if (
  messageBack.body.type === Kilt.Message.BodyType.SUBMIT_ATTESTATION
) {
  myCredential = Kilt.Credential.fromCredential({
    ...messageBack.body.content,
    request: requestForAttestation,
  })
}
```

## 6. Verify a Claim

As in the attestation, you need a second account to act as the verifier. The verifier only needs a light DID [see claimer DID](#22-generate-a-light-did-for-the-claimer):

```typescript
const verifierMnemonic = generateMnemonic()
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
```

Before a claimer sends any data to a verifier, the verifier needs to initiate the verification process by requesting a presentation for a specific CTYPE.
Therefore, the verifier knows which properties are included in the credential.
A claimer can also hide selected properties from their credential.
This is an **important feature for the privacy of a claimer** as this enables them to only show necessary properties for a specific verification.

### 6.1. Request presentation for CTYPE

```typescript
const messageBodyForClaimer: MessageBody = {
  type: Kilt.Message.BodyType.REQUEST_CREDENTIAL,
  content: { ctypes: [ctype.hash] },
}
const messageForClaimer = new Kilt.Message(
  messageBodyForClaimer,
  verifierLightDid.did,
  claimerLightDid.did
)
```

Now the claimer can send a message to the verifier including the credential.
They may choose to create a copy and selected properties from it:

```typescript
const copiedCredential = myCredential.createPresentation({
  selectedAttributes: ['name'],
  signer: keystore,
  claimerDid: claimerLightDid,
})

const messageBodyForVerifier: MessageBody = {
  content: [copiedCredential],
  type: Kilt.Message.BodyType.SUBMIT_CREDENTIAL,
}
const messageForVerifier = new Kilt.Message(
  messageBodyForVerifier,
  claimerLightDid.did,
  verifierLightDid.did
)
```

### 6.2. Verify presentation

When verifying the claimer's message, the verifier has to use their session which was created during the CTYPE request.
The result will be a boolean indicating the result of the verification and the credential(s) which are either sent in their entirety OR have been stripped off of the properties that the verifier did not request to verify.

```typescript
if (
  messageForVerifier.body.type ===
  Kilt.Message.BodyType.SUBMIT_CREDENTIAL
) {
  const claims = messageForVerifier.body.content
  const isValid = await Kilt.Credential.fromCredential(claims[0]).verify()
  console.log('Verifcation success?', isValid)
  console.log('Credentials from verifier perspective:\n', claims)
}
```

## 7. Disconnect from chain

Closing the connection to your chain is as simple as connecting to it:

```typescript
await Kilt.disconnect()
```
