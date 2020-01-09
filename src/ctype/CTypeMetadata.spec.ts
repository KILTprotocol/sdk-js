import CType from './CType'
import ICType from '../types/CType'
import CTypeMetadata from './CTypeMetadata'
import * as CTypeUtils from './CTypeUtils'
import { CTypeMetadataModel } from './CTypeSchema'
import ICTypeMetadata from '../types/CTypeMetadata'
import Identity from '../identity/Identity'

describe('CType', () => {
  const identityAlice = Identity.buildFromURI('//Alice')

  const rawCType: ICType['schema'] = {
    $id: 'http://example.com/ctype-1',
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    properties: {
      'first-property': { type: 'integer' },
      'second-property': { type: 'string' },
    },
    type: 'object',
  }

  const rawCTypeHash = CTypeUtils.getHashForSchema(rawCType)

  const fromRawCType: ICType = {
    schema: rawCType,
    owner: identityAlice.address,
    hash: rawCTypeHash,
  }
  const ctype: ICType = CType.fromCType(fromRawCType)

  const ctypeHash = ctype.hash

  const ctypeMetadata: ICTypeMetadata['metadata'] = {
    title: { default: 'string' },
    description: { default: 'string' },
    properties: {
      'first-property': { type: 'integer' },
      'second-property': { type: 'string' },
    },
  }

  const metadata = new CTypeMetadata(ctypeHash, ctypeMetadata)

  it('verifies the metadata of a ctype', async () => {
    expect(metadata.ctypeHash).not.toHaveLength(0)
    expect(CTypeUtils.verifySchema(metadata, CTypeMetadataModel)).toBeTruthy()
    expect(
      CTypeUtils.verifySchema(ctypeMetadata, CTypeMetadataModel)
    ).toBeFalsy()
  })
  it('checks if the metadata matches corresponding ctype hash', async () => {
    expect(metadata.ctypeHash).toEqual(ctype.hash)
  })
})
