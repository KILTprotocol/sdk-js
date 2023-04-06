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
  - `exportICredentialToVc()`: translates an existing `ICredential` object to a `VerifiableCredential` with an embedded proof.
    The resulting VC still verifies against the original attestation record and thus is valid as long as the original credential remains valid (i.e., not revoked).
- `KiltCredentialV1`
  - functions that create a VC of type `KiltCredentialV1` either from claims and other input, or of an existing `ICredential`.
  - a JSON-schema and functions to validate the structure and data model of a `KiltCredentialV1` type VC.
- `KiltAttestationProofV1`
  - functions that verify VCs with a proof type `KiltAttestationProofV1`.
  - functions that help in creating a new `KiltAttestationProofV1` type proof for a `KiltCredentialV1` type VC.
  - functions that produce a `KiltAttestationProofV1` type from an existing `ICredential`.
  - functions that update a `KiltAttestationProofV1` after applying selective disclosure.
- `KiltRevocationStatusV1`
  - a function to check the revocation status of a VC with a `KiltAttestationProofV1`.
  - a function to help create a `credentialStatus` object of type `KiltRevocationStatusV1`.
- `CredentialSchema`
  - a function to validate the disclosed `credentialSubject` properties against the schema of a KILT CType, which is a prescriptive schema detailing fields and their data types.
- `Presentation`
  - Tools for creating and verifying Verifiable Presentations and signing them in the JSON Web Token (JWT) serialization.
- `DidJWT`
  - Tools for signing JWTs using your KILT DID. Used by the `Presentation` tools.
- `vcjs`
  - Various tools needed to integrate KILT VCs & DIDs with the popular `@digitalbazaar/vc` library (formerly known as `vc-js`) and related tool chain (`jsonld-signatures`, `crypto-ld` & `jsonld` libraries), including:
  - A `jsonld-signatures` suite for creating and verifying `KiltAttestationProofV1` type proofs.
    - Addionally, a `ProofPurpose` class to be used in combination with that suite.
  - A `jsonld-signatures` suite for creating and verifying sr25519 linked data signatures.
    - Includes a `Sr25519VerificationKey2020` key class for use with `crypto-ld`.
  - JSON-LD context defintions for all types introduced here.
  - `documentLoader` implementations to load these contexts as well as KILT DID documents and their verification methods.

## Examples

See unit test files for usage examples.

- [Transforing an `ICredential` to a `KiltCredentialV1` with a `KiltAttestationProofV1`](./src/exportToVerifiableCredential.spec.ts)
- [Producing, verifying, and modifying (->selective disclosure) a `KiltAttestationProofV1`](./src/KiltAttestationProofV1.spec.ts)
- [Producing, DID-signing and verifying a Verifiable Presentation](./src/Presentation.spec.ts)
- [Signing and verifying JWTs using your DID keys](./src/DidJwt.spec.ts)
- [Issuing & verifying a `KiltAttestationProofV1` as well as Verifiable Presentations via `@digitalbazaar/vc` & `jsonld-signatures`](./src/vc-js/suites/KiltAttestationProofV1.spec.ts)
- [Signing Linked Data documents using your DIDs Sr25519 keys](./src/vc-js/suites/Sr25519Signature2020.spec.ts)
