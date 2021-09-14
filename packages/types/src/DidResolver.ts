/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { IDidDetails, IDidKeyDetails, IServiceDetails } from './DidDetails'

/**
 * A URL resolver for additional service endpoints data associated with a DID. It takes the hash of
 * the resource and a set of URLs which are expected to serve it.
 *
 * @param resourceHash Hex encoding of the digest over the resource as it is served from the
 * endpoint URLs in `endpoints`.
 * @param endpoints An array of URLs from which the resolver will try to fetch the resource.
 * @param contentType Content type of the resource as it is served by the endpoints.
 * @returns A Promise containing an array of [[ServiceDetails]], which is the result of
 * deserialising the resource.
 */
export type ServicesResolver = (
  resourceHash: string,
  endpoints: string[],
  contentType: string
) => Promise<IServiceDetails[]>

export interface ResolverOpts {
  servicesResolver?: ServicesResolver
}

export type IDidResolutionDocumentMetadata = {
  canonicalId: string
}

export type IDidResolvedDetails = {
  details: IDidDetails
  metadata?: IDidResolutionDocumentMetadata
}

export interface IDidResolver {
  /**
   * Resolves a DID or DID URI and returns the respective resource.
   *
   * @param didUri A DID string or DID URI (DID + # + fragment) identifying a DID document, DID
   * public key or service endpoint.
   * @param opts Additional resolver options.
   * @param opts.servicesResolver Optionally specify a URL resolver for additional services endpoint
   * data to which the on-chain did record links. If not specified, service endpoints will be
   * omitted and URIs pointing to service endpoints cannot be resolved.
   * @returns A promise of a [[IDidResolvedDetails]] object if the didUri is a DID, [[IDidKeyDetails]] or
   * [[ServiceDetails]] if didUri contains a fragment (i.e. Did:kilt:<identifier>#<fragment>), null
   * if a resource cannot be resolved.
   */
  resolve: (
    didUri: string,
    opts?: ResolverOpts
  ) => Promise<IDidResolvedDetails | IDidKeyDetails | IServiceDetails | null>
  /**
   * Resolves a DID (or DID URI), returning the full contents of the DID document.
   *
   * @param did A DID string identifying a DID document. If a DID URI is passed, all additional
   * parameters or fragments are ignored.
   * @param opts Additional resolver options.
   * @param opts.servicesResolver Optionally specify a URL resolver for additional services endpoint
   * data to which the on-chain did record links. If not specified, service endpoints will be
   * omitted from the result.
   * @returns A promise of a [[IDidResolvedDetails]] object representing the DID document or null if the DID
   * cannot be resolved.
   */
  resolveDoc: (
    did: string,
    opts?: ResolverOpts
  ) => Promise<IDidResolvedDetails | null>
  /**
   * Resolves a DID URI identifying a public key associated with a DID.
   *
   * @param didUri A DID URI string (DID string plus fragment) identifying a public key associated
   * with a DID through the DID document.
   * @param opts Additional resolver options.
   * @param opts.servicesResolver Currently unused.
   * @returns A promise of a [[IDidKeyDetails]] object representing the DID public key or null if
   * the DID or key URI cannot be resolved.
   */
  resolveKey: (
    didUri: string,
    opts?: ResolverOpts
  ) => Promise<IDidKeyDetails | null>
}
