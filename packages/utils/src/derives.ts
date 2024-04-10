/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Observable } from '@polkadot/types/types'
import type { Extrinsic } from '@polkadot/types/interfaces'
import type { DeriveApi } from '@polkadot/api-derive/types'
import { memo } from '@polkadot/api-derive/util'
import { createSubmittable } from '@polkadot/api/submittable'
import { toRxMethod } from '@polkadot/api/rx'
import type { SubmittableExtrinsic } from '@polkadot/api/types'

export { DeriveApi, Observable }

export type DeriveCreator<P extends any[], R> = (
  instanceId: string,
  api: DeriveApi
) => (...args: P) => Observable<R>

/**
 * @param implementationFactory
 */
export function makeDerive<P extends any[], R>(
  implementationFactory: (api: DeriveApi) => (...args: P) => Observable<R>
): DeriveCreator<P, R> {
  return function (instanceId, api) {
    return memo(instanceId, implementationFactory(api))
  }
}

/**
 * @param tx
 * @param api
 */
export function fixSubmittable(
  tx: Extrinsic,
  api: DeriveApi
): SubmittableExtrinsic<'rxjs'> {
  return createSubmittable('rxjs', api, toRxMethod)(tx.toU8a())
}
