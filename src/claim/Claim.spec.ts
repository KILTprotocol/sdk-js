import Claim from './Claim'
import ClaimUtils from './Claim.utils'

import CType from '../ctype/CType'
import Identity from '../identity/Identity'
import ICType from '../types/CType'
import { CompressedClaim } from '../types/Claim'

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

  const fromRawCType: ICType = {
    schema: rawCType,
    owner: identityAlice.address,
    hash: '',
  }

  const testCType: CType = CType.fromCType(fromRawCType)

  const claim = Claim.fromCTypeAndClaimContents(
    testCType,
    claimContents,
    identityAlice.address
  )

  const compressedClaim: CompressedClaim = [
    {
      name: 'Bob',
    },
    '0xa8c5bdb22aaea3fceb5467d37169cbe49c71f226233037537e70a32a032304ff',
    '5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TTpu',
  ]

  it('can be made from object', () => {
    const claimObj = JSON.parse(JSON.stringify(claim))
    expect(Claim.fromClaim(claimObj, testCType.schema)).toEqual(claim)
  })

  it('compresses and decompresses the Claim object', () => {
    expect(ClaimUtils.compress(claim)).toEqual(compressedClaim)

    expect(ClaimUtils.decompress(compressedClaim)).toEqual(claim)

    expect(Claim.decompress(compressedClaim)).toEqual(claim)

    expect(claim.compress()).toEqual(compressedClaim)
  })

  it('Negative test for compresses and decompresses the Claim object', () => {
    compressedClaim.pop()
    delete claim.owner

    expect(() => {
      ClaimUtils.compress(claim)
    }).toThrow()

    expect(() => {
      ClaimUtils.decompress(compressedClaim)
    }).toThrow()

    expect(() => {
      Claim.decompress(compressedClaim)
    }).toThrow()

    expect(() => {
      claim.compress()
    }).toThrow()
  })
})
