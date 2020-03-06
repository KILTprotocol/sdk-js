import Claim from './Claim'
import CType from '../ctype/CType'
import Identity from '../identity/Identity'
import ICType from '../types/CType'

describe('Claim', () => {
  let identityAlice: Identity
  let claimContents: any
  let rawCType: ICType['schema']
  let fromRawCType: ICType
  let testCType: CType
  let claim: Claim

  beforeAll(async () => {
    identityAlice = await Identity.buildFromURI('//Alice')

    claimContents = {
      name: 'Bob',
    }

    rawCType = {
      $id: 'http://example.com/ctype-1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    }

    fromRawCType = {
      schema: rawCType,
      owner: identityAlice.getAddress(),
      hash: '',
    }

    testCType = CType.fromCType(fromRawCType)

    claim = Claim.fromCTypeAndClaimContents(
      testCType,
      claimContents,
      identityAlice.getAddress()
    )
  })
  it('can be made from object', () => {
    const claimObj = JSON.parse(JSON.stringify(claim))
    expect(Claim.fromClaim(claimObj, testCType.schema)).toEqual(claim)
  })
})
