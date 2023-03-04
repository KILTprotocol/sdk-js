declare module 'jsonld-signatures' {
  import type { JsonLdObj, RemoteDocument, Url } from 'jsonld/jsonld-spec'
  type Proof = JsonLdObj & { type: string }
  interface VerificationResult {
    verified: boolean
    error?: Error
    purposeResult?: { verified: boolean; error?: Error }
    verificationMethod?: { id: string; type: string; controller: DidUri }
  }
  type DocumentLoader = (url: Url) => Promise<RemoteDocument>
  type ExpansionMap = (info: any) => any
  interface Signer {
    sign: ({ data }: { data: Uint8Array }) => Promise<Buffer>
  }
  function verify(
    document: JsonLdObj,
    options: {
      suite: suites.LinkedDataProof | suites.LinkedDataProof[]
      purpose: purposes.ProofPurpose
      documentLoader?: DocumentLoader
      expansionMap?: ExpansionMap
    }
  ): Promise<{ verified: boolean; error?: Error; results: unknown[] }>
  function sign(
    document: JsonLdObj,
    options: {
      suite: suites.LinkedDataProof | suites.LinkedDataProof[]
      purpose: purposes.ProofPurpose
      documentLoader?: DocumentLoader
      expansionMap?: ExpansionMap
    }
  ): Promise<JsonLdObj>
  function extendContextLoader(loader: DocumentLoader): DocumentLoader
  export namespace purposes {
    export class ProofPurpose {
      constructor(
        term: string,
        date?: Date | string | number,
        maxTimestampDelta?: number
      )
      match(
        proof: Proof,
        options: {
          document?: JsonLdObj
          documentLoader?: DocumentLoader
          expansionMap?: ExpansionMap
        }
      ): Promise<boolean>
    }
    export class AssertionProofPurpose extends ProofPurpose {}
  }
  export namespace suites {
    abstract class LinkedDataProof {
      type: string
      constructor(options: { type: string })
      abstract createProof(options: {
        document: JsonLdObj
        purpose?: purposes.ProofPurpose
        documentLoader?: DocumentLoader
        expansionMap?: ExpansionMap
      }): Promise<Proof>
      abstract verifyProof(options: {
        proof: Proof
        document?: JsonLdObj
        purpose?: purposes.ProofPurpose
        documentLoader?: DocumentLoader
        expansionMap?: ExpansionMap
      }): Promise<VerificationResult>
      matchProof(options: {
        proof: Proof
        document?: JsonLdObj
        purpose?: purposes.ProofPurpose
        documentLoader?: DocumentLoader
        expansionMap?: ExpansionMap
      }): Promise<boolean>
    }
  }
}
