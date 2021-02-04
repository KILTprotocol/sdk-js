[![](https://user-images.githubusercontent.com/1248214/57789522-600fcc00-7739-11e9-86d9-73d7032f40fc.png)
](https://kilt.io)

![Lint and Test](https://github.com/KILTprotocol/sdk-js/workflows/Lint%20and%20Test/badge.svg)

Data sovereignty and interoperability


# Verifiable Credentials Compatibility Package

This package helps you to translate KILT credentials to the popular [Verifiable Credential](https://www.w3.org/TR/vc-data-model/) format and structure.
It provides you with tools to export your existing KILT credentials to the widely understood Verifiable Credential, produce Verifiable Presentations from a Verifiable Credential, and to verify the associated proofs.

## Contents

- exporting
    - `fromAttestedClaim()`: translates `AttestedClaim` to `VerifiableCredential`
- presentation utils
    - `makePresentation()`: creates `VerifiablePresentation` ()
    - `removeProperties()`: derives a new `VerifiableCredential` from an existing one with a reduced set of disclosed attributes
- verification utils
    - functions that verify three proof types:
        - claimer's self-signed proof over the credential digest
        - credential digest proof that assures the integrity of disclosed attributes, claimer identity, legitimations and delegations
        - attestation proof that assures the credential is attested by the identity disclosed as the `issuer` and not revoked
    - a function to validate the disclosed claim properties against the schema of a KILT CType, which is a prescriptive schema detailing fields and their data types.

## Examples

### Presenting a KILT `AttestedClaim` as a `VerifiableCredential`

Given we are in possession of an attested KILT claim and the associated KILT identity:

```typescript
import Kilt from '@kiltprotocol/sdk-js'
import type {
  AttestedClaim,
  Identity,
} from '@kiltprotocol/sdk-js'
import VCUtils from '@kiltprotocol/vc-export'

let credential: AttestedClaim;
let identity: Identity;

// turn the KILT credential into a VerifiableCredential
const VC = VCUtils.fromAttestedClaim(credential)

// produce a reduced copy of the VC where only selected attributes are disclosed
const nameOnly = VCUtils.presentation.removeProperties(VC, ['name'])
// or directly produce a VerifiablePresentation, which implicitly performs the step above
const presentation = VCUtils.presentation.makePresentation(VC, ['name'])
```

A verifier can now check the proofs attached to the VerifiableCredential but can only see the disclosed attributes:

```typescript
// Here's an example for verifying the attestation proof
let result;
presentation.verifiableCredential.proof.foreach(proof => {
    if(proof.type === VCUtils.types.KILT_ATTESTED_PROOF_TYPE)
    VCUtils.verification.verifyAttestedProof(proof)
})

if(result && result.verified) {
    console.log(`Name of the crook: ${presentation.verifiableCredential.credentialSubject.name}`) // prints 'Billy The Kid'
    console.log(`Reward: ${presentation.verifiableCredential.credentialSubject.reward}`) // undefined
}
```