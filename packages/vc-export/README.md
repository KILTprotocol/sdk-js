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

For a list of examples and code snippets, please refer to our [official documentation](TODO:).