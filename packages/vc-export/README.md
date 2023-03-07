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

## Examples

See [unit tests file](./src/exportToVerifiableCredential.spec.ts) for usage examples.
