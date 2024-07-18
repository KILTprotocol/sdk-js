/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { SharedArguments, TransactionHandlers } from './interfaces.js'
import { transactInternal } from './transact.js'

/**
 * _Permanently_ deactivates the DID, removing all verification methods and services from its document.
 * This action cannot be undone – once a DID has been deactivated, all operations on it (including attempts at re-creation) are permanently disabled.
 *
 * @param options Any {@link SharedArguments} and additional parameters.
 * @param options.didDocument The {@link DidDocument} of the DID to be deactivated.
 * @returns A set of {@link TransactionHandlers}.
 */
export function deactivateDid(options: SharedArguments): TransactionHandlers {
  const { api, didDocument } = options
  return transactInternal({
    ...options,
    callFactory: async () =>
      api.tx.did.delete(didDocument.service?.length ?? 0),
    expectedEvents: [{ section: 'did', method: 'DidDeleted' }],
  })
}
