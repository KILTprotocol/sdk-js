/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  DidUri,
  DidDocument,
  DidResourceUri,
  VerificationMethod,
  Service,
} from './DidDocumentV2'

export type DidResolutionOptions = Record<string, never>

/*
 * This specification defines the following common error values:
 * invalidDid: The DID supplied to the DID resolution function does not conform to valid syntax.
 * notFound: The DID resolver was unable to find the DID document resulting from this resolution request.
 * representationNotSupported: This error code is returned if the representation requested via the accept input metadata property is not supported by the DID method and/or DID resolver implementation.
 */
type DidResolutionMetadataError =
  | 'invalidDid'
  | 'notFound'
  | 'representationNotSupported'

type DidResolutionMetadata = {
  /*
   * The error code from the resolution process.
   * This property is REQUIRED when there is an error in the resolution process.
   * The value of this property MUST be a single keyword ASCII string.
   * The possible property values of this field SHOULD be registered in the DID Specification Registries.
   */
  error?: DidResolutionMetadataError
}

export type DidDocumentMetadata = {
  /*
   * If a DID has been deactivated, DID document metadata MUST include this property with the boolean value true.
   * If a DID has not been deactivated, this property is OPTIONAL, but if included, MUST have the boolean value false.
   */
  deactivated?: true
  /*
   * DID document metadata MAY include a canonicalId property.
   * If present, the value MUST be a string that conforms to the rules in Section 3.1 DID Syntax.
   * The relationship is a statement that the canonicalId value is logically equivalent to the id property value and that the canonicalId value is defined by the DID method to be the canonical ID for the DID subject in the scope of the containing DID document.
   * A canonicalId value MUST be produced by, and a form of, the same DID method as the id property value. (e.g., did:example:abc == did:example:ABC).
   */
  canonicalId?: DidUri
}

export type ResolutionResult = {
  /*
   * A metadata structure consisting of values relating to the results of the DID resolution process which typically changes between invocations of the resolve and resolveRepresentation functions, as it represents data about the resolution process itself.
   * This structure is REQUIRED, and in the case of an error in the resolution process, this MUST NOT be empty.
   * If resolveRepresentation was called, this structure MUST contain a contentType property containing the Media Type of the representation found in the didDocumentStream.
   * If the resolution is not successful, this structure MUST contain an error property describing the error.
   * The possible properties within this structure and their possible values are registered in the DID Specification Registries.
   */
  didResolutionMetadata: DidResolutionMetadata
  /*
   * If the resolution is successful, and if the resolve function was called, this MUST be a DID document abstract data model (a map) as described in 4. Data Model that is capable of being transformed into a conforming DID Document (representation), using the production rules specified by the representation.
   * The value of id in the resolved DID document MUST match the DID that was resolved.
   * If the resolution is unsuccessful, this value MUST be empty.
   */
  didDocument?: DidDocument
  /*
   * If the resolution is successful, this MUST be a metadata structure.
   * This structure contains metadata about the DID document contained in the didDocument property.
   * This metadata typically does not change between invocations of the resolve and resolveRepresentation functions unless the DID document changes, as it represents metadata about the DID document.
   * If the resolution is unsuccessful, this output MUST be an empty metadata structure.
   * The possible properties within this structure and their possible values SHOULD be registered in the DID Specification Registries.
   */
  didDocumentMetadata: DidDocumentMetadata
}

export type DereferenceOptions = {
  /*
   * The Media Type that the caller prefers for contentStream.
   * The Media Type MUST be expressed as an ASCII string.
   * The DID URL dereferencing implementation SHOULD use this value to determine the contentType of the representation contained in the returned value if such a representation is supported and available.
   */
  accept?: string
}

/*
 * This specification defines the following common error values:
 * invalidDidUrl: The DID URL supplied to the DID URL dereferencing function does not conform to valid syntax. (See 3.2 DID URL Syntax.)
 * notFound: The DID URL dereferencer was unable to find the contentStream resulting from this dereferencing request.
 */
type DidDereferenceMetadataError = 'invalidDidUrl' | 'notFound'

export type DereferencingMetadata = {
  /*
   * The Media Type of the returned contentStream SHOULD be expressed using this property if dereferencing is successful.
   * The Media Type value MUST be expressed as an ASCII string.
   */
  contentType?: string
  /*
   * The error code from the dereferencing process.
   * This property is REQUIRED when there is an error in the dereferencing process.
   * The value of this property MUST be a single keyword expressed as an ASCII string.
   * The possible property values of this field SHOULD be registered in the DID Specification Registries [DID-SPEC-REGISTRIES].
   */
  error?: DidDereferenceMetadataError
}

export type DereferenceContentStream =
  | DidDocument
  | VerificationMethod
  | Service

export type DereferenceContentMetadata =
  | DidDocumentMetadata
  | Record<string, never>

export type DereferenceResult = {
  /*
   * A metadata structure consisting of values relating to the results of the DID URL dereferencing process.
   * This structure is REQUIRED, and in the case of an error in the dereferencing process, this MUST NOT be empty.
   * Properties defined by this specification are in 7.2.2 DID URL Dereferencing Metadata.
   * If the dereferencing is not successful, this structure MUST contain an error property describing the error.
   */
  dereferencingMetadata: DereferencingMetadata
  /*
   * If the dereferencing function was called and successful, this MUST contain a resource corresponding to the DID URL.
   * The contentStream MAY be a resource such as a DID document that is serializable in one of the conformant representations, a Verification Method, a service, or any other resource format that can be identified via a Media Type and obtained through the resolution process.
   * If the dereferencing is unsuccessful, this value MUST be empty.
   */
  contentStream?: DereferenceContentStream
  /*
   * If the dereferencing is successful, this MUST be a metadata structure, but the structure MAY be empty.
   * This structure contains metadata about the contentStream.
   * If the contentStream is a DID document, this MUST be a didDocumentMetadata structure as described in DID Resolution.
   * If the dereferencing is unsuccessful, this output MUST be an empty metadata structure.
   */
  contentMetadata: DereferenceContentMetadata
}

/*
 * The resolve function returns the DID document in its abstract form (a map).
 */
export interface ResolveDid {
  resolve: (
    /*
     * This is the DID to resolve.
     * This input is REQUIRED and the value MUST be a conformant DID as defined in 3.1 DID Syntax.
     */
    did: DidUri,
    /*
     * A metadata structure containing properties defined in 7.1.1 DID Resolution Options.
     * This input is REQUIRED, but the structure MAY be empty.
     */
    resolutionOptions: DidResolutionOptions
  ) => Promise<ResolutionResult>
}

export interface DereferenceDidUrl {
  dereference: (
    /*
     * A conformant DID URL as a single string.
     * This is the DID URL to dereference.
     * To dereference a DID fragment, the complete DID URL including the DID fragment MUST be used. This input is REQUIRED.
     */
    didUrl: DidUri | DidResourceUri,
    /*
     * A metadata structure consisting of input options to the dereference function in addition to the didUrl itself.
     * Properties defined by this specification are in 7.2.1 DID URL Dereferencing Options.
     * This input is REQUIRED, but the structure MAY be empty.
     */
    dereferenceOptions: DereferenceOptions
  ) => Promise<DereferenceResult>
}

export interface DidResolver extends ResolveDid, DereferenceDidUrl {}
