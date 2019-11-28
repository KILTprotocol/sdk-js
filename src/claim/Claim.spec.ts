import Claim from './Claim'
import CType from '../ctype/CType'
import Identity from '../identity/Identity'
import ICType from '../types/CType'

describe('Claim', () => {
  const identity = Identity.buildFromURI('//Alice')

  const claimContents = {
    name: 'Bob',
  }

  const testCType: CType = CType.fromCType({
    schema: {
      $id: 'http://example.com/ctype-1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
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
  const claim = Claim.fromCTypeAndClaimContents(
    testCType,
    claimContents,
    identity.address
  )

  it('can be made from object', () => {
    const claimObj = JSON.parse(JSON.stringify(claim))
    expect(Claim.fromClaim(claimObj, testCType.schema)).toEqual(claim)
  })
})
