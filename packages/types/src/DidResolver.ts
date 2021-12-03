/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { DidPublicKey, DidPublicServiceEndpoint } from './DidDocumentExporter'
import type { IDidDetails, DidKey, DidServiceEndpoint } from './DidDetails'

/**
 * DID resolution metadata that includes a subset of the properties defined in the [W3C proposed standard](https://www.w3.org/TR/did-core/#did-resolution).
 */
export type DidResolutionDocumentMetadata = {
  /**
   * If present, it indicates that the resolved by DID should be treated as if it were the DID as specified in this property.
   */
  canonicalId?: IDidDetails['did']
  /**
   * A boolean flag indicating wheather the resolved DID has been deactivated.
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

export interface IDidResolver {
  /**
   * Resolves a DID or DID URI and returns the respective resource.
   *
   * @param didUri A DID string or DID URI (DID + # + fragment) identifying a DID document or DID public key.
   * @returns A promise of a [[IDidResolvedDetails]] object if the didUri is a DID, [[IDidKeyDetails]] or [[IDidServiceEndpoint]]
   * if didUri contains a fragment (i.e., did:kilt:<identifier>#<fragment>) null if a resource cannot be resolved.
   */
  resolve: (
    didUri:
      | IDidDetails['did']
      | DidPublicKey['id']
      | DidPublicServiceEndpoint['id']
  ) => Promise<DidResolvedDetails | DidKey | DidServiceEndpoint | null>
  /**
   * Resolves a DID (or DID URI), returning the full contents of the DID document.
   *
   * @param did A DID string identifying a DID document. If a DID URI is passed, all additional
   * parameters or fragments are ignored.
   * @returns A promise of a [[IDidResolvedDetails]] object representing the DID document or null if the DID
   * cannot be resolved.
   */
  resolveDoc: (did: IDidDetails['did']) => Promise<DidResolvedDetails | null>
  /**
   * Resolves a DID URI identifying a public key associated with a DID.
   *
   * @param didUri A DID URI string (DID string plus fragment) identifying a public key associated
   * with a DID through the DID document.
   * @returns A promise of a [[IDidKeyDetails]] object representing the DID public key or null if
   * the DID or key URI cannot be resolved.
   */
  resolveKey: (didUri: DidPublicKey['id']) => Promise<DidKey | null>
  /**
   * Resolves a DID URI identifying a service endpoint associated with a DID.
   *
   * @param didUri A DID URI string (DID string plus fragment) identifying a service endpoint associated
   * with a DID through the DID document.
   * @returns A promise of a [[IDidServiceEndpoint]] object representing the DID public key or null if
   * the DID or service endpoint URI cannot be resolved.
   */
  resolveServiceEndpoint: (
    didUri: DidPublicServiceEndpoint['id']
  ) => Promise<DidServiceEndpoint | null>
}
