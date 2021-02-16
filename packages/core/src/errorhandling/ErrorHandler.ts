/**
 * [[ErrorHandler]] helps spot and determine transaction errors.
 *
 * @packageDocumentation
 * @ignore
 */

import { SubmittableResult } from '@polkadot/api'
import { EventRecord } from '@polkadot/types/interfaces'
import { ConfigService } from '@kiltprotocol/config'
import { errorForPallet, ExtrinsicError } from './ExtrinsicError'

const log = ConfigService.LoggingFactory.getLogger('Blockchain')

export enum SystemEvent {
  ExtrinsicSuccess = '0x0000',
  ExtrinsicFailed = '0x0001',
}
export interface ModuleError {
  Module: { index: number; error: number }
}

const ERROR_MODULE_NAME = 'system'

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
    const moduleError = data && !data.isEmpty ? data[0].toJSON() : null

    // TODO: Can this be accomplished in a prettier way using SDK functionality like constructor input checks?
    // Note: Not all instances of `moduleError` have this specific structure!
    if (
      moduleError &&
      typeof moduleError === 'object' &&
      Object.keys(moduleError).includes('Module')
    ) {
      const {
        Module: { index, error },
      } = (moduleError as unknown) as ModuleError
      if (index >= 0 && error >= 0) {
        return errorForPallet({ index, error })
      }
    }
    log.warn(`error event doesn't have a valid error structure: ${data}`)
  } else {
    log.warn('no error event found in transaction result')
  }
  return null
}
