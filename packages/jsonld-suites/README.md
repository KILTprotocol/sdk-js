[![](https://user-images.githubusercontent.com/39338561/122415864-8d6a7c00-cf88-11eb-846f-a98a936f88da.png)
](https://kilt.io)

![Lint and Test](https://github.com/KILTprotocol/sdk-js/workflows/Lint%20and%20Test/badge.svg)

Data sovereignty and interoperability

# Linked Data Proofs Compatibility Package

This package helps integrating KILT credentials with the popular `@digitalbazaar/vc` library (formerly known as `vc-js`) for issuing and verifying Verifiable Credentials and related tool chain (`jsonld-signatures`, `crypto-ld` & `jsonld`).
It provides you with Linked Data Proof suites and documentLoader implementations that act as plugins to these libraries, enhancing them with support for the proof types and DIDs used in KILT credentials.

## Installation

NPM:

```
npm install @kiltprotocol/jsonld-suites
```

YARN:

```
yarn add @kiltprotocol/jsonld-suites
```

## Contents

- `KiltAttestationProofV1`
  - When used as a `suite` in `@digitalbazaar/vc` or `jsonld-signatures`, you can:
    - verify VCs with a proof type `KiltAttestationProofV1`.
    - issue a `KiltAttestationProofV1` type proof for a `KiltCredentialV1` type VC.
    - check the revocation status of a `KiltCredentialV1`.
- `NoProofPurpose`
  - `ProofPurpose` class to be used in combination with the attestation proof suite above.
- `Sr25519Signature2020`
  - A `suite` implementation for creating and verifying sr25519 linked data signatures.
- `Sr25519VerificationKey2020`
  - A key class for use with the above signature suite.
- `contexts`
  - JSON-LD context defintions for all types and fields used by our suites and credentials.
- `defaultDocumentLoader`
  - a `documentLoader` implementation that loads all KILT-specific contexts and credential schemas as well as KILT DID documents and their verification methods.

## Examples

See unit test files for usage examples.

- [Issuing & verifying a `KiltAttestationProofV1` as well as Verifiable Presentations via `@digitalbazaar/vc` & `jsonld-signatures`](./src/suites/KiltAttestationProofV1.spec.ts)
- [Signing Linked Data documents using your DIDs Sr25519 keys](./src/suites/Sr25519Signature2020.spec.ts)
