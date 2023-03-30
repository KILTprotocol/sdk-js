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
    sign: (data: { data: Uint8Array }) => Promise<Uint8Array>
    id?: string
  }
  interface Verifier {
    verify: (data: {
      data: Uint8Array
      signature: Uint8Array
    }) => Promise<boolean>
    id?: string
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
      expansionMap?: ExpansionMap,
      addSuiteContext?: boolean
    }
  ): Promise<JsonLdObj>
  function extendContextLoader(loader: DocumentLoader): DocumentLoader
  export namespace purposes {
    export class ProofPurpose {
      constructor(options: {
        term: string
        date?: Date | string | number
        maxTimestampDelta?: number
      })
      match<T extends Proof>(
        proof: T,
        options: {
          document?: JsonLdObj
          documentLoader?: DocumentLoader
          expansionMap?: ExpansionMap
        }
      ): Promise<boolean>
      validate<T extends Proof>(
        proof: T,
        options: {
          document?: JsonLdObj
          documentLoader?: DocumentLoader
          expansionMap?: ExpansionMap
        }
      )
    }
    export class AssertionProofPurpose extends ProofPurpose {}
  }
  export namespace suites {
    abstract class LinkedDataProof {
      type: string
      constructor(options: { type: string })
      createProof(options: {
        document: JsonLdObj
        purpose?: purposes.ProofPurpose
        documentLoader?: DocumentLoader
        expansionMap?: ExpansionMap
      }): Promise<Proof>
      verifyProof(options: {
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
    abstract class LinkedDataSignature extends LinkedDataProof {
      public signer?: Signer
      public verifier?: Verifier
      public LDKeyClass: Class
      public key?: LDKeyPair

      constructor(options: {
        type: string
        LDKeyClass: Class
        contextUrl: string
        proof?: Proof
        date?: string | Date
        key?: Object
        signer?: Signer
        verifier?: Verifier
        useNativeCanonize?: boolean
      })
    }
  }
}
