declare module '@digitalbazaar/vc' {
  import type {
    DocumentLoader,
    ExpansionMap,
    purposes,
    suites,
  } from 'jsonld-signatures'
  import type { JsonLdObj } from 'jsonld/jsonld-spec'
  const defaultDocumentLoader: DocumentLoader
  function verifyCredential(options: {
    credential: JsonLdObj
    suite?: suites.LinkedDataProof | suites.LinkedDataProof[]
    purpose?: purposes.ProofPurpose
    documentLoader?: DocumentLoader
    expansionMap?: ExpansionMap
    checkStatus?: ({
      credential: VerifiableCredential,
    }) => Promise<{ verified: boolean; error?: unknown }>
  }): Promise<{ verified: boolean; results: unknown[]; error?: Error }>
  function issue(options: {
    credential: JsonLdObj
    suite?: suites.LinkedDataProof | suites.LinkedDataProof[]
    purpose?: purposes.ProofPurpose
    documentLoader?: DocumentLoader
    expansionMap?: ExpansionMap
    compactProof?: boolean
  }): Promise<JsonLdObj>
}
