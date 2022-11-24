[![](https://user-images.githubusercontent.com/39338561/122415864-8d6a7c00-cf88-11eb-846f-a98a936f88da.png)
](https://kilt.io)

![Lint and Test](https://github.com/KILTprotocol/sdk-js/workflows/Lint%20and%20Test/badge.svg)

Data sovereignty and interoperability

# Verifiable Credentials Compatibility Package

This package helps you to translate KILT credentials to the popular [Verifiable Credential](https://www.w3.org/TR/vc-data-model/) format and structure.
It provides you with tools to export your existing KILT credentials to the widely understood Verifiable Credential, produce Verifiable Presentations from a Verifiable Credential, and to verify the associated proofs.

## Installation

NPM:

```
npm install @kiltprotocol/vc-export
```

YARN:

```
yarn add @kiltprotocol/vc-export
```

## Contents

- exporting
  - `fromCredentialAndAttestation()`: translates `Credential` to `VerifiableCredential`
- presentation utils
  - `makePresentation()`: creates `VerifiablePresentation` ()
  - `removeProperties()`: derives a new `VerifiableCredential` from an existing one with a reduced set of disclosed attributes
- verification utils
  - functions that verify three proof types:
    - claimer's self-signed proof over the credential digest
    - credential digest proof that assures the integrity of disclosed attributes, claimer identity, legitimations and delegations
    - attestation proof that assures the credential is attested by the identity disclosed as the `issuer` and not revoked
  - a function to validate the disclosed claim properties against the schema of a KILT CType, which is a prescriptive schema detailing fields and their data types.
- vc-js suites: tooling to integrate KILT VCs with `vc-js` and `jsonld-signatures^5.0.0`
  - `suites`: contains suites to verify the three KILT proof types that secure a KILT VC.
    - `KiltIntegritySuite`: provides integrity protection for essential components of the credential while allowing for blinding of claims relating to the `credentialSubject`.
    - `KiltSignatureSuite`: verifies the signature over the root hash of a KILT credential.
    - `KiltAttestedSuite`: provides lookup functionality to the KILT blockchain to check whether a credential is attested and still valid.
  - `context`: contains a json-ld `@context` definitions for KILT VCs.
  - `documentLoader`: an implementation of the DocumentLoader required to use `vc-js` / `jsonld-signatures` which allows to serve essential `@context` definitions to the json-ld processor, including the `context` included here.

## Examples

### Presenting a KILT `Credential` as a `VerifiableCredential`

Given we are in possession of an attested KILT claim and the associated KILT identity:

```typescript
import { Attestation, ICredential } from '@kiltprotocol/sdk-js'
import * as vcExport from '@kiltprotocol/vc-export'

let credential: ICredential

// fetch the attestion
const api = await kilt.connect('wss://spiritnet.kilt.io/')
const attestation = Attestation.fromChain(
  await api.query.attestation.attestations(credential.rootHash),
  credential.rootHash
)
// turn the KILT credential into a VerifiableCredential
const VC = vcExport.fromCredentialAndAttestation(credential, attestation)

// produce a reduced copy of the VC where only selected attributes are disclosed
const nameOnly = await vcExport.presentation.removeProperties(VC, ['name'])
// or directly produce a VerifiablePresentation, which implicitly performs the step above
const presentation = await vcExport.presentation.makePresentation(VC, ['name'])
```

A verifier can now check the proofs attached to the VerifiableCredential but can only see the disclosed attributes:

```typescript
// Here's an example for verifying the attestation proof
const api = await kilt.connect('wss://spiritnet.kilt.io/')
try {
  presentation.verifiableCredential.proof.foreach((proof) => {
    if (proof.type === vcExport.constants.KILT_ATTESTED_PROOF_TYPE)
      vcExport.verification.verifyAttestedProof(
        presentation.verifiableCredential,
        proof,
        api
      )
  })

  console.log(
    `Name of the crook: ${presentation.verifiableCredential.credentialSubject.name}`
  ) // prints 'Billy The Kid'
  console.log(
    `Reward: ${presentation.verifiableCredential.credentialSubject.reward}`
  ) // undefined
} catch (e) {
  console.error('Failed verification', e)
}
```

### Verifying a KILT VC with `vc-js`

Assuming we have a KILT credential expressed as a VC (`credential`), for example as produced by the example above.

```typescript
import * as kilt from '@kiltprotocol/sdk-js'
import { vcjsSuites, verification } from '@kiltprotocol/vc-export'
import vcjs from 'vc-js'
import jsigs from 'jsonld-signatures'

// 1. set up suites
const { KiltIntegritySuite, KiltSignatureSuite, KiltAttestedSuite } =
  vcjsSuites.suites
const signatureSuite = new KiltSignatureSuite.KiltSignatureSuite()
const integritySuite = new KiltIntegritySuite.KiltDisclosureSuite()
// the KiltAttestedSuite requires a connection object that allows access to the KILT blockchain, which we can obtain via the KILT sdk
const KiltConnection = await kilt.connect('wss://spiritnet.kilt.io/')
const attestedSuite = new KiltAttestedSuite.KiltAttestedSuite({
  KiltConnection,
})

// 2. verify credential schema
const schemaVerified = verification.validateSchema(credential).verified
// unfortunately the VC credentialSchema definition is underspecified in their context - we therefore have to remove it before credential verification
delete credential['credentialSchema']

// 3. obtain default kilt context loader
const { documentLoader } = vcjsSuites

// 4. obtain the `assertionMethod` proof purpose from `jsonld-signatures`
const purpose = new jsigs.purposes.AssertionProofPurpose()

// 5. call vc-js.verifyCredential with suites and context loader
const result = await vcjs.verifyCredential({
  credential,
  suite: [signatureSuite, integritySuite, attestedSuite],
  purpose,
  documentLoader,
})

// 6. make sure all `results` indicate successful verification
const verified = result.results.every((i) => i.verified === true)
```
