[![](https://user-images.githubusercontent.com/39338561/122415864-8d6a7c00-cf88-11eb-846f-a98a936f88da.png)
](https://kilt.io)

![Lint and Test](https://github.com/KILTprotocol/sdk-js/workflows/Lint%20and%20Test/badge.svg)

# Kilt DIDs

A KILT Decentralised Identifier (DID) is a string uniquely identifying each KILT user. A DID can be thought of as a container of different keys that are all under the control of the same DID subject (see the [DID Core spec](https://www.w3.org/TR/did-core/) for more information).

The simplest type of KILT DID is a **light DID**, called this way because it can be generated and used offline without requiring any Internet connection (hence any connection with the KILT blockchain at all). Although very cheap, light DIDs are not very flexible and are suitable for lower-security use cases. In more complex use cases, a **full DID** is more indicated, which allows the subject to store several different keys (and key types) and replace them over time, with the help of the KILT blockchain.

## Light DIDs

An example of a light KILT DID is the following:

```
did:kilt:light:104rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e
```

Beyond the standard prefix `did:kilt:`, the `light:` component indicates that this DID is a light DID, hence it can be resolved and utilized offline.

Light DIDs optionally support the specification of an **encryption key** (of one of the supported key types) and **service endpoints**, which are serialised and encoded and added at the end of the DID, like the following:

```
did:kilt:light:10light:oWFzgqNiaWRoc2VydmljZTFkdHlwZWltZXNzYWdpbmdvc2VydmljZUVuZHBvaW50a2V4YW1wbGUuY29to2JpZGhzZXJ2aWNlMmR0eXBlaXRlbGVwaG9uZW9zZXJ2aWNlRW5kcG9pbnRmMTIzMzQ0
```

### Creating a light DID

To create a light DID, there needs to be a keystore instance that conforms to the [Keystore interface](../types/src/Keystore.ts). For the sake of ease of use, this package includes a [demo keystore](./src/DemoKeystore/DemoKeystore.ts) which can be used to generate key pairs that are kept in memory and disappear at the end of the program execution.

> **Using the demo keystore in production is highly discouraged as all the keys are kept in the memory and easily retrievable by malicious actors.**

The following is an example of how to create a light DID after creating an instance of the demo keystore.

```typescript
import {
  DemoKeystore,
  EncryptionAlgorithms,
  LightDidDetails,
  SigningAlgorithms,
} from '@kiltprotocol/did'
import type { IServiceDetails } from '@kiltprotocol/types'

// Instantiate the demo keystore.
const keystore = new DemoKeystore()

// Generate seed for the authentication key/
const authenticationSeed = '0x123456789'

// Ask the keystore to generate a new keypair to use for authentication with the generated seed.
const authenticationKeyPublicDetails = await keystore.generateKeypair({
  alg: SigningAlgorithms.Ed25519,
  seed: authenticationSeed,
})

// Create a light DID from the generated authentication key.
const lightDID = new LightDidDetails({
  authenticationKey: {
    publicKey: authenticationKeyPublicDetails.publicKey,
    type: authenticationKeyPublicDetails.alg,
  },
})
// Will print `did:kilt:light:014sxSYXakw1ZXBymzT9t3Yw91mUaqKST5bFUEjGEpvkTuckar`.
console.log(lightDID.did)
```

For cases in which also an encryption key and some external services need to be added to a light DID:

```typescript
const keystore = new DemoKeystore()

const authenticationSeed = '0x123456789'

const authenticationKeyPublicDetails = await keystore.generateKeypair({
  alg: SigningAlgorithms.Ed25519,
  seed: authenticationSeed,
})

// Generate the seed for the encryption key.
const encryptionSeed = '0x987654321'

// Ask the keystore to generate a new keypair to use for encryption.
const encryptionKeyPublicDetails = await keystore.generateKeypair({
  alg: EncryptionAlgorithms.NaclBox,
  seed: encryptionSeed,
})

// Specify the endpoints the DID wishes to expose to other parties.
const serviceEndpoints: IServiceDetails[] = [
  {
    id: 'email',
    serviceEndpoint: 'my@email.org',
    type: 'EmailService',
  },
]

// Generate the KILT light DID with the information generated.
const lightDID = new LightDidDetails({
  authenticationKey: {
    publicKey: authenticationKeyPublicDetails.publicKey,
    type: authenticationKeyPublicDetails.alg,
  },
  encryptionKey: {
    publicKey: encryptionKeyPublicDetails.publicKey,
    type: encryptionKeyPublicDetails.alg,
  },
  services: serviceEndpoints,
})

// Will print `did:kilt:light:014sxSYXakw1ZXBymzT9t3Yw91mUaqKST5bFUEjGEpvkTuckar:omFlomlwdWJsaWNLZXlYID9hc7PRyRlUp+syykH3KrsVZlObWlfqtegO1KRzuo8zZHR5cGV4GHgyNTUxOS14c2Fsc2EyMC1wb2x5MTMwNWFzgaNiaWRlZW1haWxvc2VydmljZUVuZHBvaW50bG15QGVtYWlsLm9yZ2R0eXBlbEVtYWlsU2VydmljZQ==`.
console.log(lightDID.did)
```

## Full DIDs

As mentioned above, the creation of a full DID requires interaction with the KILT blockchain. Therefore, it is necessary for the DID creation operation to be submitted by a KILT address with enough funds to pay the transaction fees.

By design, DID signatures and Substrate signatures are decoupled, meaning that the encoded and signed DID creation operation can then be signed and submitted by a different KILT account than the DID subject. We think this opens the path for a wider range of use cases in which, for instance, a service provider might be willing to offer a DID-as-a-Service option for its customers.

An example of a full DID is the following:

```
did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e
```

Here, there is no `light:` component, which indicates that the DID is a full DID and that the keys associated with it must not be derived from the DID identifier but must be retrieved from the KILT blockchain.

Beyond an authentication key, and encryption key, and external services, a full DID also supports an **attestation key**, which must be used to write CTypes and attestations on the blockchain, and a **delegation key**, which must be used to write delegations on the blockchain.

### Creating and anchoring a full DID

The following is an example of how to create and write a full DID on chain that specifies only an authentication key.

```typescript
import Keyring from '@polkadot/keyring'

import Kilt from '@kiltprotocol/sdk-js'
import { BlockchainUtils } from '@kiltprotocol/chain-helpers'
import { DemoKeystore, DidUtils, SigningAlgorithms } from '@kiltprotocol/did'
import { KeyRelationship } from '@kiltprotocol/types'

// Initialise connection to a KILT blockchain node.
await Kilt.init({ address: 'ws://127.0.0.1:9944' })

// Generate the KILT account that will submit the DID creation tx to the KILT blockchain.
// It must have enough funds to pay for the tx execution fees.
const aliceKiltAccount = new Keyring({
  type: 'ed25519',
  // KILT has registered the ss58 prefix 38
  ss58Format: 38,
}).createFromUri('//Alice')

// Instantiate the demo keystore.
const keystore = new DemoKeystore()

// Generate seed for the authentication key.
const authenticationSeed = '0x123456789'

// Ask the keystore to generate a new keypar to use for authentication.
const authenticationKeyPublicDetails = await keystore.generateKeypair({
  seed: authenticationSeed,
  alg: SigningAlgorithms.Ed25519,
})

// Generate the DID-signed creation extrinsic.
// The extrinsic is unsigned and contains the DID creation operation signed with the DID authentication key.
const { submittable, did } = await DidUtils.writeDidfromPublicKeys(keystore, {
  [KeyRelationship.authentication]: {
    publicKey: authenticationKeyPublicDetails.publicKey,
    type: authenticationKeyPublicDetails.alg,
  },
})
// Will print `did:kilt:4sxSYXakw1ZXBymzT9t3Yw91mUaqKST5bFUEjGEpvkTuckar`.
console.log(did)

// Submit the DID creation tx to the KILT blockchain after signing it with the KILT account specified.
await BlockchainUtils.signAndSubmitTx(submittable, aliceKiltAccount, {
  resolveOn: BlockchainUtils.IS_IN_BLOCK,
})
```

If additional keys and external services are to be specified, then they can be included in the DID create operation.

```typescript
await Kilt.init({ address: 'ws://127.0.0.1:9944' })

const aliceKiltAccount = new Keyring({
  type: 'ed25519',
  ss58Format: 38,
}).createFromUri('//Alice')

const keystore = new DemoKeystore()

const authenticationSeed = '0x123456789'

const authenticationKeyPublicDetails = await keystore.generateKeypair({
  seed: authenticationSeed,
  alg: SigningAlgorithms.Ed25519,
})

// Generate seed for the encryption key.
const encryptionSeed = '0x987654321'

// Ask the keystore to generate a new keypar to use for encryption.
const encryptionKeyPublicDetails = await keystore.generateKeypair({
  seed: encryptionSeed,
  alg: EncryptionAlgorithms.NaclBox,
})

// Define the set of URLs pointing to the external services exposed by the DID subject.
// All URLs must point to the same resource, which must match the provided hash.
const serviceEndpoints: EndpointData = {
  contentHash: 'external-endpoints-content-hash00',
  contentType: 'application/json',
  urls: [
    'https://myendpoint.io?endpoint_id=my_endpoint',
    'ipfs://Qme7ss3ARVgxv6rXqVPiikMJ8u2NLgmgszg13pYrDKEoiu',
    'ftp://myendpoint.io/endpoints/example.json',
  ],
}

// Generate the DID-signed creation extrinsic with the provided keys and service endpoints.
const { submittable, did } = await DidUtils.writeDidfromPublicKeys(
  keystore,
  {
    [KeyRelationship.authentication]: {
      publicKey: authenticationKeyPublicDetails.publicKey,
      type: authenticationKeyPublicDetails.alg,
    },
    [KeyRelationship.keyAgreement]: {
      publicKey: encryptionKeyPublicDetails.publicKey,
      // The chain-supported type is called differently than the type supported in the keystore
      type: 'x25519',
    },
  },
  serviceEndpoints
)
// Will print `did:kilt:4sxSYXakw1ZXBymzT9t3Yw91mUaqKST5bFUEjGEpvkTuckar`.
console.log(did)

await BlockchainUtils.signAndSubmitTx(submittable, aliceKiltAccount, {
  resolveOn: BlockchainUtils.IS_IN_BLOCK,
})
```

## Migrating a light DID to a full DID

This feature is a work in progress and this section will be updated when it will be added to the SDK.