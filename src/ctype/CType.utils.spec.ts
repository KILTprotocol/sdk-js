import { CTypeModel, CTypeWrapperModel } from './CTypeSchema'
import {
  verifyClaimStructure,
  verifySchema,
  verifySchemaWithErrors,
} from './CType.utils'
import ICType from '../types/CType'
import { ERROR_OBJECT_MALFORMED } from '../errorhandling/SDKErrors'

const ctypeInput = ({
  $id: 'kilt:ctype:0x1',
  $schema: 'http://kilt-protocol.org/draft-01/ctype-input#',
  title: 'Ctype Title',
  properties: [
    {
      $id: 'kilt:ctype:0xfirst-property',
      $ref: 'First Property',
      type: 'integer',
    },
    {
      $id: 'kilt:ctype:0xsecond-property',
      $ref: 'Second Property',
      type: 'string',
    },
  ],
  type: 'object',
  required: ['first-property', 'second-property'],
} as any) as ICType['schema']

const ctypeWrapperModel: ICType['schema'] = {
  $id: 'kilt:ctype:0x2',
  $schema: 'http://kilt-protocol.org/draft-01/ctype#',
  title: 'name',
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
