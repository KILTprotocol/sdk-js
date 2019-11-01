import CType from './CType'
import ICType from '../types/CType'
import CTypeMetadata from './CTypeMetadata'
import * as CTypeUtils from './CTypeUtils'
import { CTypeWrapperMetadata } from './CTypeSchema'
import ICTypeMetadata from '../types/CTypeMetedata'

jest.mock('../blockchainApiConnection/BlockchainApiConnection')

describe('CType', () => {
  const ctype = new CType({
    schema: {
      $id: 'http://example.com/ctype-1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      properties: {
        'first-property': { type: 'integer' },
        'second-property': { type: 'string' },
      },
      type: 'object',
    },
  } as ICType)

  const ctypeMetadata = {
    metadata: {
      $id: 'http://example.com/metadata-1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: { type: 'string' },
      description: { type: 'string' },
      properties: {
        'first-property': { type: 'integer' },
        'second-property': { type: 'string' },
      },
      type: 'object',
    },
    ctypeHash: 'string',
  } as ICTypeMetadata

  const metadata = new CTypeMetadata(ctype, ctypeMetadata)

  it('verifies the metadata of a ctype', async () => {
    expect(metadata.ctypeHash).not.toHaveLength(0)
    expect(
      CTypeUtils.verifySchema(ctypeMetadata, CTypeWrapperMetadata)
    ).toBeTruthy()
    expect(
      CTypeUtils.verifySchema(ctypeMetadata.metadata, CTypeWrapperMetadata)
    ).toBeFalsy()
  })
  it('checks if the metadata matches corresponding ctype hash', async () => {
    expect(metadata.ctypeHash).toEqual(ctype.hash)
  })
})
