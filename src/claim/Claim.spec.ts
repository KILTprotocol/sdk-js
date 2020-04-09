import Claim from './Claim'
import ClaimUtils from './Claim.utils'

import CType from '../ctype/CType'
import Identity from '../identity/Identity'
import ICType from '../types/CType'
import IClaim, { CompressedClaim } from '../types/Claim'
import CTypeUtils from '../ctype/CType.utils'

describe('Claim', () => {
  let identityAlice: Identity
  let claimContents: any
  let rawCType: ICType['schema']
  let fromRawCType: ICType
  let testCType: CType
  let claim: Claim
  let compressedClaim: CompressedClaim

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
    compressedClaim = [
      {
        name: 'Bob',
      },
      '0xa8c5bdb22aaea3fceb5467d37169cbe49c71f226233037537e70a32a032304ff',
      '5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TTpu',
    ]
  })

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
    // Claim typeguard won't throw on deleted claim.owner
    // delete claim.owner

    // expect(() => {
    //   ClaimUtils.compress(claim)
    // }).toThrow()

    expect(() => {
      ClaimUtils.decompress(compressedClaim)
    }).toThrow()

    expect(() => {
      Claim.decompress(compressedClaim)
    }).toThrow()

    // expect(() => {
    //   claim.compress()
    // }).toThrow()
  })

  it('should throw an error on faulty constructor input', () => {
    const cTypeHash = testCType.hash
    const ownerAddress = identityAlice.address

    const everything = {
      cTypeHash,
      contents: claimContents,
      owner: ownerAddress,
    } as IClaim

    const noCTypeHash = {
      cTypeHash: '',
      contents: claimContents,
      owner: ownerAddress,
    } as IClaim

    // Currently empty contents object passes input checks
    // const noContents = {
    //   cTypeHash,
    //   contents: {},
    //   owner: ownerAddress,
    // } as IClaim

    // const noOwner = {
    //   cTypeHash,
    //   contents: claimContents,
    //   owner: '',
    // } as IClaim

    const nothing = {
      cTypeHash: '',
      contents: {},
      owner: '',
    }

    const malformedCTypeHash = {
      cTypeHash: cTypeHash.slice(0, 20) + cTypeHash.slice(21),
      contents: claimContents,
      owner: ownerAddress,
    }

    const malformedAddress = {
      cTypeHash,
      contents: claimContents,
      owner: ownerAddress.replace('7', 'D'),
    }

    expect(() => Claim.isIClaim(everything)).not.toThrow()

    expect(() =>
      Claim.isIClaim(noCTypeHash)
    ).toThrowErrorMatchingInlineSnapshot(`"property of provided Claim not set"`)

    // expect(Claim.isIClaim(noContents)).toThrowErrorMatchingInlineSnapshot()

    // expect(Claim.isIClaim(noOwner)).toThrowErrorMatchingInlineSnapshot()

    expect(() => Claim.isIClaim(nothing)).toThrowErrorMatchingInlineSnapshot(
      `"property of provided Claim not set"`
    )

    expect(() => Claim.isIClaim(malformedCTypeHash))
      .toThrowErrorMatchingInlineSnapshot(`
"Provided Claim CType hash invalid or malformed 

    Hash: 0xa8c5bdb22aaea3fceb467d37169cbe49c71f226233037537e70a32a032304ff"
`)
    // TODO : catch Errors and string/regex match the Error
    expect(() => Claim.isIClaim(malformedAddress))
      .toThrowErrorMatchingInlineSnapshot(`
"Provided Claim Owner address invalid 

    Address: 5FA9nQDVg26DDEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TTpu"
`)
  })
})
