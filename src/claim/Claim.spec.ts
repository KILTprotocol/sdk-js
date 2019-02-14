import Claim from './Claim'
import CType, { ICType } from '../ctype/CType'
import Identity from '../identity/Identity'

describe('Claim', () => {
  const ctype = new CType({
    schema: {
      $id: 'http://example.com/cType-1',
      $schema: 'http://kilt-protocol.org/draft-01/cType#',
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    },
    metadata: {
      title: { default: 'CType Title' },
      description: {},
      properties: {
        name: { title: { default: 'Name' } },
      },
    },
  } as ICType)
  const identity = Identity.buildFromSeedString('Alice')

  const claimContents = {
    name: 'Bob',
  }

  const claim = new Claim(ctype, claimContents, identity)

  it('can be made from object', () => {
    const claimObj = JSON.parse(JSON.stringify(claim))
    expect(Claim.fromObject(claimObj)).toEqual(claim)
  })
})
