/**
 * @packageDocumentation
 * @group unit/claim
 * @ignore
 */

import { IClaim, CompressedClaim, ICType } from '@kiltprotocol/types'
import CType from '../ctype/CType'
import {
  ERROR_ADDRESS_INVALID,
  ERROR_CTYPE_HASH_NOT_PROVIDED,
  ERROR_HASH_MALFORMED,
} from '../errorhandling/SDKErrors'
import Identity from '../identity/Identity'
import Claim from './Claim'
import ClaimUtils from './Claim.utils'

describe('Claim', () => {
  let identityAlice: Identity
  let claimContents: any
  let rawCType: ICType['schema']
  let testCType: CType
  let claim: Claim
  let compressedClaim: CompressedClaim

  beforeAll(async () => {
    identityAlice = Identity.buildFromURI('//Alice')

    claimContents = {
      name: 'Bob',
    }

    rawCType = {
      $id: 'kilt:ctype:0x1',
      $schema: 'http://kilt-protocol.org/draft-01/ctype#',
      title: 'ClaimCtype',
      properties: {
        name: { type: 'string' },
      },
      type: 'object',
    }

    testCType = CType.fromSchema(rawCType, identityAlice.address)

    claim = Claim.fromCTypeAndClaimContents(
      testCType,
      claimContents,
      identityAlice.address
    )
    compressedClaim = [
      {
        name: 'Bob',
      },
      claim.cTypeHash,
      claim.owner,
    ]
  })

  it('can be made from object', () => {
    const claimObj = JSON.parse(JSON.stringify(claim))
    expect(Claim.fromClaim(claimObj, testCType.schema)).toEqual(claim)
  })

  it('allows falsy claim values', () => {
    const claimWithFalsy: IClaim = {
      ...claim,
      contents: {
        name: '',
      },
    }
    expect(() => ClaimUtils.errorCheck(claimWithFalsy)).not.toThrow()
  })

  it('compresses and decompresses the Claim object', () => {
    expect(ClaimUtils.compress(claim)).toEqual(compressedClaim)

    expect(ClaimUtils.decompress(compressedClaim)).toEqual(claim)

    expect(Claim.decompress(compressedClaim)).toEqual(claim)

    expect(claim.compress()).toEqual(compressedClaim)
  })

  it('Negative test for compresses and decompresses the Claim object', () => {
    compressedClaim.pop()
    // Claim type guard won't throw on deleted claim.owner
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
    const ownerAddress = identityAlice.signKeyringPair.address

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

    const malformedCTypeHash = {
      cTypeHash: cTypeHash.slice(0, 20) + cTypeHash.slice(21),
      contents: claimContents,
      owner: ownerAddress,
    } as IClaim

    const malformedAddress = {
      cTypeHash,
      contents: claimContents,
      owner: ownerAddress.replace('8', 'D'),
    } as IClaim

    expect(() => ClaimUtils.errorCheck(everything)).not.toThrow()

    expect(() => ClaimUtils.errorCheck(noCTypeHash)).toThrowError(
      ERROR_CTYPE_HASH_NOT_PROVIDED()
    )

    expect(() => ClaimUtils.errorCheck(malformedCTypeHash)).toThrowError(
      ERROR_HASH_MALFORMED(malformedCTypeHash.cTypeHash, 'Claim CType')
    )
    expect(() => ClaimUtils.errorCheck(malformedAddress)).toThrowError(
      ERROR_ADDRESS_INVALID(malformedAddress.owner, 'Claim owner')
    )
  })
})
