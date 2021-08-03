/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { IDidDetails, ServiceDetails } from './DidDetails'

export type ServicesResolver = (
  resourceHash: string,
  endpoints: string[],
  contentType: string
) => Promise<ServiceDetails[]>

export interface ResolverOpts {
  did: string
  servicesResolver?: ServicesResolver
}

export interface IDidResolver {
  resolve: (opts: ResolverOpts) => Promise<IDidDetails | null>
}
