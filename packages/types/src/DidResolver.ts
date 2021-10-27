/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { IDidServiceEndpoint } from '.'
import type { IDidDetails, IDidKeyDetails } from './DidDetails'

export type IDidResolutionDocumentMetadata = {
  canonicalId: string
}

/**
 * The result of a DID resolution.
 *
 * It includes the DID details, and any optional document metadata as specified in the [W3C standard](https://www.w3.org/TR/did-core/#did-document-metadata).
 */
export type IDidResolvedDetails = {
  details: IDidDetails
  metadata?: IDidResolutionDocumentMetadata
}

export interface IDidResolver {
  /**
   * Resolves a DID or DID URI and returns the respective resource.
   *
   * @param didUri A DID string or DID URI (DID + # + fragment) identifying a DID document or DID
   * public key.
   * @returns A promise of a [[IDidResolvedDetails]] object if the didUri is a DID, or [[IDidKeyDetails]]
   * if didUri contains a fragment (i.e. did:kilt:<identifier>#<fragment>), null
   * if a resource cannot be resolved.
   */
  resolve: (
    didUri: string
  ) => Promise<
    IDidResolvedDetails | IDidKeyDetails | IDidServiceEndpoint | null
  >
  /**
   * Resolves a DID (or DID URI), returning the full contents of the DID document.
   *
   * @param did A DID string identifying a DID document. If a DID URI is passed, all additional
   * parameters or fragments are ignored.
   * @returns A promise of a [[IDidResolvedDetails]] object representing the DID document or null if the DID
   * cannot be resolved.
   */
  resolveDoc: (did: string) => Promise<IDidResolvedDetails | null>
  /**
   * Resolves a DID URI identifying a public key associated with a DID.
   *
   * @param didUri A DID URI string (DID string plus fragment) identifying a public key associated
   * with a DID through the DID document.
   * @returns A promise of a [[IDidKeyDetails]] object representing the DID public key or null if
   * the DID or key URI cannot be resolved.
   */
  resolveKey: (didUri: string) => Promise<IDidKeyDetails | null>
  /**
   * Resolves a DID URI identifying a service endpoint associated with a DID.
   *
   * @param didUri A DID URI string (DID string plus fragment) identifying a service endpoint associated
   * with a DID through the DID document.
   * @returns A promise of a [[IDidServiceEndpoint]] object representing the DID public key or null if
   * the DID or service endpoint URI cannot be resolved.
   */
  resolveServiceEndpoint: (
    didUri: string
  ) => Promise<IDidServiceEndpoint | null>
}
