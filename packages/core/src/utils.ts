/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ApiPromise } from '@polkadot/api'
import type { Call, Extrinsic } from '@polkadot/types/interfaces'

import { GenericExtrinsic } from '@polkadot/types'

/**
 * Checks wheather the provided extrinsic or call represents a batch.
 *
 * @param api The [[ApiPromise]].
 * @param extrinsic The input [[Extrinsic]] or [[Call]].
 *
 * @returns True if it's a batch, false otherwise.
 */
export function isBatch(
  api: ApiPromise,
  extrinsic: Extrinsic | Call
): extrinsic is GenericExtrinsic<
  | typeof api.tx.utility.batch.args
  | typeof api.tx.utility.batchAll.args
  | typeof api.tx.utility.forceBatch.args
> {
  return (
    api.tx.utility.batch.is(extrinsic) ||
    api.tx.utility.batchAll.is(extrinsic) ||
    api.tx.utility.forceBatch.is(extrinsic)
  )
}
