/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Call, Extrinsic } from '@polkadot/types/interfaces'

import { ConfigService } from '@kiltprotocol/config'
import { GenericExtrinsic } from '@polkadot/types'

/**
 * Checks wheather the provided extrinsic is one of the potential batch extrinsics.
 *
 * @param extrinsic The input [[Extrinsic]].
 *
 * @returns True if the extrinsic is a batch extrinsic, false otherwise.
 */
export function isBatch(
  extrinsic: Extrinsic | Call
): extrinsic is GenericExtrinsic<
  | typeof api.tx.utility.batch.args
  | typeof api.tx.utility.batchAll.args
  | typeof api.tx.utility.forceBatch.args
> {
  const api = ConfigService.get('api')

  return (
    api.tx.utility.batch.is(extrinsic) ||
    api.tx.utility.batchAll.is(extrinsic) ||
    api.tx.utility.forceBatch.is(extrinsic)
  )
}
