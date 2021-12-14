/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * ErrorHandler helps spot and determine transaction errors.
 *
 * @packageDocumentation
 * @module ErrorHandler
 * @preferred
 */

import type { EventRecord } from '@polkadot/types/interfaces'
import type { ISubmittableResult } from '@kiltprotocol/types'
import { ConfigService } from '@kiltprotocol/config'
import { errorForPallet, ExtrinsicError } from './ExtrinsicError.js'

const log = ConfigService.LoggingFactory.getLogger('Blockchain')

export enum SystemEvent {
  ExtrinsicSuccess = '0x0000',
  ExtrinsicFailed = '0x0001',
}
export interface ModuleError {
  Module: { index: number; error: number }
}

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
    return (
      eventRecord.phase.isApplyExtrinsic &&
      eventRecord.event.index.toHex() === SystemEvent.ExtrinsicFailed
    )
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
    return (
      eventRecord.phase.isApplyExtrinsic &&
      eventRecord.event.index.toHex() === SystemEvent.ExtrinsicSuccess
    )
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
): ExtrinsicError | null {
  const errorEvent = extrinsicResult.dispatchError

  if (errorEvent && errorEvent.isModule) {
    const moduleError = errorEvent.asModule

    const index = moduleError.index.toNumber()
    const error = moduleError.error.toNumber()
    if (index >= 0 && error >= 0) {
      return errorForPallet({ index, error })
    }
    log.warn(
      `error event module index or error code out of range. index: ${index}; error: ${error}`
    )
  }
  return null
}
