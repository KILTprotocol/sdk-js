/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { SharedArguments, TransactionHandlers } from './interfaces.js'
import { transact } from './transact.js'

/**
 * Adds a w3n nickname to the DID Document.
 *
 * @param options Any {@link SharedArguments} and additional parameters.
 * @param options.name The name to be claimed.
 * Must be still available (not yet claimed by another DID) for this operation to succeed.
 * @returns A set of {@link TransactionHandlers}.
 */
export function claimWeb3Name(
  options: SharedArguments & {
    name: string
  }
): TransactionHandlers {
  const { api, name } = options
  return transact({
    ...options,
    call: api.tx.web3Names.claim(name),
    expectedEvents: [{ section: 'web3Names', method: 'Web3NameClaimed' }],
  })
}
