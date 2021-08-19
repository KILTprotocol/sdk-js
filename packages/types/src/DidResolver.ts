/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { IDidDetails, KeyDetails, ServiceDetails } from './DidDetails'

export type ServicesResolver = (
  resourceHash: string,
  endpoints: string[],
  contentType: string
) => Promise<ServiceDetails[]>

export interface ResolverOpts {
  servicesResolver?: ServicesResolver
}

export interface IDidResolver {
  resolve: (
    didUri: string,
    opts?: ResolverOpts
  ) => Promise<IDidDetails | KeyDetails | ServiceDetails | null>
  resolveDoc: (did: string, opts?: ResolverOpts) => Promise<IDidDetails | null>
  resolveKey: (
    didUri: string,
    opts?: ResolverOpts
  ) => Promise<KeyDetails | null>
}
