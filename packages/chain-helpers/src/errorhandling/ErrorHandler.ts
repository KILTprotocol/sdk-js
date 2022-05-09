/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * ErrorHandler helps spot and determine transaction errors.
 *
 * @packageDocumentation
 */

import type { DispatchError, EventRecord } from '@polkadot/types/interfaces'
import type { ISubmittableResult } from '@kiltprotocol/types'
import type { RegistryError } from '@polkadot/types/types'

/**
 * Checks if there is `SystemEvent.ExtrinsicFailed` in the list of
 * transaction events within the given `extrinsicResult`.
 *
 * @param extrinsicResult The result of a submission.
 * @returns Whether the extrinsic submission failed.
 */
export function extrinsicFailed(extrinsicResult: ISubmittableResult): boolean {
  const events: EventRecord[] = extrinsicResult.events || []
  return events.some((eventRecord: EventRecord) => {
    const { section, method } = eventRecord.event
    return section === 'system' && method === 'ExtrinsicFailed' // as done in https://github.com/polkadot-js/apps/blob/51835328db5f0eb90a9efcc7bf5510704a7ab279/packages/react-components/src/Status/Queue.tsx
  })
}

/**
 * Checks if there is `SystemEvent.ExtrinsicSuccess` in the list of
 * transaction events within the given `extrinsicResult`.
 *
 * @param extrinsicResult The result of a submission.
 * @returns Whether the extrinsic submission succeeded.
 */
export function extrinsicSuccessful(
  extrinsicResult: ISubmittableResult
): boolean {
  const events: EventRecord[] = extrinsicResult.events || []
  return events.some((eventRecord: EventRecord) => {
    const { section, method } = eventRecord.event
    return section === 'system' && method === 'ExtrinsicSuccess'
  })
}

/**
 * Get the extrinsic error from the transaction result.
 *
 * @param extrinsicResult The transaction result.
 * @returns The extrinsic error.
 */
export function getExtrinsicError(
  extrinsicResult: ISubmittableResult
): RegistryError | DispatchError | null {
  const errorEvent = extrinsicResult.dispatchError

  if (errorEvent && errorEvent.isModule) {
    const moduleError = errorEvent.asModule
    try {
      return moduleError.registry.findMetaError(moduleError)
    } catch {
      // handled with last return
    }
  }
  return errorEvent || null
}
