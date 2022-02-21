/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/claim
 */

import { SDKErrors } from '@kiltprotocol/utils'
import type { IClaim, CompressedClaim, ICType } from '@kiltprotocol/types'
import * as CType from '../ctype/CType'
import * as Claim from './Claim'
import * as ClaimCompression from './Claim.compression'
import * as ClaimUtils from './Claim.utils'

describe('Claim', () => {
  let did: string
  let claimContents: any
  let rawCType: ICType['schema']
  let testCType: ICType
  let claim: IClaim
  let compressedClaim: CompressedClaim

  beforeAll(async () => {
    did = 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs'

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

    testCType = CType.fromSchema(rawCType)

    claim = Claim.fromCTypeAndClaimContents(testCType, claimContents, did)
    compressedClaim = [
      claim.cTypeHash,
      claim.owner,
      {
        name: 'Bob',
      },
    ]
  })

  it('can be made from object', () => {
    const claimObj = JSON.parse(JSON.stringify(claim))
    expect(Claim.verify(claimObj, testCType.schema)).not.toThrow()
  })

  it('allows falsy claim values', () => {
    const claimWithFalsy: IClaim = {
      ...claim,
      contents: {
        name: '',
      },
    }
    expect(() => ClaimUtils.verifyDataStructure(claimWithFalsy)).not.toThrow()
  })

  it('compresses and decompresses the Claim object', () => {
    expect(ClaimCompression.compress(claim)).toEqual(compressedClaim)

    expect(ClaimCompression.decompress(compressedClaim)).toEqual(claim)
  })

  it('Negative test for compresses and decompresses the Claim object', () => {
    compressedClaim.pop()
    // Claim type guard won't throw on deleted claim.owner
    // delete claim.owner

    // expect(() => {
    //   ClaimUtils.compress(claim)
    // }).toThrow()

    expect(() => {
      ClaimCompression.decompress(compressedClaim)
    }).toThrow()

    // expect(() => {
    //   claim.compress()
    // }).toThrow()
  })

  it('should throw an error on faulty constructor input', () => {
    const cTypeHash = testCType.hash
    const ownerAddress = did

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

    expect(() => ClaimUtils.verifyDataStructure(everything)).not.toThrow()

    expect(() =>
      ClaimUtils.verifyDataStructure(noCTypeHash)
    ).toThrowErrorWithCode(SDKErrors.ERROR_CTYPE_HASH_NOT_PROVIDED())

    expect(() =>
      ClaimUtils.verifyDataStructure(malformedCTypeHash)
    ).toThrowErrorWithCode(SDKErrors.ERROR_HASH_MALFORMED())

    expect(() =>
      ClaimUtils.verifyDataStructure(malformedAddress)
    ).toThrowErrorWithCode(SDKErrors.ERROR_ADDRESS_INVALID())
  })
})
