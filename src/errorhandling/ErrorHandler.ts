/**
 * [[ErrorHandler]] helps spot and determine transaction errors.
 * @module ErrorHandling
 */

/**
 * Dummy comment needed for correct doc display, do not remove
 */
import { ApiPromise, SubmittableResult } from '@polkadot/api'
import { EventRecord } from '@polkadot/types/interfaces'
import { ModuleMetadataV4 } from '@polkadot/types/Metadata/v4'
import { factory as LoggerFactory } from '../config/ConfigLog'
import { ExtrinsicError, errorForCode } from './ExtrinsicError'

const log = LoggerFactory.getLogger('Blockchain')

export enum SystemEvent {
  ExtrinsicSuccess = '0x0000',
  ExtrinsicFailed = '0x0001',
}

export class ErrorHandler {
  private static readonly ERROR_MODULE_NAME = 'error'

  /**
   * Checks if there is `SystemEvent.ExtrinsicFailed` in the list of
   * transaction events within the given `extrinsicResult`.
   */
  public static extrinsicFailed(extrinsicResult: SubmittableResult): boolean {
    const events: EventRecord[] = extrinsicResult.events || []
    return (
      events.find((eventRecord: EventRecord) => {
        return (
          !eventRecord.phase.asApplyExtrinsic.isEmpty &&
          eventRecord.event.index.toHex() === SystemEvent.ExtrinsicFailed
        )
      }) !== undefined
    )
  }

  public constructor(apiPromise: ApiPromise) {
    ErrorHandler.getErrorModuleIndex(apiPromise).then((moduleIndex: number) => {
      this.moduleIndex = moduleIndex
    })
  }

  private moduleIndex = -1

  /**
   * Get the extrinsic error from the transaction result.
   *
   * @param extrinsicResult the transaction result
   */
  public getExtrinsicError(
    extrinsicResult: SubmittableResult
  ): ExtrinsicError | null {
    const events: EventRecord[] = extrinsicResult.events || []

    const errorEvent = events.find((eventRecord: EventRecord) => {
      const eventIndex = eventRecord.event.index
      return (
        !eventRecord.phase.asApplyExtrinsic.isEmpty &&
        eventIndex[0] === this.moduleIndex
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

  /**
   * Derive the module index from the metadata module descriptor.
   */
  private static async getErrorModuleIndex(
    apiPromise: ApiPromise
  ): Promise<number> {
    const modules: ModuleMetadataV4[] = await apiPromise.runtimeMetadata.asV4
      .modules
    const filtered: ModuleMetadataV4[] = modules.filter(
      (mod: ModuleMetadataV4) => {
        return !mod.events.isEmpty
      }
    )
    return filtered
      .map(m => m.name.toString())
      .indexOf(ErrorHandler.ERROR_MODULE_NAME)
  }
}
