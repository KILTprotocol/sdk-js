import { ERROR_OBJECT_MALFORMED } from '../errorhandling/SDKErrors'
import ICType from '../types/CType'
import {
  verifyClaimStructure,
  verifySchema,
  verifySchemaWithErrors,
} from './CType.utils'
import { CTypeModel, CTypeWrapperModel } from './CTypeSchema'

const ctypeInput = ({
  $id: 'http://example.com/ctype-1',
  $schema: 'http://kilt-protocol.org/draft-01/ctype-input#',
  properties: [
    {
      title: 'First Property',
      $id: 'first-property',
      type: 'integer',
    },
    {
      title: 'Second Property',
      $id: 'second-property',
      type: 'string',
    },
  ],
  type: 'object',
  title: 'CType Title',
  required: ['first-property', 'second-property'],
} as any) as ICType['schema']

const ctypeWrapperModel: ICType['schema'] = {
  $id: 'http://example.com/ctype-1',
  $schema: 'http://kilt-protocol.org/draft-01/ctype#',
  properties: {
    'first-property': { type: 'integer' },
    'second-property': { type: 'string' },
  },
  type: 'object',
}

const goodClaim = {
  'first-property': 10,
  'second-property': '12',
}

const badClaim = {
  'first-property': '1',
  'second-property': '12',
  'third-property': true,
}

describe('CTypeUtils', () => {
  it('verifies claims', () => {
    expect(verifyClaimStructure(goodClaim, ctypeWrapperModel)).toBeTruthy()
    expect(verifyClaimStructure(badClaim, ctypeWrapperModel)).toBeFalsy()
    expect(verifySchemaWithErrors(badClaim, CTypeWrapperModel, [])).toBeFalsy()
    expect(() => {
      verifyClaimStructure(badClaim, ctypeInput)
    }).toThrow(ERROR_OBJECT_MALFORMED())
  })
  it('verifies ctypes', () => {
    expect(verifySchema(ctypeWrapperModel, CTypeModel)).toBeTruthy()
  })
})
