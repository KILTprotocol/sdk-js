# DID Document exporter

The DID Document exporter provides the functionality needed to convert an instance of a generic `DidDocument` into a document that is compliant with the [W3C specification](https://www.w3.org/TR/did-core/). This component is required for the KILT plugin for the [DIF Universal Resolver](https://dev.uniresolver.io/).

## How to use the exporter

The exporter interface and used types are part of the `@kiltprotocol/types` package, while the actual `DidDocumentExporter` is part of this module. The following shows how to use the exporter to generate a DID Document for both a light and a full DID.

Currently, the exporter supports DID Documents in `application/json` and `application/ld+json` format.

```typescript
import * as Did from '@kiltprotocol/did'

import type { ConformingDidDocument, JsonLDDidDocument } from '@kiltprotocol/types'

// Create `DidDocument` with the required information
const lightDid: DidDocument = Did.createLightDidDocument({ ... })

const lightDidDocument: ConformingDidDocument = Did.exportToDidDocument(lightDid, 'application/json')

// Will print the light DID.
console.log(lightDidDocument.id)

// Will print all the public keys associated with the light DID.
console.log(lightDidDocument.verificationMethod)

// Will print all the assertion keys.
console.log(lightDidDocument.assertionMethod)

// Will print all the encryption keys.
console.log(lightDidDocument.keyAgreement)

// Will print all the delegation keys.
console.log(lightDidDocument.capabilityDelegation)

// Will print all the external services referenced inside the `DidDocument` instance.
console.log(lightDidDocument.service)

// Let's export `DidDocument` using the `application/ld+json` format.

const fullDid = await Did.fetch('...')

// The document type will be a `JsonLDDidDocument`, which extends the simpler `ConformingDidDocument`.
const fullDidDocument: JsonLDDidDocument = Did.exportToDidDocument(fullDid, 'application/ld+json')

// The same properties of `ConformingDidDocument` can be accessed, plus a `@context` property required by the JSON-LD specification.
console.log(fullDidDocument['@context'])
```
