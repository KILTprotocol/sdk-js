/**
 * @packageDocumentation
 * @group unit/errorhandling
 * @ignore
 */

import {
  ErrorCode,
  errorForCode,
  errorsByCode,
  ExtrinsicError,
} from './ExtrinsicError'

describe('ExtrinsicError', () => {
  // get all error codes from ErrorCode enum
  // Object.keys() returns both the integers as well as the strings
  const errorCodes: number[] = Object.keys(ErrorCode).reduce(
    (codes: number[], value: string) => {
      // either an integer error code or NaN
      const num = Number.parseInt(value, 10)
      // check for NaN case
      if (Number.isInteger(num)) {
        return [...codes, num]
      }
      return codes
    },
    []
  )
  it('checks whether errorsByCode includes all errors', () => {
    expect(Object.keys(errorsByCode).length).toBe(errorCodes.length)
  })
  it.each(errorCodes)('should return error for code %s', (errorCode) => {
    expect(errorForCode(errorCode)).toBeDefined()
    expect(errorForCode(errorCode)).toBeInstanceOf(ExtrinsicError)
  })
})
