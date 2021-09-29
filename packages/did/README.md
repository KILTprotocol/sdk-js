[![](https://user-images.githubusercontent.com/39338561/122415864-8d6a7c00-cf88-11eb-846f-a98a936f88da.png)
](https://kilt.io)

![Lint and Test](https://github.com/KILTprotocol/sdk-js/workflows/Lint%20and%20Test/badge.svg)

# Kilt DIDs

A KILT Decentralised Identifier (DID) is a string uniquely identifying each KILT user. A DID can be thought of as a container of different keys that are all under the control of the same DID subject (see the [DID Core spec](https://www.w3.org/TR/did-core/) for more information).

The simplest type of KILT DID is a **light DID**, called this way because it can be generated and used offline without requiring any Internet connection (hence any connection with the KILT blockchain at all). Although very cheap, light DIDs are not very flexible and are suitable for lower-security use cases. In more complex use cases, a **full DID** is more indicated, which allows the subject to store several different keys (and key types) and replace them over time, with the help of the KILT blockchain.

## Light DIDs

An example of a light KILT DID is the following:

```
did:kilt:light:014sxSYXakw1ZXBymzT9t3Yw91mUaqKST5bFUEjGEpvkTuckar
```

Beyond the standard prefix `did:kilt:`, the `light:` component indicates that this DID is a light DID, hence it can be resolved and utilized offline.

Light DIDs optionally support the specification of an **encryption key** (of one of the supported key types) and **service endpoints**, which are serialised, encoded and added at the end of the DID, like the following:

```
did:kilt:light:014sxSYXakw1ZXBymzT9t3Yw91mUaqKST5bFUEjGEpvkTuckar:omFlomlwdWJsaWNLZXlYID9hc7PRyRlUp+syykH3KrsVZlObWlfqtegO1KRzuo8zZHR5cGV4GHgyNTUxOS14c2Fsc2EyMC1wb2x5MTMwNWFzgaNiaWRlZW1haWxvc2VydmljZUVuZHBvaW50bG15QGVtYWlsLm9yZ2R0eXBlbEVtYWlsU2VydmljZQ==
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

// Generate seed for the authentication key.
// For random mnemonic generation, refer to the `UUID` module of the `@kiltprotocol/utils` package.
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
    type: DemoKeystore.getKeypairTypeForAlg(authenticationKeyPublicDetails.alg),
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
    type: DemoKeystore.getKeypairTypeForAlg(authenticationKeyPublicDetails.alg),
  },
  encryptionKey: {
    publicKey: encryptionKeyPublicDetails.publicKey,
    type: DemoKeystore.getKeypairTypeForAlg(encryptionKeyPublicDetails.alg),
  },
  services: serviceEndpoints,
})

// Will print `did:kilt:light:014sxSYXakw1ZXBymzT9t3Yw91mUaqKST5bFUEjGEpvkTuckar:omFlomlwdWJsaWNLZXlYID9hc7PRyRlUp+syykH3KrsVZlObWlfqtegO1KRzuo8zZHR5cGVmeDI1NTE5YXOBo2JpZGVlbWFpbG9zZXJ2aWNlRW5kcG9pbnRsbXlAZW1haWwub3JnZHR5cGVsRW1haWxTZXJ2aWNl`.
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

The following is an example of how to create and write on blockchain a full DID that specifies only an authentication key.

```typescript
import Keyring from '@polkadot/keyring'

import { BlockchainUtils } from '@kiltprotocol/chain-helpers'
import { init as kiltInit } from '@kiltprotocol/core'
import {
  DefaultResolver,
  DemoKeystore,
  DidUtils,
  FullDidDetails,
  SigningAlgorithms,
} from '@kiltprotocol/did'
import {
  getDeleteDidExtrinsic,
  getSetKeyExtrinsic,
} from '@kiltprotocol/did/src/Did.chain'
import { KeyRelationship } from '@kiltprotocol/types'

// Configure the resolution promise to wait for transactions to be finalized or simply included in a block depending on the environment.
const resolveOn =
  process.env.NODE_ENV === 'production'
    ? BlockchainUtils.IS_FINALIZED
    : BlockchainUtils.IS_IN_BLOCK

// Initialise connection to the public KILT test network.
await kiltInit({ address: 'wss://kilt-peregrine-k8s.kilt.io' })

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
const { extrinsic, did } = await DidUtils.writeDidFromPublicKeys(keystore, {
  [KeyRelationship.authentication]: {
    publicKey: authenticationKeyPublicDetails.publicKey,
    type: DemoKeystore.getKeypairTypeForAlg(authenticationKeyPublicDetails.alg),
  },
})
// Will print `did:kilt:4sxSYXakw1ZXBymzT9t3Yw91mUaqKST5bFUEjGEpvkTuckar`.
console.log(did)

// Submit the DID creation tx to the KILT blockchain after signing it with the KILT account specified.
await BlockchainUtils.signAndSubmitTx(extrinsic, aliceKiltAccount, {
  resolveOn,
})

// Retrieve the newly created DID from the KILT blockchain.
const fullDid = await DefaultResolver.resolveDoc(did)
```

If additional keys and external services are to be specified, then they can be included in the DID create operation.

```typescript
const resolveOn =
  process.env.NODE_ENV === 'production'
    ? BlockchainUtils.IS_FINALIZED
    : BlockchainUtils.IS_IN_BLOCK

await kiltInit({ address: 'wss://kilt-peregrine-k8s.kilt.io' })

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
const { extrinsic, did } = await DidUtils.writeDidFromPublicKeys(
  keystore,
  {
    [KeyRelationship.authentication]: {
      publicKey: authenticationKeyPublicDetails.publicKey,
      type: DemoKeystore.getKeypairTypeForAlg(
        authenticationKeyPublicDetails.alg
      ),
    },
    [KeyRelationship.keyAgreement]: {
      publicKey: encryptionKeyPublicDetails.publicKey,
      type: DemoKeystore.getKeypairTypeForAlg(encryptionKeyPublicDetails.alg),
    },
  },
  serviceEndpoints
)
// Will print `did:kilt:4sxSYXakw1ZXBymzT9t3Yw91mUaqKST5bFUEjGEpvkTuckar`.
console.log(did)

await BlockchainUtils.signAndSubmitTx(extrinsic, aliceKiltAccount, {
  resolveOn,
})

const fullDid = await DefaultResolver.resolveDoc(did)
```

## Updating a full DID

Once anchored on the KILT blockchain, a KILT full DID can be updated by signing the operation with a valid authentication key. For instance, the following snippet shows how to update the authentication key of a full DID and set it to a new sr25519 key.

```typescript
// Generate seed for the new authentication key.
const newAuthenticationKeySeed = '0xabcdeffedcba'

// Ask the keystore to generate a new keypar to use for authentication.
const newAuthenticationKeyPublicDetails = await keystore.generateKeypair({
  seed: newAuthenticationKeySeed,
  alg: SigningAlgorithms.Ed25519,
})

// Create a DID operation to replace the authentication key with the new one generated.
const didUpdateExtrinsic = await getSetKeyExtrinsic(
  KeyRelationship.authentication,
  {
    publicKey: newAuthenticationKeyPublicDetails.publicKey,
    type: DemoKeystore.getKeypairTypeForAlg(
      newAuthenticationKeyPublicDetails.alg
    ),
  }
)

// Sign the DID operation using the old DID authentication key.
// This results in an unsigned extrinsic that can be then signed and submitted to the KILT blockchain.
const didSignedUpdateExtrinsic = await fullDID.authorizeExtrinsic(
  didUpdateExtrinsic,
  keystore as KeystoreSigner<string>
)

// Submit the DID update tx to the KILT blockchain after signing it with the KILT account specified.
await BlockchainUtils.signAndSubmitTx(
  didSignedUpdateExtrinsic,
  aliceKiltAccount,
  {
    resolveOn,
  }
)
```

## Deleting a full DID

Once not needed anymore, it is recommended to remove the DID details from the KILT blockchain. The following snippet shows how to do it:

```typescript
// Create a DID deletion operation.
const didDeletionExtrinsic = await getDeleteDidExtrinsic()

// Sign the DID deletion operation using the DID authentication key.
// This results in an unsigned extrinsic that can be then signed and submitted to the KILT blockchain.
const didSignedDeletionExtrinsic = await fullDID.authorizeExtrinsic(
  didDeletionExtrinsic,
  keystore as KeystoreSigner<string>
)

await BlockchainUtils.signAndSubmitTx(
  didSignedDeletionExtrinsic,
  aliceKiltAccount,
  {
    resolveOn,
  }
)
```

## Migrating a light DID to a full DID

The **migration** of a DID means that a light, off-chain DID is anchored to the KILT blockchain, supporting all the features that full DIDs provide. In the current version (v1) of the KILT DID protocol, a light DID of the form `did:kilt:light:004sxSYXakw1ZXBymzT9t3Yw91mUaqKST5bFUEjGEpvkTuckar` would become a full DID of the form `did:kilt:4sxSYXakw1ZXBymzT9t3Yw91mUaqKST5bFUEjGEpvkTuckar`. Note that the identifier of the two DIDs, apart from the initial `00` sequence of the light DID, are equal since both DIDs are derived from the same KILT account.

Once a light DID is migrated, all the attested claims (i.e., attestations) generated using that light DID can only be presented using the migrated on-chain DID. This is by design, as it is assumed that the user had valid reasons to migrate the DID on chain, and as on-chain DIDs offer greater security guarantees, KILT will reject light DID signatures for presentations even in case the original claim in the attestation was generated with that off-chain DID.

The following code shows how to migrate a light DID to a full DID. Attested claim presentations and verifications remain unchanged as adding support for DID migration does not affect the public API that the SDK exposes.

```typescript
const resolveOn =
  process.env.NODE_ENV === 'production'
    ? BlockchainUtils.IS_FINALIZED
    : BlockchainUtils.IS_IN_BLOCK

await kiltInit({ address: 'wss://kilt-peregrine-k8s.kilt.io' })

const aliceKiltAccount = new Keyring({
  type: 'ed25519',
  ss58Format: 38,
}).createFromUri('//Alice')

const lightDidDetails = new LightDidDetails({
  authenticationKey: {
    publicKey: aliceKiltAccount.publicKey,
    type: DemoKeystore.getKeypairTypeForAlg(aliceKiltAccount.type),
  },
})

// Generate the DID creation extrinsic with the authentication and encryption keys taken from the light DID.
const { extrinsic, did } = await upgradeDid(
  lightDidDetails,
  keystore as KeystoreSigner<string>
)

// The extrinsic can then be submitted as usual.
await BlockchainUtils.signAndSubmitTx(extrinsic, aliceKiltAccount, {
  resolveOn,
})

// The full DID details can then be resolved after it has been stored on the chain.
const fullDidDetails = await resolve(did)
```
