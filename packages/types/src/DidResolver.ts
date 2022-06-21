/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import {
  DidPublicKey,
  DidPublicServiceEndpoint,
} from './DidDocumentExporter.js'
import type { IDidDetails, DidKey } from './DidDetails.js'

/**
 * DID resolution metadata that includes a subset of the properties defined in the [W3C proposed standard](https://www.w3.org/TR/did-core/#did-resolution).
 */
export type DidResolutionDocumentMetadata = {
  /**
   * If present, it indicates that the resolved by DID should be treated as if it were the DID as specified in this property.
   */
  canonicalId?: IDidDetails['uri']
  /**
   * A boolean flag indicating whether the resolved DID has been deactivated.
   */
  deactivated: boolean
}

/**
 * The result of a DID resolution.
 *
 * It includes the DID details, and optional document resolution metadata.
 */
export type DidResolvedDetails = {
  /**
   * The resolved DID details. It is undefined if the DID has been deleted.
   */
  details?: IDidDetails
  /**
   * The DID resolution metadata.
   */
  metadata: DidResolutionDocumentMetadata
}

export type ResolvedDidKey = Pick<DidPublicKey, 'uri' | 'controller'> &
  Pick<DidKey, 'publicKey' | 'type' | 'includedAt'>

export type ResolvedDidServiceEndpoint = DidPublicServiceEndpoint

export interface IDidResolver {
  /**
   * Resolves a DID URI and returns the respective resource.
   *
   * @param didUri A DID URI (with optional fragment) identifying a DID document, public key, or service endpoint.
   * @returns A promise of a [[DidResolvedDetails]] object if the didUri contains no fragment, [[ResolvedDidKey]] or [[ResolvedDidServiceEndpoint]] otherwise. Null if a resource cannot be resolved.
   */
  resolve: (
    didUri:
      | IDidDetails['uri']
      | DidPublicKey['uri']
      | DidPublicServiceEndpoint['uri']
  ) => Promise<
    DidResolvedDetails | ResolvedDidKey | ResolvedDidServiceEndpoint | null
  >
  /**
   * Resolves a DID URI, returning the full contents of the DID document.
   *
   * @param did A DID URI identifying a DID document. All additional parameters and fragments are ignored.
   * @returns A promise of a [[DidResolvedDetails]] object representing the DID document or null if the DID
   * cannot be resolved.
   */
  resolveDoc: (did: IDidDetails['uri']) => Promise<DidResolvedDetails | null>
  /**
   * Resolves a DID URI identifying a public key associated with a DID.
   *
   * @param didUri A DID URI identifying a public key associated with a DID through the DID document.
   * @returns A promise of a [[ResolvedDidKey]] object representing the DID public key or null if
   * the DID or key URI cannot be resolved.
   */
  resolveKey: (didUri: DidPublicKey['uri']) => Promise<ResolvedDidKey | null>
  /**
   * Resolves a DID URI identifying a service endpoint associated with a DID.
   *
   * @param didUri A DID URI identifying a service endpoint associated with a DID through the DID document.
   * @returns A promise of a [[ResolvedDidServiceEndpoint]] object representing the DID public key or null if
   * the DID or service endpoint URI cannot be resolved.
   */
  resolveServiceEndpoint: (
    didUri: DidPublicServiceEndpoint['uri']
  ) => Promise<ResolvedDidServiceEndpoint | null>
}
