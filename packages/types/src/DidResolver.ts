/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  DidDocument,
  DidVerificationMethod,
  DidUrl,
  Did,
  KeyRelationship,
} from './DidDocument.js'

/**
 * DID resolution metadata that includes a subset of the properties defined in the [W3C proposed standard](https://www.w3.org/TR/did-core/#did-resolution).
 */
export type DidResolutionDocumentMetadata = {
  /**
   * If present, it indicates that the resolved by DID should be treated as if it were the DID as specified in this property.
   */
  canonicalId?: Did
  /**
   * A boolean flag indicating whether the resolved DID has been deactivated.
   */
  deactivated: boolean
}

/**
 * The result of a DID resolution.
 *
 * It includes the DID Document, and optional document resolution metadata.
 */
export type DidResolutionResult = {
  /**
   * The resolved DID document. It is undefined if the DID has been upgraded or deleted.
   */
  document?: DidDocument
  /**
   * The DID resolution metadata.
   */
  metadata: DidResolutionDocumentMetadata
  /**
   * The DID's web3Name, if any.
   */
  web3Name?: string
}

export interface DidResolutionMetadata {
  error?: 'notFound' | 'invalidDid'
  errorMessage?: string
}

/**
 * Object containing the return values of the DID `resolve` function as described by DID specifications (https://www.w3.org/TR/did-core/#did-resolution).
 */
export interface ConformingDidResolutionResult {
  didDocumentMetadata: Partial<DidResolutionDocumentMetadata>
  didResolutionMetadata: DidResolutionMetadata
  didDocument?: Partial<ConformingDidDocument> &
    Pick<ConformingDidDocument, 'id'>
}

export type ResolvedDidKey = Pick<ConformingDidKey, 'id' | 'controller'> &
  Pick<DidKey, 'publicKey' | 'type' | 'includedAt'>

export type ResolvedDidServiceEndpoint = ConformingDidServiceEndpoint

/**
 * Resolves a DID URI, returning the full contents of the DID document.
 *
 * @param did A DID URI identifying a DID document. All additional parameters and fragments are ignored.
 * @returns A promise of a [[DidResolutionResult]] object representing the DID document or null if the DID
 * cannot be resolved.
 */
export type DidResolve = (did: Did) => Promise<DidResolutionResult | null>

/**
 * Resolves a DID URI identifying a public key associated with a DID.
 *
 * @param didUri A DID URI identifying a public key associated with a DID through the DID document.
 * @returns A promise of a [[ResolvedDidKey]] object representing the DID public key or null if
 * the DID or key URI cannot be resolved.
 */
export type DidResolveKey = (
  didUri: DidResourceUri,
  expectedVerificationMethod?: KeyRelationship
) => Promise<ResolvedDidKey>
