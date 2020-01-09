import Claim from './Claim'
import CType from '../ctype/CType'
import Identity from '../identity/Identity'
import ICType from '../types/CType'
import * as CTypeUtils from '../ctype/CTypeUtils'

describe('Claim', () => {
  const identityAlice = Identity.buildFromURI('//Alice')

  const claimContents = {
    name: 'Bob',
  }

  const rawCType: ICType['schema'] = {
    $id: 'http://example.com/ctype-1',
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    properties: {
      name: { type: 'string' },
    },
    type: 'object',
  }
  const rawCTypeHash = CTypeUtils.getHashForSchema(rawCType)

  const fromRawCType: ICType = {
    schema: rawCType,
    owner: identityAlice.address,
    hash: rawCTypeHash,
  }

  const testCType: CType = CType.fromCType(fromRawCType)

  const claim = Claim.fromCTypeAndClaimContents(
    testCType,
    claimContents,
    identityAlice.address
  )

  it('can be made from object', () => {
    const claimObj = JSON.parse(JSON.stringify(claim))
    expect(Claim.fromClaim(claimObj, testCType.schema)).toEqual(claim)
  })
})
