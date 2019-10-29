import CType from './CType'
// import Crypto from '../crypto'
import ICType, { ICtypeMetadata } from '../types/CType'
// import TxStatus from '../blockchain/TxStatus'
import CTypeMetadata from './CTypeMetadata'

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
      $id: 'http://example.com/ctype-1',
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
  } as ICtypeMetadata

  const metadata = new CTypeMetadata(ctype, ctypeMetadata)

  it('verifies the metadata of a ctype', async () => {
    console.log(metadata)
  })
})
