/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ApiPromise } from '@polkadot/api'
import type { u64 } from '@polkadot/types'
import type { TxWithEvent } from '@polkadot/api-derive/types'
import type { Call, Extrinsic } from '@polkadot/types/interfaces'

/**
 * Flatten all calls into a single array following a DFS approach.
 *
 * For example, given the calls [[N1, N2], [N3, [N4, N5], N6]], the final list will look like [N1, N2, N3, N4, N5, N6].
 *
 * @param api The [[ApiPromise]] object.
 * @param call The [[Call]] which can potentially contain nested calls.
 *
 * @returns A list of [[Call]] nested according to the rules above.
 */
export function flattenBatchCalls(api: ApiPromise, call: Call): Call[] {
  if (
    api.tx.utility.batch.is(call) ||
    api.tx.utility.batchAll.is(call) ||
    api.tx.utility.forceBatch.is(call)
  ) {
    // Inductive case
    return call.args[0].flatMap((c) => flattenBatchCalls(api, c))
  }
  // Base case
  return [call]
}

/**
 * Retrieve the last extrinsic from a block that matches the provided filter.
 *
 * The function ignores failed extrinsics and, if multiple extrinsics from the block match the provided filter, it only takes the last one.
 *
 * @param api The [[ApiPromise]] object.
 * @param blockNumber The number of the block to parse.
 * @param filter The filter to apply to the transactions in the block.
 *
 * @returns The last extrinsic in the block matching the filter, or null if no extrinsic is found.
 */
export async function retrieveExtrinsicFromBlock(
  api: ApiPromise,
  blockNumber: u64,
  filter: (tx: TxWithEvent) => boolean
): Promise<Extrinsic | null> {
  const { extrinsics } = await api.derive.chain.getBlockByNumber(blockNumber)
  const successfulExtrinsics = extrinsics.filter(
    ({ dispatchError }) => !dispatchError
  )
  const extrinsicLastOccurrence = successfulExtrinsics.reverse().find(filter)

  return extrinsicLastOccurrence?.extrinsic ?? null
}
