import CType from './CType'
import ICType from '../types/CType'
import CTypeMetadata from './CTypeMetadata'
import CTypeUtils from './CTypeUtils'
import { MetadataModel } from './CTypeSchema'
import ICTypeMetadata from '../types/CTypeMetadata'
import Identity from '../identity/Identity'

describe('CType', () => {
  const identityAlice = Identity.buildFromURI('//Alice')

  const rawCType: ICType['schema'] = {
    $id: 'kilt:ctype:0x123',
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    title: 'title',
    properties: {
      'first-property': { type: 'integer' },
      'second-property': { type: 'string' },
    },
    type: 'object',
  }

  const fromRawCType: ICType = {
    schema: rawCType,
    owner: identityAlice.address,
    hash: '',
  }
  const ctype = CType.fromCType(fromRawCType)

  const ctypeMetadata: ICTypeMetadata['metadata'] = {
    title: { default: 'Title' },
    description: { default: 'Description' },
    properties: {
      'first-property': { title: { default: 'First Property' } },
      'second-property': { title: { default: 'Second Property' } },
    },
  }

  const metadata = new CTypeMetadata({
    metadata: ctypeMetadata,
    ctypeHash: ctype.hash,
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
