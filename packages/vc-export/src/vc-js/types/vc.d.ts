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
  function createPresentation(options: {
    verifiableCredential: JsonLdObj | JsonLdObj[]
    holder: string
    id?: string
  }): JsonLdObj
  function signPresentation(options: {
    presentation: JsonLdObj
    suite: suites.LinkedDataProof | suites.LinkedDataProof[]
    challenge: string
    purpose?: purposes.ProofPurpose
    domain?: string
    documentLoader?: DocumentLoader
  }): Promise<JsonLdObj>
  function verify(options: {
    presentation: JsonLdObj
    suite: suites.LinkedDataProof | suites.LinkedDataProof[]
    unsignedPresentation?: boolean
    presentationPurpose?: purposes.ProofPurpose
    purpose?: purposes.ProofPurpose
    challenge?: string
    controller?: string
    domain?: string
    documentLoader?: DocumentLoader
    checkStatus?: Function
  }): Promise<{
    verified: boolean
    presentationResult: object
    credentialResults: any[]
    error: object
  }>
}
