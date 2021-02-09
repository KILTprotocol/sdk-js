/**
 * @packageDocumentation
 * @group unit/errorhandling
 * @ignore
 */

import { ModuleError } from './ErrorHandler'
import {
  ErrorCode,
  errorCodeToModuleError,
  errorForModule,
  ExtrinsicError,
} from './ExtrinsicError'

describe('ExtrinsicError', () => {
  // get all error codes from ErrorCode enum
  const errorCodes: Array<ModuleError['Module']> = Object.values(
    ErrorCode
  ).map((code) => errorCodeToModuleError(code))
  it.each(errorCodes)('should return error for code %s', (errorCode) => {
    expect(errorForModule(errorCode)).toBeDefined()
    expect(errorForModule(errorCode)).toBeInstanceOf(ExtrinsicError)
  })
})
