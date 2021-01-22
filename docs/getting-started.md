# Getting Started with the KILT SDK <!-- omit in toc -->

In this simple tutorial we show how you can start developing your own applications on top of the KILT Protocol.
The next examples give you a simple skeleton on how to use the KILT SDK to create identities, CTYPEs and claims, and also how to issue an attestation with the use of our messaging framework.

⚠️ In version [0.19.0](https://github.com/KILTprotocol/sdk-js/releases/tag/0.19.0) we added the privacy feature among other things.
As a result, both the **attestation and the verification can now be done in two different ways: with and without privacy enhancement**.
The privacy enhancement enables zero knowledge proofs of attested claims in which a **claimer reveals nothing about themselves** except for ["public" properties](#611-without-privacy-enhancement) the verifier requests to see (**multi-show unlinkability** and **selective disclosure**).
For more information please check out our [lightning talk at the April 2020 Sub0](https://drive.google.com/file/d/16HHPn1BA5o-W8QCeHfoTI1tNb5yQUZzt/view?usp=sharing) or these [slides](https://speakerdeck.com/weichweich/anonymous-credentials).
_Please note that this is **still experimental** as the used cryptography library is **lacking a security audit**._

# Quick Start Guide <!-- omit in toc -->

- [1. How to install the SDK](#1-how-to-install-the-sdk)
  - [1.1. Prerequisites](#11-prerequisites)
- [2. How to generate an Identity](#2-how-to-generate-an-identity)
- [3. How to build and store a Claim Type (CTYPE)](#3-how-to-build-and-store-a-claim-type-ctype)
  - [3.1. Building a CTYPE](#31-building-a-ctype)
  - [3.2. Storing a CTYPE](#32-storing-a-ctype)
- [4. How to build a Claim](#4-how-to-build-a-claim)
- [5. How to request, create and send an Attestation](#5-how-to-request-create-and-send-an-attestation)
  - [5.1. Without privacy enhancement](#51-without-privacy-enhancement)
    - [5.1.1. Requesting an Attestation](#511-requesting-an-attestation)
    - [5.1.2. Sending an Attestation](#512-sending-an-attestation)
  - [5.2. With privacy enhancement](#52-with-privacy-enhancement)
- [6. Verify a claim](#6-verify-a-claim)
  - [6.1. Request presentation for CTYPE](#61-request-presentation-for-ctype)
    - [6.1.1. Without privacy enhancement](#611-without-privacy-enhancement)
  - [6.2. Verify presentation](#62-verify-presentation)
- [7. Disconnect from chain](#7-disconnect-from-chain)

## 1. How to install the SDK

Install the KILT-SDK by running either of the following commands:

```bash
npm install @kiltprotocol/sdk-js
```

Or (recommended) with `yarn`:

```bash
yarn add @kiltprotocol/sdk-js
```

### 1.1. Prerequisites

1. Make a new directory and navigate into it `mkdir kilt-rocks && cd kilt-rocks`
2. Install the SDK with `yarn add @kiltprotocol/sdk-js`
3. Install typescript with `yarn add typescript`
4. Make a new file. E.g. `touch getting-started.ts`
5. Execute file with `npx ts-node getting-started.ts`

### Note <!-- omit in toc -->

Some calls in this example are made to asynchronous functions. Therefore, you have to wrap your functions inside an `async` function to execute them properly:

```javascript
async function main() {
  await foo()
}
// execute
main()
```

To keep the examples short, we will not wrap each one in an asynchronous function and expect you to do this on your own. Also, the compiler will complain when you try to `await` a promise on the root level - except if you are using TypeScript 3.8+ and configure your _tsconfig.json_ to enable this, [see here](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html#top-level-await). In case you are unsure, please have have a look at our [workshop](https://kiltprotocol.github.io/kilt-workshop-101/#/) where we provide everything ready to be copied and pasted.

💡 At any point, you can **check out our [getting-started.ts](./getting-started.ts) for a working example of the code presented in the following**.

## 2. How to generate an Identity

To generate an Identity first you have to generate a [BIP39 mnemonic](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) and then use it to create the Identity:

```typescript
import Kilt from '@kiltprotocol/sdk-js'

const claimerMnemonic = Kilt.Identity.generateMnemonic()
// mnemonic: coast ugly state lunch repeat step armed goose together pottery bind mention
console.log('claimer mnemonic', claimerMnemonic)
const claimer = Kilt.Identity.buildFromMnemonic(claimerMnemonic)
// claimer.address: 5HXfLqrqbKoKyi61YErwUrWEa1PWxikEojV7PCnLJgxrWd6W
console.log('claimer address', claimer.address)
```

At this point the generated Identity has no tokens. If you want to interact with the blockchain, you will have to get some by [requesting them from our faucet](https://faucet.kilt.io/).

## 3. How to build and store a Claim Type (CTYPE)

When building a CTYPE, you only need a JSON schema and your public [SS58 address](<https://github.com/paritytech/substrate/wiki/External-Address-Format-(SS58)>) which you automatically receive when generating an identity.

### 3.1. Building a CTYPE

```typescript
import Kilt from '@kiltprotocol/sdk-js'

const ctype = Kilt.CType.fromSchema(
  {
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
  },
  claimer.address
)
```

### 3.2. Storing a CTYPE

Before you can store the CTYPE on the blockchain, you have to connect to it.

```typescript
await Kilt.connect(YOUR_CHAIN_ADDRESS)
```

There are [three types](https://dev.kilt.io/#/?id=source-code-and-deployed-instances) of KILT chains which you can use, each one having a different address:

1. The prod-net: `ws://full-nodes.kilt.io`
2. The dev-net: `ws://full-nodes.devnet.kilt.io`
3. A local node: `ws://127.0.0.1:9944`

In case you go with option #1 or #2, you have to request test money ([prod-net](https://faucet.kilt.io/), [dev-net](https://faucet-devnet.kilt.io/)) **since storing a CTYPE on the chain requires tokens** as transaction fee.
However, **we recommend to start your local node** and use a mnemonic which already has tokens by using our docker image

```
docker run -p 9944:9944 kiltprotocol/mashnet-node:develop ./target/release/mashnet-node --dev --ws-port 9944 --ws-external --rpc-external
```

To store the CTYPE on the blockchain, you have to call:

```typescript
// the account behind this mnemonic already has tokens
const identity = Kilt.Identity.buildFromMnemonic(
  'receive clutch item involve chaos clutch furnace arrest claw isolate okay together'
)
await ctype.store(identity)
```

Please note that the **same CTYPE can only be stored once** on the blockchain.

At the end of the process, the `CType` object should match the Ctype below.
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

## 4. How to build a Claim

To construct a claim, we need to know the structure of the claim that is defined in a CTYPE. Based on the CTYPE, we need to build a basic claim object with the respective fields filled out:

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
  cType:
   '0x5a9d939af9fb5423e3e283f16996438da635de8dc152b13d3a67f01e3d6b0fc0',
  contents: { name: 'Alice', age: 29 },
  owner: '5EvSHoZF23mZS4XKQBLdqMv7a7CRSANJmxn7XDu6hwoiK4Wz' }
```

## 5. How to request, create and send an Attestation

Since the zero knowledge cryptography we are using is still experimental, we will solely focus on attestations without privacy enhancement.

### 5.1. Without privacy enhancement

First, we need to build a request for an attestation, which has to include a claim and the address of the Claimer.
(_Note_ that this object allows much more functionality, however, we do not go into the details here)

#### 5.1.1. Requesting an Attestation

```typescript
import Kilt from '@kiltprotocol/sdk-js'

const requestForAttestation = Kilt.RequestForAttestation.fromClaimAndIdentity(
  claim,
  claimer
)
```

The `requestForAttestation` object looks like this:

```typescript
RequestForAttestation {
  claim: Claim {
    cTypeHash: '0xd8ad043d91d8fdbc382ee0ce33dc96af4ee62ab2d20f7980c49d3e577d80e5f5',
    contents: { name: 'Alice', age: 29 },
    owner: '5HTEzvVT5bQxJTYPiDhRUw4GHarQVs66sFQEpQDUNT6MyoJr'
  },
  claimOwner: {
    nonce: '4ef65c7b-ee10-4068-a53e-f6a1bf8bc5f1',
    hash: '0x251394fa14525606fdfee2d0a352589a413e74256d13472284be01003dcf0b4a'
  },
  cTypeHash: {
    nonce: '26bc33bf-52ef-422f-b321-b82e11e0b207',
    hash: '0xde3adcce5ce51b1f1ffbbede9e35facedd2de4b2781d86164bea212bbc13eaa4'
  },
  legitimations: [],
  delegationId: null,
  claimHashTree: {
    name: {
      nonce: 'a3c8b829-1a55-4e65-b09f-3a7f0b8be1ff',
      hash: '0xf0cd53c91e36d2747d7b911b3a90992dc591315126e076c05cb93ab72ee9f893'
    },
    age: {
      nonce: 'ed6fd1e2-d292-4dbe-b5d4-1147abf73ca4',
      hash: '0x1f029ea4cb82e24e9b1ece1481b526b37a198e2f9279759e17b5b1c2a5c832af'
    }
  },
  rootHash: '0xb672fe6fb46985459ee5efe67f6610056a85b3b4283cc4ead6bf07e9fd1c27e6',
  claimerSignature: '0x0043f4a404ea3930cffa4d74d00aacddf8f4f10c1af281c792d9f0e49153a40cf96f35f18ee2676279a2c96173ee183a2a032c2e30feac1ac9fbc64c535491e306',
}
```

#### 5.1.2. Sending an Attestation

Before we can send the request for an attestation to an Attester, we should first [create an Attester identity like above](#how-to-generate-an-identity).

```typescript
const attesterMnemonic = Kilt.Identity.generateMnemonic()
// mnemonic: coast ugly state lunch repeat step armed goose together pottery bind mention
const attester = Kilt.Identity.buildFromMnemonic(mnemonic)
// attester.address: 5HXfLqrqbKoKyi61YErwUrWEa1PWxikEojV7PCnLJgxrWd6W
```

If the Attester doesn't live on the same machine, we need to send them a message with the request.
KILT contains a simple messaging system and we describe it through the following example.

First, we create the request for an attestation message in which the Claimer automatically encodes the message with the public key of the Attester:

```typescript
import Kilt, {
  IRequestAttestationForClaim,
  MessageBodyType,
} from '@kiltprotocol/sdk-js'

const messageBody: IRequestAttestationForClaim = {
  content: { requestForAttestation },
  type: MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM,
}
const message = new Kilt.Message(
  messageBody,
  claimer,
  attester.getPublicIdentity()
)
```

The complete `message` looks as follows:

```typescript
 Message {
  body: {
    content: { requestForAttestation: [RequestForAttestation] },
    type: 'request-attestation-for-claim'
  },
  createdAt: 1595252779597,
  receiverAddress: '5HTEzvVT5bQxJTYPiDhRUw4GHarQVs66sFQEpQDUNT6MyoJr',
  senderAddress: '5EoUcwSZm4KgtLCN8SBYoXXv5p3b9gKS58tiRbtJidrhMp3b',
  senderBoxPublicKey: '0x9e5869608be42588504aaa4c55cb24c17ad1af38c37f821695a93e74049aa112',
  message: '0xFEED....CAFE',
  nonce: '0xef8fe5c201e96c68579f1da5db5cad09957ad672688f9fdc',
  hash: '0xdadccb267bafc0dd82871fd3698ab8f04390274bc22b811d5231cc226dfd5123',
  signature: '0x0053e357f739887071e8ecc27e8353d46a664e824b207027098822d8ee5b0985f0a931346fdccf8d102507d32bb11a0d57d36e395ac1a061cb5f2f46d12be7e100'
}
```

The message can be encrypted as follows:

```typescript
const encrypted = message.encrypt()
```

The messaging system is transport agnostic.
Therefore, **during decryption** both the **sender identity and the validity of the message are checked automatically**.

```typescript
const decrypted = Kilt.Message.decrypt(encrypted, attester)
```

When decryption completes, you can assume that the sender of message is also the owner.
At this point the Attester has the original request for attestation object:

```typescript
if (decrypted.body.type === MessageBodyType.REQUEST_ATTESTATION_FOR_CLAIM) {
  const extractedRequestForAttestation: IRequestForAttestation =
    decrypted.body.content
}
```

The Attester creates the attestation based on the IRequestForAttestation object she received:

```typescript
const attestation = Kilt.Attestation.fromRequestAndPublicIdentity(
  extractedRequestForAttestation.content.requestForAttestation,
  attester.getPublicIdentity()
)
```

The complete `attestation` object looks as follows:

```typescript
Attestation {
  claimHash: '0x3869eeef85544dc83da1e7065076149af936204db009bfd55dbf9fa1570e70aa',
  cTypeHash: '0xd8ad043d91d8fdbc382ee0ce33dc96af4ee62ab2d20f7980c49d3e577d80e5f5',
  delegationId: null,
  owner: '5HTEzvVT5bQxJTYPiDhRUw4GHarQVs66sFQEpQDUNT6MyoJr',
  revoked: false
}
```

Now the Attester can store the attestation on the blockchain, which also costs tokens:

```typescript
await attestation.store(attester)
```

The request for attestation is fulfilled with the attestation, but it needs to be combined into the `AttestedClaim` object before sending it back to the Claimer:

```typescript
const attestedClaim = new Kilt.AttestedClaim(
  extractedRequestForAttestation,
  attestation
)
```

The complete `attestedClaim` object looks as follows:

```typescript
AttestedClaim {
  request:
   RequestForAttestation {
     claim:
      Claim {
        cType:
         '0x5a9d939af9fb5423e3e283f16996438da635de8dc152b13d3a67f01e3d6b0fc0',
        contents: [Object],
        owner: '5EvSHoZF23mZS4XKQBLdqMv7a7CRSANJmxn7XDu6hwoiK4Wz' },
     ctypeHash:
      { nonce: '1f81c5b4-6765-461f-8748-cc6682ea0dcb',
        hash:
         '0xf209e07c39502db88dbdcbe409b5c13f70204afab7a3dd8fbeafa0e4f46cf694' },
     legitimations: [],
     delegationId: undefined,
     claimHashTree: { name: [Object], age: [Object] },
     hash:
      '0x2b3f7c8b44fb42d0cab1cab63f22ed92841db4ab169f7c7c60aa1ece10eaf5b4',
     claimerSignature:
      '0x3de3b6c245f43533a9f78730dc9f32664098adec5e31ae643f826b2439c00fa18720e1c40dcfde3a99eda74903e5be09303096286ef7659ba312a3b4a807550b' },
  attestation:
   Attestation {
     owner: '5Et4BBKPgfBJSsAmMvHCVd6YH4eaGyo5RWd44W8RPdw14Bi1',
     claimHash:
      '0x2b3f7c8b44fb42d0cab1cab63f22ed92841db4ab169f7c7c60aa1ece10eaf5b4',
     cTypeHash:
      '0x5a9d939af9fb5423e3e283f16996438da635de8dc152b13d3a67f01e3d6b0fc0',
     delegationId: undefined,
     revoked: false } }
```

The Attester has to send the `attestedClaim` object back to the Claimer in the following message:

```typescript
import ISubmitAttestationForClaim from '@kiltprotocol/sdk-js'

const messageBodyBack: ISubmitAttestationForClaim = {
  content: attestedClaim,
  type: MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM,
}
const messageBack = new Message(messageBodyBack, attester, claimer)
```

The complete `messageBack` message then looks as follows:

```typescript
Message {
  body: {
    content: AttestedClaim {
      request: [RequestForAttestation],
      attestation: [Attestation]
    },
    type: 'submit-attestation-for-claim'
  },
  createdAt: 1595254601814,
  receiverAddress: '5DdAxEsEvAzdGTAPjGaQzrWxyYGThpbYzTDFTN6rMZkM88rF',
  senderAddress: '5HTEzvVT5bQxJTYPiDhRUw4GHarQVs66sFQEpQDUNT6MyoJr',
  senderBoxPublicKey: '0x97a9f05a70fe934b365d8b63dea7424b4070d49f64f2baa70e74d984da797d2d',
  message: '0xFEED...CAFE',
  nonce: '0x3073029bda4d7496012d702fa72c9fe45d200304fb2268cf',
  hash: '0x1e584e5e1ceec2aa210faec600b010bde88d9a9b9dd3034367d65fe171f42a22',
  signature: '0x007cd1aebca8c8bc8144f5c740680b1ad5ea50fb1855fb9f9583935bc03414e98cf0f40439f532830f0f63b464e8bb4e476e716fa943bb01c79a652c1e42253307'
}
```

After receiving the message, the Claimer just needs to save it and can use it later for verification:

```typescript
if (messageBack.body.type === MessageBodyType.SUBMIT_ATTESTATION_FOR_CLAIM) {
  const myAttestedClaim = messageBack.body.content
}
```

### 5.2. With privacy enhancement

🚧 WIP

## 6. Verify a claim

As in the attestation, you need a second identity to act as the verifier:

```typescript
const verifier = Kilt.Identity.buildFromMnemonic()
```

Before a claimer sends any data to a verifier, the verifier needs to initiate the verification process by requesting a presentation for a specific CTYPE.
Therefore, the verifier knows which properties are included in the attested claim and can request to see any combination of these publicly (including all of them or none).
This is an **important feature for the privacy of a claimer** as this enables them to only show necessary properties for a specific verification.

When requesting a CTYPE, a **session** object for the verifier is automatically generated.
It prevents replay attacks and will be needed when verifying the attested claim.
Therefore, this session has to be stored by the verifier.

_Note_ that it is possible to verify multiple claims in one verification session.

### 6.1. Request presentation for CTYPE

#### 6.1.1. Without privacy enhancement

```typescript
const { session: verifierSession } = Kilt.Verifier.newRequestBuilder()
  .requestPresentationForCtype({
    ctypeHash: ctype.hash,
    requestUpdatedAfter: new Date(), // request accumulator newer than NOW or the latest available
    properties: ['age', 'name'], // publicly shown to the verifier
  })
  .finalize(
    false, // don't allow privacy enhanced verification
    verifier,
    claimer.getPublicIdentity()
  )
```

Now the claimer can send a message to the verifier including the attested claim:

```typescript
const messageBodyForVerifier: ISubmitClaimsForCTypesClassic = {
  content: [myAttestedClaim],
  type: MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_CLASSIC,
}
const messageForVerifier = new Kilt.Message(
  messageBodyForVerifier,
  claimer,
  verifier.getPublicIdentity()
)
```

### 6.2. Verify presentation

When verifying the claimer's message, the verifier has to use their session which was created during the CTYPE request.
The result will be a boolean and the attested claim(s) which either are copies of the attested claim(s) the claimer sent OR they only show requested properties in case of privacy enhancement.

```typescript
const {
  verified: isValid, // whether the presented attested claim(s) are valid
  claims, // the attested claims (potentially only with requested properties)
} = await Kilt.Verifier.verifyPresentation(messageForVerifier, verifierSession)
```

## 7. Disconnect from chain

Closing the connection to your chain is as simple as connecting to it:

```typescript
await Kilt.disconnect(YOUR_CHAIN_ADDRESS)
```
