# Getting Started with the KILT SDK <!-- omit in toc -->

In this simple tutorial we show how you can start developing your own applications on top of the KILT Protocol.
The next examples give you a simple skeleton on how to use the KILT SDK to create DIDs, CTypes, and claims, and also how to issue and verify attestations with the use of our messaging framework.

# Quick Start Guide <!-- omit in toc -->

- [1. Setup](#1-setup)
  - [1.1 Create a new project](#11-create-a-new-project)
  - [1.2 Connect to a KILT node and set up the crypto](#12-connect-to-a-kilt-node-and-set-up-the-crypto)
  - [1.3 Generate a dev account with KILT tokens (local deployment only)](#13-generate-a-dev-account-with-kilt-tokens-local-deployment-only)
- [2. Create a Claim Type (CType)](#2-create-a-claim-type-ctype)
  - [2.1 Generate an attester KILT account and on-chain DID](#21-generate-an-attester-kilt-account-and-on-chain-did)
  - [2.2 Build a CType](#22-build-a-ctype)
  - [2.3 Store the CType on the KILT blockchain](#23-store-the-ctype-on-the-kilt-blockchain)
- [3. Create a claim and a request for attestation](#3-create-a-claim-and-a-request-for-attestation)
  - [3.1 Generate a claimer light DID](#31-generate-a-claimer-light-did)
  - [3.2 Build a claim](#32-build-a-claim)
  - [3.3 Build a request for attestation](#33-build-a-request-for-attestation)
- [4. Create an attestation](#4-create-an-attestation)
  - [4.1 Build an attestation](#41-build-an-attestation)
  - [4.2 Store the attestation on the KILT blockchain](#42-store-the-attestation-on-the-kilt-blockchain)
- [5. Create and verify a presentation](#5-create-and-verify-a-presentation)
  - [5.1 Generate a verifier light DID](#51-generate-a-verifier-light-did)
  - [5.2 Ask for credentials](#52-ask-for-credentials)
  - [5.3 Build a presentation](#53-build-a-presentation)
  - [5.4 Verify the presentation](#54-verify-the-presentation)
- [6. Teardown](#6-teardown)

## 1. Setup

Before we can run this getting started, there are few steps to run to set up the crypto and the connections required.

### 1.1 Create a new project

First, we need to create a new project in a new directory.
For this, we run `mkdir kilt-rocks && cd kilt-rocks`.

From inside the `kilt-rocks` project directory, install the SDK and typescript with either of the following package managers:

With `yarn` (recommended):

```bash
yarn add @kiltprotocol/sdk-js ts-node typescript
```

With `npm`:

```bash
npm install @kiltprotocol/sdk-js ts-node typescript
```

With all the required dependencies set, just create a new (empty) TS script file with `touch getting-started.ts`.

To run the script at any point during this guide, just run `yarn ts-node getting-started.ts`.

Let's get started 🔥

#### Note <!-- omit in toc -->

Some calls in this example are made to asynchronous functions.
Therefore, functions must be wrapped inside an `async` function to be executed:

```typescript
async function main() {
  await foo()
}
// execute
main()
```

To keep the examples short, we will not wrap each one in an asynchronous function and expect you to do this on your own.
Also, the compiler will complain when you try to `await` a promise on the root level - except if you are using TypeScript 3.8+ and configure your _tsconfig.json_ to enable this (see [the typescript doc](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html#top-level-await) for more).

In case you are unsure, please have a look at our [workshop](https://dev.kilt.io/docs/sdk/workshop/welcome/) where we provide everything ready to be copied and pasted.

💡 At any point, you can **check out our [getting-started.ts](./getting-started.ts) for a working example of the code presented here**.

### 1.2 Connect to a KILT node and set up the crypto

When using the SDK, there are two tasks that must performed before everything else:

1. Initialize cryptographic dependencies.
   If this step is skipped, certain operations such as using some algorithms, e.g., Sr25519, to generate an account could fail with the error "the WASM interface has not been initialized".
2. Set essential configurations, most importantly the address of the KILT node to connect to interact with the KILT blockchain.
   These operations will throw an error if called before a connection with a KILT node has been established.

The SDK exposes the `Kilt.init()` function which takes care of both steps, provided an address of a node to connect to, as shown below.

DID operations require the presence of a keystore object that implements the [Keystore interface](../packages/types/src/Keystore.ts).
For the sake of simplicity, the SDK provides a [demo keystore implementation](../packages/did/src/DemoKeystore/DemoKeystore.ts) which can be used to generate key pairs that are kept unencrypted in memory and disappear at the end of the program execution.

**Using the demo keystore in production is highly discouraged as all the keys are kept in the memory and easily retrievable by malicious actors. For an example on how to write your own keystore, take a look at the [Sporran wallet implementation](https://github.com/BTE-Trusted-Entity/sporran-extension).**

```typescript
import * as Kilt from '@kiltprotocol/sdk-js'

/* Connect to a KILT node */

// Establish a connection with the node specified AND initialize the required crypto libraries.
await Kilt.init({ address: YOUR_CHAIN_ADDRESS })
const { api } =
  await Kilt.ChainHelpers.BlockchainApiConnection.getConnectionOrConnect()

/* Set up the crypto */

// Keyring is required to generate KILT accounts.
const keyring = new Kilt.Utils.Keyring({
  ss58Format: 38,
  type: 'ed25519',
})

// Keystore is required to generate KILT DIDs.
const keystore = new Kilt.Did.DemoKeystore()

console.log(`Connected to KILT endpoint ${YOUR_CHAIN_ADDRESS}`)
```

Again, this is asynchronous, so be sure to wrap this in an `async` function as described above.

There are different instances of KILT chains which can be used:

1. A local node: `ws://127.0.0.1:9944`
2. The test-net: `wss://peregrine.kilt.io/parachain-public-ws`
3. The live-net: `wss://spiritnet.kilt.io`

In the case of option #1, a local node can be set up by using our Docker image, which also contains few dev accounts that are pre-funded and with a known mnemonic:

```
docker run -p 9944:9944 kiltprotocol/peregrine:latest --dev --ws-port 9944 --ws-external --rpc-external
```

In case you go with option #2, you have to request test money for your accounts since **storing DIDs, CTypes and attestations on the chain require tokens** in the form of transaction fee and deposit.
This can be done using the [Peregrine faucet](https://faucet.peregrine.kilt.io).

However, **we recommend to start your local node** and use a mnemonic which already has tokens by using our docker image.
Depending on which version of the SDK you are using, you might need to spin up the latest officially released version of the node, which works with the latest release of the SDK.

**Option #3 is the live network and not recommended to test on as it requires tokens with real value**

### 1.3 Generate a dev account with KILT tokens (local deployment only)

If using a local dev deployment, the following account is endowed with funds and can be used to send tokens to other accounts.

```typescript
const devAccount = keyring.addFromMnemonic(
  'receive clutch item involve chaos clutch furnace arrest claw isolate okay together'
)
```

## 2. Create a Claim Type (CType)

A Claim Type (CType) defines the structure of all credentials that conform to it, and is useful especially for verifiers since they can know, by requesting credentials of a specific CType, what information to expect in those credentials.

### 2.1 Generate an attester KILT account and on-chain DID

Before being used in credentials, CTypes must be stored on the KILT blockchain.
To do so, an on-chain DID is required for the entity willing to write the CType on chain.
In this example, we create a KILT account and an on-chain DID for the attester, which is also going to use the CType to issue a credential later on.

To generate a KILT account for the attester first you have to generate a [BIP39 mnemonic](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) and then use it to create the attester KILT account:

```typescript
import { mnemonicGenerate } from '@polkadot/util-crypto'
import * as Kilt from '@kiltprotocol/sdk-js'

const attesterMnemonic = mnemonicGenerate()
console.log(`Attester mnemonic: ${attesterMnemonic}`)

const attesterAccount = keyring.addFromMnemonic(attesterMnemonic)
console.log(`Attester KILT address: ${attesterAccount.address}`)
```

At this point the generated account has no tokens
If you want to interact with the blockchain, you will have to get them either by transferring them from the dev account generated above, in case of a local deployment, or by requesting them from the [Peregrine faucet](https://faucet.peregrine.kilt.io).

```typescript
/* In case of a local deployment, KILTs can be transferred from the dev account to the newly generated attester account. */
const transferAmount = new BN('10000000000000000')
await Kilt.Balance.getTransferTx(attesterAccount.address, transferAmount).then(
  (tx) =>
    Kilt.BlockchainUtils.signAndSubmitTx(tx, devAccount, {
      resolveOn: Kilt.BlockchainUtils.IS_IN_BLOCK,
      reSign: true,
    })
)
console.log(`Attester address funded!`)
```

Once the attester account has tokens, it can be used to create an on-chain DID for the attester.

```typescript
/* Generate the required keys using the demo keystore. */
const attesterAuthenticationKey: Kilt.NewDidVerificationKey = await keystore
  .generateKeypair({
    alg: Kilt.Did.SigningAlgorithms.Sr25519,
    seed: attesterMnemonic,
  })
  .then((keypair) => {
    return {
      publicKey: keypair.publicKey,
      type: Kilt.Did.DidUtils.getVerificationKeyTypeForSigningAlgorithm(
        keypair.alg
      ),
    }
  })
const attesterEncryptionKey: Kilt.NewDidEncryptionKey = await keystore
  .generateKeypair({
    alg: Kilt.Did.EncryptionAlgorithms.NaclBox,
    seed: attesterMnemonic,
  })
  .then((keypair) => {
    return {
      publicKey: keypair.publicKey,
      type: Kilt.Did.DidUtils.getEncryptionKeyTypeForEncryptionAlgorithm(
        keypair.alg
      ),
    }
  })

/* Create an on-chain DID with the generated keys. */
const attesterFullDid = await new Kilt.Did.FullDidCreationBuilder(
  api,
  attesterAuthenticationKey
)
  .addEncryptionKey(attesterEncryptionKey)
  .setAttestationKey(attesterAuthenticationKey)
  .consumeWithHandler(keystore, devAccount.address, async (tx) => {
    await Kilt.BlockchainUtils.signAndSubmitTx(tx, devAccount, {
      resolveOn: Kilt.BlockchainUtils.IS_IN_BLOCK,
      reSign: true,
    })
  })
console.log(`Attester DID: ${attesterFullDid.did}`)
```

Please note that the attester's DID uses the same key for both authentication and attestation.
**This is not recommended for production use.**

### 2.2 Build a CType

Creating a CType requires specifying its structure as a [JSON schema](https://json-schema.org/) definition.

```typescript
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
console.log('CType: ')
console.log(JSON.stringify(ctype, undefined, 2))
```

### 2.3 Store the CType on the KILT blockchain

With the built CType object, the attester can now create and sign a transaction that writes it on the KILT blockchain.

*Please note that unless using a local deployment, the CType above might already exist on the blockchain, as someone else might have created it. If that is the case, please skip the next step and move straight to section [3: Create a claim and a request for attestation](#3-create-a-claim-and-a-request-for-attestation).*

```typescript
/* The attester signs the ctype creation transaction resulting from calling `ctype.store()` with its DID. */
const attesterAuthorisedCtypeTx = await ctype
  .getStoreTx()
  .then((tx) =>
    attesterFullDid.authorizeExtrinsic(tx, keystore, attesterAccount.address)
  )

/* The resulting transaction is then signed and submitted by the attester KILT account, which has enough funds to pay for the CType creation fees. */
await Kilt.BlockchainUtils.signAndSubmitTx(
  attesterAuthorisedCtypeTx,
  attesterAccount,
  {
    resolveOn: Kilt.BlockchainUtils.IS_IN_BLOCK,
    reSign: true,
  }
)
console.log('CType written on the blockchain!')
```

Please note that the **same CType can only be stored once** on the blockchain.
Since the KILT blockchain only stores the CType hash, the actual CType can be stored anywhere, for example on a CType registry service.

## 3. Create a claim and a request for attestation

With the new CType on chain, a claimer can now ask for credentials that comply with such CType.
Let's dive right in!

### 3.1 Generate a claimer light DID

All KILT core features require DIDs.
For users that do not need to write anything on the blockchain, KILT provides off-chain DIDs.
These DIDs are lightweight versions of their on-chain counterpart, but allow users to obtain credentials and set up encrypted communication channels with other KILT users without the cost of writing any information on the blockchain.

In this case, in order to obtain a claim, the claimer needs a DID.
Since the process does not involve any blockchain write operation, an off-chain DID is sufficient.

```typescript
/* Generate the required keys using the demo keystore. */
const claimerAuthenticationKey: Kilt.Did.NewLightDidAuthenticationKey =
  await keystore
    .generateKeypair({
      alg: Kilt.Did.SigningAlgorithms.Sr25519,
    })
    .then((keypair) => {
      return {
        publicKey: keypair.publicKey,
        type: Kilt.Did.DidUtils.getVerificationKeyTypeForSigningAlgorithm(
          keypair.alg
        ) as Kilt.Did.LightDidSupportedVerificationKeyType,
      }
    })
const claimerEncryptionKey: Kilt.NewDidEncryptionKey = await keystore
  .generateKeypair({
    alg: Kilt.Did.EncryptionAlgorithms.NaclBox,
  })
  .then((keypair) => {
    return {
      publicKey: keypair.publicKey,
      type: Kilt.Did.DidUtils.getEncryptionKeyTypeForEncryptionAlgorithm(
        keypair.alg
      ),
    }
  })

/* Create an off-chain DID with the generated keys. */
const claimerLightDid = Kilt.Did.LightDidDetails.fromDetails({
  authenticationKey: claimerAuthenticationKey,
  encryptionKey: claimerEncryptionKey,
})
console.log(`Claimer DID: ${claimerLightDid.did}`)
```

### 3.2 Build a claim

With a freshly-created DID, the claimer can now build a claim.
Based on the CType, the claimer builds a simple claim object with the respective fields filled out and then generates a KILT claim from it.
In our example, the claim would be:

```typescript
const rawClaim = {
  name: 'Alice',
  age: 29,
}
const claim = Kilt.Claim.fromCTypeAndClaimContents(
  ctype,
  rawClaim,
  claimerLightDid.did
)
console.log('Claim:')
console.log(JSON.stringify(claim, undefined, 2))
```

### 3.3 Build a request for attestation

The claimer then uses the claim to build a request for attestation.
This request is then sent to the attester, who will check the validity of the claim and, in case of successful check, attest it.
_Request for attestations offer many more functionalities. However, we do not go into the details here._

```typescript
const requestForAttestation = Kilt.RequestForAttestation.fromClaim(claim)

/* Request for attestation must be digitally signed by the claimer using its DID. */
await requestForAttestation.signWithDidKey(
  keystore,
  claimerLightDid,
  claimerLightDid.authenticationKey.id
)
console.log('Request for attestation:')
console.log(JSON.stringify(requestForAttestation, undefined, 2))
```

The request for attestation must be sent from the claimer to the attester in a way that no other party can read, as the claim might contain personal information.
The KILT SDK provides a transport-agnostic messaging framework that does just that and uses DIDs for secure end-to-end encrypted communication.

```typescript
/* The claimer creates a message from the request for attestation. */
const requestForAttestationMessage = new Kilt.Message(
  {
    content: { requestForAttestation },
    type: Kilt.Message.BodyType.REQUEST_ATTESTATION,
  },
  claimerLightDid.did,
  attesterFullDid.did
)
console.log('Request for attestation message:')
console.log(JSON.stringify(requestForAttestationMessage, undefined, 2))

/* The message is encrypted for the attester, so that no other user can decrypt it and read its content. */
const encryptedRequestForAttestationMessage =
  await requestForAttestationMessage.encrypt(
    claimerLightDid.encryptionKey!.id,
    claimerLightDid,
    keystore,
    attesterFullDid.assembleKeyId(attesterFullDid.encryptionKey!.id)
  )
```

## 4. Create an attestation

Once the attester receives a request for attestation from a claimer, it will perform some work to verify whether the claims are valid.
If so, it will write an attestation on the KILT blockchain and return the information back to the claimer.

### 4.1 Build an attestation

In this case, the attester decrypts the message received from the claimer and extracts the original request for attestation.

```typescript
const decryptedRequestForAttestationMessage = await Kilt.Message.decrypt(
  encryptedRequestForAttestationMessage,
  keystore,
  attesterFullDid
)
let extractedRequestForAttestation: Kilt.IRequestForAttestation
if (
  decryptedRequestForAttestationMessage.body.type ===
  Kilt.Message.BodyType.REQUEST_ATTESTATION
) {
  extractedRequestForAttestation =
    decryptedRequestForAttestationMessage.body.content.requestForAttestation
} else {
  throw new Error('Invalid request for attestation received.')
}
```

Then, after the attester verifies the validity of the claims in the request for attestation, it builds an attestation.

```typescript
const attestation = Kilt.Attestation.fromRequestAndDid(
  extractedRequestForAttestation,
  attesterFullDid.did
)
console.log('Attestation:')
console.log(JSON.stringify(attestation, undefined, 2))
```

### 4.2 Store the attestation on the KILT blockchain

With the attestation built, the attester can now write the attestation information on the KILT blockchain, and return the attestation information to the claimer using the SDK messaging framework.

```typescript
/* Write the attestation on the blockchain. */
const attesterAuthorisedAttestationTx = await attestation
  .getStoreTx()
  .then((tx) =>
    attesterFullDid.authorizeExtrinsic(tx, keystore, attesterAccount.address)
  )
await Kilt.BlockchainUtils.signAndSubmitTx(
  attesterAuthorisedAttestationTx,
  attesterAccount,
  {
    resolveOn: Kilt.BlockchainUtils.IS_IN_BLOCK,
    reSign: true,
  }
)
console.log('Attestation written on the blockchain!')

/* Build a credential and send it back to the claimer. */
const credential = Kilt.Credential.fromRequestAndAttestation(
  extractedRequestForAttestation,
  attestation
)
console.log('Credential:')
console.log(JSON.stringify(credential, undefined, 2))
```

## 5. Create and verify a presentation

Credentials are worthless if they cannot be verified.
Hence, now enters the picture the verifier: someone who trusts the attester to perform due diligence before issuing credentials.

### 5.1 Generate a verifier light DID

As with the claimer, interacting as a verifier requires a DID.
A verifier typically does not need to write anything on the KILT blockchain, hence they can use a simpler off-chain DID for their needs.

```typescript
/* Generate the required keys using the demo keystore. */
const verifierAuthenticationKey: Kilt.Did.NewLightDidAuthenticationKey =
  await keystore
    .generateKeypair({
      alg: Kilt.Did.SigningAlgorithms.Sr25519,
    })
    .then((keypair) => {
      return {
        publicKey: keypair.publicKey,
        type: Kilt.Did.DidUtils.getVerificationKeyTypeForSigningAlgorithm(
          keypair.alg
        ) as Kilt.Did.LightDidSupportedVerificationKeyType,
      }
    })
const verifierEncryptionKey: Kilt.NewDidEncryptionKey = await keystore
  .generateKeypair({
    alg: Kilt.Did.EncryptionAlgorithms.NaclBox,
  })
  .then((keypair) => {
    return {
      publicKey: keypair.publicKey,
      type: Kilt.Did.DidUtils.getEncryptionKeyTypeForEncryptionAlgorithm(
        keypair.alg
      ),
    }
  })

/* Create an off-chain DID with the generated keys. */
const verifierLightDid = Kilt.Did.LightDidDetails.fromDetails({
  authenticationKey: verifierAuthenticationKey,
  encryptionKey: verifierEncryptionKey,
})
console.log(`Verifier DID: ${verifierLightDid.did}`)
```

### 5.2 Ask for credentials

A verifier usually requires a claimer to fulfil some requirements before providing a specific service.
The verifier needs to initiate the verification process by requesting a presentation for a specific CType.
In this case, the verifier wants to verify the name of the claimer.
To do so, it will send a request for credential message to the claimer.
The request for credential can optionally contain a challenge that will be used by the verifier to ensure that the claimer owns the identity specified in the provided credentials at the time the presentation is generated.

```typescript
const challenge = Kilt.Utils.UUID.generate()
const requestForCredentialMessage = new Kilt.Message(
  {
    type: Kilt.Message.BodyType.REQUEST_CREDENTIAL,
    content: {
      cTypes: [
        { cTypeHash: ctype.hash, trustedAttesters: [attesterFullDid.did] },
      ],
      challenge,
    },
  },
  verifierLightDid.did,
  claimerLightDid.did
)
console.log('Request for credential message:')
console.log(JSON.stringify(requestForCredentialMessage, undefined, 2))
```

### 5.3 Build a presentation

Based on the requirements asked by the verifier, the claimer will choose one or multiple credentials that, combined, cover all such requirements.
A claimer can also hide selected properties from their credential: this is an **important feature for the privacy of a claimer** as this enables them to only show necessary properties for a specific verification.

```typescript
/* Select one or more credentials according to the presentation requirements. */
const selectedCredential = await credential.createPresentation({
  // Hide the `age` property, and only reveal the `name` one.
  selectedAttributes: ['name'],
  signer: keystore,
  claimerDid: claimerLightDid,
  challenge,
})
console.log('Presentation:')
console.log(JSON.stringify(selectedCredential))
```

Once the credentials have been selected and combined, the claimer creates and encrypts a presentation message for the attester.

```typescript
const presentationMessage = new Kilt.Message(
  {
    content: [selectedCredential],
    type: Kilt.Message.BodyType.SUBMIT_CREDENTIAL,
  },
  claimerLightDid.did,
  verifierLightDid.did
)
console.log('Presentation message:')
console.log(JSON.stringify(presentationMessage, undefined, 2))

const encryptedPresentationMessage = await presentationMessage.encrypt(
  claimerLightDid.encryptionKey!.id,
  claimerLightDid,
  keystore,
  verifierLightDid.assembleKeyId(verifierLightDid.encryptionKey!.id)
)
```

### 5.4 Verify the presentation

The attester decrypts the message, extract the presentation within it, and verify its structure and validity.

```typescript
/* Decrypt the presentation message. */
const decryptedPresentationMessage = await Kilt.Message.decrypt(
    encryptedPresentationMessage,
    keystore,
    verifierLightDid
  )
  if (
    decryptedPresentationMessage.body.type ===
    Kilt.Message.BodyType.SUBMIT_CREDENTIAL
  ) {
    /* Verify all credentials in the presentation */
    const credentials = decryptedPresentationMessage.body.content
    const credentialsValidity = await Promise.all(
      credentials.map((cred) => Kilt.Credential.fromCredential(cred).verify())
    )
    console.log(credentialsValidity)
    const isPresentationValid = credentialsValidity.every(
      (isValid) => isValid === true
    )
    console.log(`Presented credential validity status: ${isPresentationValid}`)
    console.log('Credentials from verifier perspective:')
    console.log(JSON.stringify(credentials, undefined, 2))
```

## 6. Teardown

Once we have gone through everything, we close the connection to the KILT node.

```typescript
await Kilt.disconnect()
```
