/**
 * @group unit/errorhandling
 */

import {
  errorForPallet,
  ExtrinsicError,
  PalletToExtrinsicErrors,
} from './ExtrinsicError'

describe('ExtrinsicError', () => {
  const errorCodes = Object.keys(PalletToExtrinsicErrors).reduce(
    (
      acc: Array<{
        index: number
        errorIndex: number
        error: { code: number; message: string }
      }>,
      palletIndex
    ) => {
      const errorIndices = Object.keys(PalletToExtrinsicErrors[palletIndex])
      const pairs: Array<{
        index: number
        errorIndex: number
        error: { code: number; message: string }
      }> = errorIndices.map((error) => ({
        index: Number.parseInt(palletIndex, 10),
        errorIndex: Number.parseInt(error, 10),
        error: PalletToExtrinsicErrors[palletIndex][error],
      }))

      return [...acc, ...pairs]
    },
    []
  )

  it.each(errorCodes)(
    'should return error for code %s',
    ({ index, errorIndex, error }) => {
      expect(errorForPallet({ index, error: errorIndex })).toBeDefined()
      expect(errorForPallet({ index, error: errorIndex })).toBeInstanceOf(
        ExtrinsicError
      )
      expect(errorForPallet({ index, error: errorIndex })).toStrictEqual(
        new ExtrinsicError(error.code, error.message)
      )
    }
  )
})
