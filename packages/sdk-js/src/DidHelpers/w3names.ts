/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { SharedArguments, TransactionHandlers } from '@kiltprotocol/types'
import { transactInternal } from './transact.js'

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
  return transactInternal({
    ...options,
    callFactory: async () => api.tx.web3Names.claim(name),
    expectedEvents: [{ section: 'web3Names', method: 'Web3NameClaimed' }],
  })
}

/**
 * Removes w3n nickname from the DID Document, allowing it to be claimed by others.
 *
 * @param options Any {@link SharedArguments} and additional parameters.
 * @returns A set of {@link TransactionHandlers}.
 */
export function releaseWeb3Name(options: SharedArguments): TransactionHandlers {
  const { api } = options
  return transactInternal({
    ...options,
    callFactory: async () => api.tx.web3Names.releaseByOwner(),
    expectedEvents: [{ section: 'web3Names', method: 'Web3NameReleased' }],
  })
}
