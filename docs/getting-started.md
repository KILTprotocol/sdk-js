# Getting Started with the KILT SDK <!-- omit in toc -->

In this simple tutorial we show how you can start developing your own applications on top of the KILT Protocol.
The next examples give you a simple skeleton on how to use the KILT SDK to create identities, CTYPEs and claims, and also how to issue an attestation with the use of our messaging framework.

⚠️ In version [0.19.0](https://github.com/KILTprotocol/sdk-js/releases/tag/0.19.0) we added the privacy feature among other things.
As a result, both the **attestation and the verification can now be done in two different ways: with and without privacy enhancement**.
The privacy enhancement enables zero knowledge proofs of attested claims in which a **claimer reveals nothing about themselves** except for ["public" properties](#611-without-privacy-enhancement) the verifier requests to see (**multi-show unlinkability** and **selective disclosure**).
For more information please check out our [lightning talk at the April 2020 Sub0](https://drive.google.com/file/d/16HHPn1BA5o-W8QCeHfoTI1tNb5yQUZzt/view?usp=sharing) or these [slides](https://speakerdeck.com/weichweich/anonymous-credentials).

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

In version [0.19.0](https://github.com/KILTprotocol/sdk-js/releases/tag/0.19.0) we added the privacy feature among other things. Unfortunately, this made some calls (like creating an identity) asynchronous. Therefore, you have to wrap your functions inside an `async` function to execute them properly:

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
const claimer = await Kilt.Identity.buildFromMnemonic(claimerMnemonic)
// claimer.address: 5HXfLqrqbKoKyi61YErwUrWEa1PWxikEojV7PCnLJgxrWd6W
console.log('claimer address', claimer.getAddress())
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
const identity = await Kilt.Identity.buildFromMnemonic(
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
  claimer.getAddress()
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

First, we need to build a request for an attestation, which has to include a claim and the address of the Claimer.
(_Note_ that this object allows much more functionality, however, we do not go into the details here)

### 5.1. Without privacy enhancement

#### 5.1.1. Requesting an Attestation

```typescript
import Kilt from '@kiltprotocol/sdk-js'

const {
  message: requestForAttestation,
} = await Kilt.RequestForAttestation.fromClaimAndIdentity(claim, claimer)
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
  privacyEnhancement: null
}
```

#### 5.1.2. Sending an Attestation

Before we can send the request for an attestation to an Attester, we should first [create an Attester identity like above](#how-to-generate-an-identity).

```typescript
const attesterMnemonic = Kilt.Identity.generateMnemonic()
// mnemonic: coast ugly state lunch repeat step armed goose together pottery bind mention
const attester = await Kilt.Identity.buildFromMnemonic(mnemonic)
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
  message: '0x3299211b4ab4b34fc5a753223349bde368a3ab3a6cc4fb516b90e4516a1958372924500959e8e78c3b7a073fc6474156d9d926651c006c2603e005a07a20b26a9eb811386f703080868237e1b27e03a3f5d0240a3d11fa437089579f587ccd62b3183f3a5b5552ac9a0979cad7bff4aa317f7923d939e6983070ed1a86744d78eac2705cbc91767f21d0e62c005a5e3e98b13ae0d4f25a1580a29aa44f17de0ac708afae6df8eceb1a9921e2e09c7cadd9036b5c47c634af1ddf44f39bd7b6f143d6990bfd0d16fad24316d3d4e9e66910976ddc3fc2ab99bfa5bf83965767173a7e9553d0fa48145cb925b2c61fd4d2f3a3d49c7553ece7f76cbc1f62d5e8746af442720cd00261abf611cd42462536bdc0bfdd27f4e9a40c7a6994cd90105f740d34537c7119fb0a19d1e7ecd7d9054a0868af83bc03a971841b74722e16b48055819c3ab23bb61b75d67a3dd8c9db383ed8c1f21e1db20f66ce96ca74eab571cb1021ef0171746f2e8642efbdf317f29aa4e3dde41dcb9c40ba7e56bd51a4d7a0928a10a8f272ab2651d40acdc25b6513cf67e17f4cbe554224242805df6026e357feaabad80573b3d68450f2c3b7019b52010369eb5a943c63cea8e933ab9dfe8b441fbc2c5c84da11eceb93bc756ffcf7dfed4f3fd4de0b4358b9a551592172832ffe1ebcff33e82c2a12861b91060c754ae70df7bf11463db53d3256335e89aca78934003e65b2e67647fdaedd6335a98d403422442840d071efc48a38708870ea2a9172587c70c4a9c086c25667fa9a0be04cb3f92cacbfbd53811af23fd3465a5e9a85906a628377b5f0620404782056373134799e7a8afb6f505e08c17931f987a1b9686977c4874be827d92f2ec915ba072de3092ddf8bc6140b70e24a0e3662bed23c46a1fbea9d1ed03ed69812f607e153a8ef8c2bc298498ab4c5163c1bd729d56ed72a3d6ffdeced9e5f1ed9242223f421d398386188b1bfdbb2d97495dcd11b327d441ebe4cb3a855ef37bbd8c608c646a215014025203e7b249d4a579b7a65bfa473e300322f24c21f6adfe7298b564e23e35e02f02a97530831e5533368ac55eae19165d768e353ad3063fd06187b4557f5f1e878088cb481e60cc4ccc2723cefcc10ae5c888170911d195f43e8539a4c01b04ca05235d19793fb6c29886e0c3472a47d2365c4a78b2dbddc6e7f446c26e6ae5f2801f8552f8cd76817943e067421341b27de63bc82e69c579fa789df35f2b33266e3847865e360b494ef4053b4dad8975d0cc2fef28409c369ea74c13627235c150e5c9d3a105c0059e9a6ed03be59ba9e2cf9a4dd0e13e081d8ed52dc7aeff4edf59290d373800e379dacbf2b7f82e13cf9a2542e5bf4aa41f11b4173cc35cbcd4cf8a3c74dfb39e53e67df32ae8b1f2177b227e2194a5b9a7d1ee65bf606678338bff6e87c628a5b65539a62397ebc5f7e39f62638535b8d3d6a0c27a4d1a8e97f0577d61c036351333d2cacaee54533b0ca9169d3cb309dad6926b677f654bc0febbc2da3cbc36be6dc5c77b99270189d51259280683b9782180eac1b735fb6b365ad4f9980c890f6e3f4d5b7120b9d2dd845',
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
  message: '0xda500c27065d2d6b32a2814a382fefd2e7508683cbb5d7f8d4091edf2e5b5e849aec4ed7f4c5c437b73a87127de340f3e62a530d6387b513e46d1c39c79bd5f1f08037e46f00167dc0ee91742cd49d61990b61f3e3e91bafad4979a1681d8449e245c66ae608fa6fc36fac5da8d9b36e7bb74f9a7cfd1cfaa16dd423dd4ffa4a699ed5d2c47b49c3ad82d3b4ad611fe2e27c9cef60b5bd4065ceddb8e2efa08cc009f3f48652a3e1ebaf563bb2e827e75de4e622bb9ab4e1f3757ccc11a7cb5a5551db7b2674a3fbe4ccb901671e28cf8edef69d429c25c1e0374e4523ea5ae0d1fd2409b96997918575ac53da5972698944fcbf8183ccad2d38935746f726e800254c62ed838212e3e400bdfd7f1f3a246419b07991804f31cf287dccb008cd62ce84121f3b557f7f4f5022171444ff8c5b8336f64e37055152cd174a098895e75e5db51c013f7c7260d979b818aeeff86d838a36e125b45a0508ecc5fe8e0dee4f97c8356563023371ac3f058a723b4173ce47f97aa2be03a5a99a378cce12379f5ba5cc0300127d4caa15a44c96811f7a133547b8a9778a002797d4b8e2a77640d6314bc98ae9f9907e2258f018f85d584c30f9ad53359cfa6e462c33183b185e129723f2040e32281be0571047a0e3a537da5631cf51f12f9d00295760a54fb75a0032f549d322b05b8653ee1bec00189d2a1b768e1c28189810bede5c5c9b2171d0e1d3afded6c20b5127e59dfa9554fc65688c073603dddeab2f45e96fb232ff115d10b23c4a4a1f69aa55f6a72affb0be3953ee84f5548157f5804173ee3197983f0dcede9892b2f0c2ae034d09191250e4d4890a7a1acadc076674a67772355c5a0f085876d05199eac668bec58f6e5fb51c6880cc5e52412b1f42d70ff7b1cc4fcbb6b80d3ba3c638ce3500a871897c14d45b330bd3a690e47f5b1e18183455ced290d97c66618c26129cb8abdf465826de5dd2d18d069d0fc7ae48a364577b412af065e28541869ace39b5621f7d4fd085ab6c5b88a33154d36323ae8795f308e936476b8d3c05a4a351c2c9bc5f23793573953b71b1dd96051cc0d9465cb5a1d27ba0908f195e6589e2cb8006c7de966750a8559fca5bf4d2856135bad5d4a6ddddd8d80487a3ae85a057307e991f968feb07acc692d9e94757882837008e294bdad0c7c87136791a53c0f9d2e706e32afdd92f02359f13ebf3f3a0ee110bfbe26b2a9a5cc28de6fe263cee422c1a7ac15442ed4569951fe788612e6406f2376bda791c43593e823b4573c6ed2d280b54c0385193431d07b33c95df90d718e3169ed23311e2fbc5aab1038d7f864fb7749ed10aec52411017b9e8bf932197717444f150b5c75095b90b7783595c1060cc12a8b55b3f6acfbbad8d076ec1a55d5d61f98ee95b929e88464f357da24f645d5e664701fac47e3f46ebfd034f8009153a66a63723026d8aa24bda698e055c21d5f2bba653c669aabe4234593eba17f55eea978dca4bacfa4f38298c70c6e87e0597d4bcff9f16ad028e798d448487786ecb985b3ad8a4a4e1901a4456ba0fb072a9327631b614b22d23b45c2c25018b185c75713fcf3a0ab680218d4de6759c5073c811652c2b74a5e8cc71474cf7a86367d21cdea502d8804cea8ba787678b92a211f11a3f1fb7d2bec1933d46962c4e09adfe7086db5da2f6bd347b67d69d2cc381a783aa424de271e469ca38456fa3fb6a9b1321b23780dcc74f28a42b76e1a14915b38c49164627c288088e30faaadc0e6523571e59aea2bfc957a05f3d44a861bda1eacd5fe5c3280ff0d6be649c2171773156cedde2a190c427d313d9b0840ebc9d11854cd8e246edd18d83c739385d6ec677ba7ef2707dd7db9a1b714291caa64e3398120f2278d6e8ad0ed4c656034b33bf57bc5377354adf709df72eb64f2a241a8b0e08681ae6da58e503044c5003f0c59e2821668178',
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

## 6. Verify a claim

As in the attestation, you need a second identity to act as the verifier:

```typescript
const verifier = await Kilt.Identity.buildFromMnemonic()
```

Before a claimer sends any data to a verifier, the verifier needs to initiate the verification process by requesting a presentation for a specific CTYPE.
Therefore, the verifier knows which properties are included in the attested claim and can request to see any combination of these publicly (including all of them or none).
This is an **important feature for the privacy of a claimer** as this enables them to only show necessary properties for a specific verification.
However, a verifier has to **allow privacy enhancement** for this to work.
Otherwise, the verifier will always see all properties of the claim independent of the requested ones.

When requesting a CTYPE, a **session** object for the verifier is automatically generated.
It prevents replay attacks and will be needed when verifying the attested claim.
Therefore, this session has to be stored by the verifier.

_Note_ that it is possible to verify multiple claims in one verification session.

### 6.1. Request presentation for CTYPE

#### 6.1.1. Without privacy enhancement

```typescript
const { session: verifierSession } = await Kilt.Verifier.newRequestBuilder()
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
const messageBodyForVerifier: ISubmitClaimsForCTypesPublic = {
  content: [myAttestedClaim],
  type: MessageBodyType.SUBMIT_CLAIMS_FOR_CTYPES_PUBLIC,
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
