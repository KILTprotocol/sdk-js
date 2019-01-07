import CType from './CType'
import { CTypeWrapperModel } from './CTypeSchema'

describe('CType', () => {
  it('verify model transformations', () => {
    const ctypeInput = {
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
    }
    const ctypeModel = {
      schema: {
        $id: 'http://example.com/ctype-1',
        $schema: 'http://kilt-protocol.org/draft-01/ctype#',
        properties: {
          'first-property': { type: 'integer' },
          'second-property': { type: 'string' },
        },
        type: 'object',
      },
      metadata: {
        title: { default: 'CType Title' },
        description: {},
        properties: {
          'first-property': { title: { default: 'First Property' } },
          'second-property': { title: { default: 'Second Property' } },
        },
      },
    }
    const claimInput = {
      $id: 'http://example.com/ctype-1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      properties: {
        'first-property': { type: 'integer', title: 'First Property' },
        'second-property': { type: 'string', title: 'Second Property' },
      },
      type: 'object',
      title: 'CType Title',
      required: ['first-property', 'second-property'],
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

    const ctypeFromInput = CType.fromInputModel(ctypeInput)
    const ctypeFromModel = new CType(ctypeModel)
    expect(JSON.stringify(ctypeFromInput.getModel())).toEqual(
      JSON.stringify(ctypeFromModel.getModel())
    )
    expect(JSON.stringify(ctypeFromInput.getClaimInputModel('en'))).toEqual(
      JSON.stringify(claimInput)
    )
    expect(JSON.stringify(ctypeFromInput.getCTypeInputModel())).toEqual(
      JSON.stringify(ctypeInput)
    )
    expect(ctypeFromInput.verifyClaimStructure(goodClaim)).toBeTruthy()
    expect(
      CType.verifyClaimStructure(goodClaim, ctypeModel.schema)
    ).toBeTruthy()
    expect(ctypeFromInput.verifyClaimStructure(badClaim)).toBeFalsy()
    expect(
      CType.verifySchemaWithErrors(badClaim, CTypeWrapperModel, [''])
    ).toBeFalsy()
    expect(() => {
      new CType(goodClaim).verifyClaimStructure(goodClaim)
    }).toThrow(new Error('CType does not correspond to schema'))
    expect(() => {
      CType.verifyClaimStructure(badClaim, ctypeInput)
    }).toThrow(new Error('CType does not correspond to schema'))
    expect(() => {
      CType.fromInputModel(ctypeModel)
    }).toThrow(
      new Error('CType input does not correspond to input model schema')
    )
  })
})
