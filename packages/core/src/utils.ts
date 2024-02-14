/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ApiPromise } from '@polkadot/api'
import type { TxWithEvent } from '@polkadot/api-derive/types'
import type { GenericCall, GenericExtrinsic } from '@polkadot/types'
import type { Call, Extrinsic } from '@polkadot/types/interfaces'
import type { BN } from '@polkadot/util'

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
): extrinsic is
  | GenericExtrinsic<
      | typeof api.tx.utility.batch.args
      | typeof api.tx.utility.batchAll.args
      | typeof api.tx.utility.forceBatch.args
    >
  | GenericCall<
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

export type DidAuthorizationCall =
  | GenericCall<ApiPromise['tx']['did']['submitDidCall']['args']>
  | GenericCall<ApiPromise['tx']['did']['dispatchAs']['args']>

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
export function flattenCalls(api: ApiPromise, call: Call): Call[] {
  if (isBatch(api, call)) {
    // Inductive case
    return call.args[0].flatMap((c) => flattenCalls(api, c))
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
  blockNumber: BN,
  filter: (tx: TxWithEvent) => boolean
): Promise<Extrinsic | null> {
  const { extrinsics } = await api.derive.chain.getBlockByNumber(blockNumber)
  const successfulExtrinsics = extrinsics.filter(
    ({ dispatchError }) => !dispatchError
  )
  const extrinsicLastOccurrence = successfulExtrinsics.reverse().find(filter)

  return extrinsicLastOccurrence?.extrinsic ?? null
}
