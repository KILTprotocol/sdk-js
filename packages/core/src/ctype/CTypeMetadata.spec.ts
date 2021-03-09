/**
 * @group unit/ctype
 */

import { SDKErrors } from '@kiltprotocol/utils'
import { ICType, ICTypeMetadata } from '@kiltprotocol/types'
import Identity from '../identity/Identity'
import CType from './CType'
import CTypeUtils from './CType.utils'
import CTypeMetadata from './CTypeMetadata'
import { MetadataModel } from './CTypeSchema'

describe('CType', () => {
  let identityAlice: Identity
  let rawCType: ICType['schema']
  let ctype: ICType
  let ctypeMetadata: ICTypeMetadata['metadata']
  let metadata: CTypeMetadata

  beforeAll(async () => {
    identityAlice = Identity.buildFromURI('//Alice')

    rawCType = {
      $id: 'kilt:ctype:0x1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'CtypeMetaData',
      properties: {
        'first-property': { type: 'integer' },
        'second-property': { type: 'string' },
      },
      type: 'object',
    }
    ctype = CType.fromSchema(rawCType, identityAlice.signKeyringPair.address)

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
  it('throws error when supplied malformed constructor input', () => {
    const faultyMetadata: ICTypeMetadata = {
      metadata: ctypeMetadata,
      ctypeHash: ctype.hash,
    }
    delete faultyMetadata.metadata.properties
    expect(() => new CTypeMetadata(faultyMetadata)).toThrow(
      SDKErrors.ERROR_OBJECT_MALFORMED()
    )
  })
})
