/**
 * [[ErrorHandler]] helps spot and determine transaction errors.
 *
 * @packageDocumentation
 * @ignore
 */

import { SubmittableResult } from '@polkadot/api'
import { EventRecord } from '@polkadot/types/interfaces'
import { factory as LoggerFactory } from '../config/ConfigService'
import { errorForCode, ExtrinsicError } from './ExtrinsicError'

const log = LoggerFactory.getLogger('Blockchain')

export enum SystemEvent {
  ExtrinsicSuccess = '0x0000',
  ExtrinsicFailed = '0x0001',
}

const ERROR_MODULE_NAME = 'error'

/**
 * Checks if there is `SystemEvent.ExtrinsicFailed` in the list of
 * transaction events within the given `extrinsicResult`.
 *
 * @param extrinsicResult The result of a submission.
 * @returns Whether the extrinsic submission failed.
 */
export function extrinsicFailed(extrinsicResult: SubmittableResult): boolean {
  const events: EventRecord[] = extrinsicResult.events || []
  return events.some((eventRecord: EventRecord) => {
    return (
      !eventRecord.phase.asApplyExtrinsic.isEmpty &&
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
  extrinsicResult: SubmittableResult
): boolean {
  const events: EventRecord[] = extrinsicResult.events || []
  return events.some((eventRecord: EventRecord) => {
    return (
      !eventRecord.phase.asApplyExtrinsic.isEmpty &&
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
  extrinsicResult: SubmittableResult
): ExtrinsicError | null {
  const events: EventRecord[] = extrinsicResult.events || []

  const errorEvent = events.find((eventRecord: EventRecord) => {
    return (
      !eventRecord.phase.asApplyExtrinsic.isEmpty &&
      eventRecord.event.section === ERROR_MODULE_NAME
    )
  })
  if (errorEvent) {
    const { data } = errorEvent.event
    const errorCode = data && !data.isEmpty ? data[0].toJSON() : null
    if (errorCode && typeof errorCode === 'number') {
      return errorForCode(errorCode)
    }
    log.warn(`error event doesn't have a valid error code: ${data}`)
  } else {
    log.warn('no error event found in transaction result')
  }
  return null
}
