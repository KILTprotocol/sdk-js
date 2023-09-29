/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { DidUri, DidDocument } from './DidV2.js'

type ResolutionOptions = {
  /*
   * The Media Type of the caller's preferred representation of the DID document. The Media Type MUST be expressed as an ASCII string. The DID resolver implementation SHOULD use this value to determine the representation contained in the returned didDocumentStream if such a representation is supported and available. This property is OPTIONAL for the resolveRepresentation function and MUST NOT be used with the resolve function.
   */
  accept?: string
}

/*
 * This specification defines the following common error values:
 * invalidDid: The DID supplied to the DID resolution function does not conform to valid syntax. (See 3.1 DID Syntax.)
 * notFound: The DID resolver was unable to find the DID document resulting from this resolution request.
 */
type DidResolutionMetadataError = 'invalidDid' | 'notFound'

/*
 * The possible properties within this structure and their possible values are registered in the DID Specification Registries [DID-SPEC-REGISTRIES].
 */
type DidResolutionMetadata = {
  /*
   * The error code from the resolution process. This property is REQUIRED when there is an error in the resolution process. The value of this property MUST be a single keyword ASCII string. The possible property values of this field SHOULD be registered in the DID Specification Registries [DID-SPEC-REGISTRIES].
   */
  error?: DidResolutionMetadataError
}

/*
 * The possible properties within this structure and their possible values SHOULD be registered in the DID Specification Registries [DID-SPEC-REGISTRIES].
 */
type DidDocumentMetadata = {
  /*
   * If a DID has been deactivated, DID document metadata MUST include this property with the boolean value true. If a DID has not been deactivated, this property is OPTIONAL, but if included, MUST have the boolean value false.
   */
  deactivated?: true
  /*
   * DID document metadata MAY include a canonicalId property. If present, the value MUST be a string that conforms to the rules in Section 3.1 DID Syntax. The relationship is a statement that the canonicalId value is logically equivalent to the id property value and that the canonicalId value is defined by the DID method to be the canonical ID for the DID subject in the scope of the containing DID document. A canonicalId value MUST be produced by, and a form of, the same DID method as the id property value. (e.g., did:example:abc == did:example:ABC).
   */
  canonicalId?: DidUri
}

type ResolutionResult = {
  didResolutionMetadata: DidResolutionMetadata
  didDocument?: DidDocument
  didDocumentMetadata: DidDocumentMetadata
}

export interface DidResolver {
  /*
   * The resolve function returns the DID document in its abstract form (a map).
   */
  resolve: (
    /*
     * This is the DID to resolve. This input is REQUIRED and the value MUST be a conformant DID as defined in 3.1 DID Syntax.
     */
    did: DidUri,
    /*
     * A metadata structure containing properties defined in 7.1.1 DID Resolution Options. This input is REQUIRED, but the structure MAY be empty.
     */
    resolutionOptions: ResolutionOptions
  ) => Promise<ResolutionResult>
}
