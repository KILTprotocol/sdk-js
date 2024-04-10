/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Observable } from '@polkadot/types/types'
import type { DeriveApi } from '@polkadot/api-derive/types'
import { memo } from '@polkadot/api-derive/util'

export { DeriveApi, Observable }

export type DeriveCreator<P extends any[], R> = (
  instanceId: string,
  api: DeriveApi
) => (...args: P) => Observable<R>

export function makeDerive<P extends any[], R>(
  implementationFactory: (api: DeriveApi) => (...args: P) => Observable<R>
): DeriveCreator<P, R> {
  return function (instanceId, api) {
    return memo(instanceId, implementationFactory(api))
  }
}
