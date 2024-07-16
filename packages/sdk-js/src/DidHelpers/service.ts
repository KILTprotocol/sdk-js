/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { serviceToChain, urlFragmentToChain } from '@kiltprotocol/did'
import { DidUrl, Service, UriFragment } from '@kiltprotocol/types'
import { SharedArguments, TransactionHandlers } from './interfaces.js'
import { transact } from './transact.js'

/**
 * Adds a service to the DID Document.
 *
 * @param options.service The service entry to add to the document.
 * If the service id is relative (begins with #) it is automatically expanded with the DID taken from didDocument.id.
 * @param options
 */
export function addService(
  options: SharedArguments & {
    service: Service<DidUrl | UriFragment>
  }
): TransactionHandlers {
  const didServiceUpdateTx = options.api.tx.did.addServiceEndpoint(
    serviceToChain(options.service)
  )
  return transact({
    ...options,
    call: didServiceUpdateTx,
    expectedEvents: [{ section: 'did', method: 'DidUpdated' }],
  })
}

/**
 * Removes a service from the DID Document.
 *
 * @param options.id The id of the service to remove from the document.
 * If the service id is relative (begins with #) it is automatically expanded with the DID taken from didDocument.id.
 * @param options
 */
export function removeService(
  options: SharedArguments & {
    id: DidUrl | UriFragment
  }
): TransactionHandlers {
  const didServiceUpdateTx = options.api.tx.did.removeServiceEndpoint(
    urlFragmentToChain(options.id)
  )
  return transact({
    ...options,
    call: didServiceUpdateTx,
    expectedEvents: [{ section: 'did', method: 'DidUpdated' }],
  })
}
