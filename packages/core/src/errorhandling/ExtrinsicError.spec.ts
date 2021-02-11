/**
 * @packageDocumentation
 * @group unit/errorhandling
 * @ignore
 */

import { ModuleError } from './ErrorHandler'
import {
  errorForPallet,
  ExtrinsicError,
  extrinsicErrorDict,
  PalletIndex,
} from './ExtrinsicError'

describe('ExtrinsicError', () => {
  // reconstruct error codes as in chain meta data
  const errorCodes = Object.values(PalletIndex).reduce(
    (acc: Array<ModuleError['Module']>, palletName) => {
      // keys/values of an enum include both sides, thus check for string
      if (typeof palletName === 'string') {
        // iterate defined errors for each pallet
        const errorsForPallet: Array<ModuleError['Module']> = Object.keys(
          extrinsicErrorDict[palletName]
        ).map((_, index) => ({
          // numerical index of respective pallet
          index: PalletIndex[palletName],
          error: index,
        }))
        // append to errors of other pallets
        return [...acc, ...errorsForPallet]
      }
      return acc
    },
    []
  )

  it.each(errorCodes)('should return error for code %s', (errorCode) => {
    expect(errorForPallet(errorCode)).toBeDefined()
    expect(errorForPallet(errorCode)).toBeInstanceOf(ExtrinsicError)

    const errorsForPallet = extrinsicErrorDict[PalletIndex[errorCode.index]]
    if (Object.keys(errorsForPallet).length) {
      expect(errorForPallet(errorCode)).toBe(
        errorsForPallet[
          Object.keys(extrinsicErrorDict[PalletIndex[errorCode.index]])[
            errorCode.error
          ]
        ]
      )
    } else {
      expect(errorForPallet(errorCode)).toBe(extrinsicErrorDict.UNKNOWN_ERROR)
    }
  })
})
