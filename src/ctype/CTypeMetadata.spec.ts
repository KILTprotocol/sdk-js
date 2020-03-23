import CType from './CType'
import ICType from '../types/CType'
import CTypeMetadata from './CTypeMetadata'
import CTypeUtils from './CType.utils'
import { MetadataModel } from './CTypeSchema'
import ICTypeMetadata from '../types/CTypeMetadata'
import Identity from '../identity/Identity'

describe('CType', () => {
  let identityAlice: Identity
  let rawCType: ICType['schema']
  let fromRawCType: ICType
  let ctype: ICType
  let ctypeMetadata: ICTypeMetadata['metadata']
  let metadata: CTypeMetadata

  beforeAll(async () => {
    identityAlice = await Identity.buildFromURI('//Alice')

    rawCType = {
      $id: 'http://example.com/ctype-1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      properties: {
        'first-property': { type: 'integer' },
        'second-property': { type: 'string' },
      },
      type: 'object',
    }

    fromRawCType = {
      schema: rawCType,
      owner: identityAlice.getAddress(),
      hash: '',
    }
    ctype = CType.fromCType(fromRawCType)

    ctypeMetadata = {
      title: { default: 'Title' },
      description: { default: 'Description' },
      properties: {
        'first-property': { title: { default: 'First Property' } },
        'second-property': { title: { default: 'Second Property' } },
      },
    }

    metadata = new CTypeMetadata({
      metadata: ctypeMetadata,
      ctypeHash: ctype.hash,
    })
  })

  it('verifies the metadata of a ctype', async () => {
    expect(metadata.ctypeHash).not.toHaveLength(0)
    expect(CTypeUtils.verifySchema(metadata, MetadataModel)).toBeTruthy()
    expect(CTypeUtils.verifySchema(ctypeMetadata, MetadataModel)).toBeFalsy()
  })
  it('checks if the metadata matches corresponding ctype hash', async () => {
    expect(metadata.ctypeHash).toEqual(ctype.hash)
  })
})
