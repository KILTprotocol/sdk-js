/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/claim
 */

import { SDKErrors } from '@kiltprotocol/utils'
import type {
  IClaim,
  CompressedClaim,
  ICType,
  DidUri,
} from '@kiltprotocol/types'
import * as CType from '../ctype'
import * as Claim from './Claim'

describe('jsonld', () => {
  const claim: IClaim = {
    cTypeHash:
      '0x90364302f3b6ccfa50f3d384ec0ab6369711e13298ba4a5316d7e2addd5647b2',
    contents: {
      name: 'John',
      address: 'homestreet, home',
      number: 26,
      optIn: true,
    },
    owner: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
  }

  it('exports claim as json-ld', () => {
    // this is what a kilt claim looks like when expressed in expanded JSON-LD
    const jsonld = Claim.toJsonLD(claim, true)
    expect(jsonld).toMatchInlineSnapshot(`
      Object {
        "https://www.w3.org/2018/credentials#credentialSchema": Object {
          "@id": "kilt:ctype:0x90364302f3b6ccfa50f3d384ec0ab6369711e13298ba4a5316d7e2addd5647b2",
        },
        "https://www.w3.org/2018/credentials#credentialSubject": Object {
          "@id": "did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs",
          "kilt:ctype:0x90364302f3b6ccfa50f3d384ec0ab6369711e13298ba4a5316d7e2addd5647b2#address": "homestreet, home",
          "kilt:ctype:0x90364302f3b6ccfa50f3d384ec0ab6369711e13298ba4a5316d7e2addd5647b2#name": "John",
          "kilt:ctype:0x90364302f3b6ccfa50f3d384ec0ab6369711e13298ba4a5316d7e2addd5647b2#number": 26,
          "kilt:ctype:0x90364302f3b6ccfa50f3d384ec0ab6369711e13298ba4a5316d7e2addd5647b2#optIn": true,
        },
      }
    `)
  })

  it('exports claim as json-ld', () => {
    // this is what a kilt claim looks like when expressed in compact JSON-LD
    const jsonld = Claim.toJsonLD(claim, false)
    expect(jsonld).toMatchInlineSnapshot(`
      Object {
        "@context": Object {
          "@vocab": "https://www.w3.org/2018/credentials#",
        },
        "credentialSchema": Object {
          "@id": "kilt:ctype:0x90364302f3b6ccfa50f3d384ec0ab6369711e13298ba4a5316d7e2addd5647b2",
        },
        "credentialSubject": Object {
          "@context": Object {
            "@vocab": "kilt:ctype:0x90364302f3b6ccfa50f3d384ec0ab6369711e13298ba4a5316d7e2addd5647b2#",
          },
          "@id": "did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs",
          "address": "homestreet, home",
          "name": "John",
          "number": 26,
          "optIn": true,
        },
      }
    `)
  })

  it('validates hashes from snapshot', () => {
    // given some nonces...
    const nonces = [
      '276b53b6-37db-4179-822e-ed2337a5b889',
      'a63ff753-2622-4312-b612-571495c1bc9d',
      'd5ceaebd-1e0e-432a-a501-58baa2f66e59',
      '8db12d9e-26c0-49c0-bf91-818d6cc6116a',
      '81687a00-f759-4fee-a68c-d9085f9d32f5',
    ]
    const digests = Object.keys(Claim.hashClaimContents(claim).nonceMap)
    const nonceMap = digests
      .sort()
      .reduce(
        (previous, current, i) => ({ ...previous, [current]: nonces[i] }),
        {}
      )
    // we expect the resulting hashes to be the same every time
    const hashed = Claim.hashClaimContents(claim, {
      nonces: nonceMap,
    })
    expect(hashed.nonceMap).toEqual(nonceMap)
    expect(hashed.hashes).toMatchInlineSnapshot(`
      Array [
        "0x3c2ae125a0baf4ed64a30b7ad012810b4622628a2eb5ad32e769e6a1d356d58d",
        "0x69aae66efd954c3712e91dd2761dab08ea941e6516e7cf6ddf6e3b90ddc5bdf3",
        "0x8d5736197583931c4e4d3dce0503596760f7a13e8187cc440b7de1edd4370d6a",
        "0xad82658110207f8e65e1c2ae196ec7952aacda0aa9f19c83ce18b60612fe909a",
        "0xf5db5c377a5e85ba94a457d5be8b8ec05419c3e0a666147d6ed86b45089374bd",
      ]
    `)
  })
})

describe('compute hashes & validate by reproducing them', () => {
  const claim: IClaim = {
    cTypeHash:
      '0x90364302f3b6ccfa50f3d384ec0ab6369711e13298ba4a5316d7e2addd5647b2',
    contents: {
      name: 'John',
      address: 'homestreet, home',
      number: 26,
      optIn: true,
    },
    owner: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
  }

  // hash claim contents with randomly generated nonces
  const hashed = Claim.hashClaimContents(claim)
  const { hashes, nonceMap: nonces } = hashed

  it('reproduces hashes of full claim', () => {
    // when rehashing with the same nonces, the result must be identical
    const rehashed = Claim.hashClaimContents(claim, { nonces })
    expect(hashes).toEqual(rehashed.hashes)
  })

  it('reproduces hashes of partial claims', () => {
    // when rehashing a partial claim (some properties removed) while using the original nonces,
    // the resulting hashes must be among those computed in the original hashing
    Object.keys(claim.contents).forEach((property) => {
      // deep copy, then delete only a single property
      const partialClaim = JSON.parse(JSON.stringify(claim))
      delete partialClaim.contents[property]
      Claim.hashClaimContents(partialClaim, { nonces }).hashes.forEach(
        (hash) => {
          expect(hashes).toContain(hash)
        }
      )
      // remove all but one single property
      partialClaim.contents = { [property]: claim.contents[property] }
      Claim.hashClaimContents(partialClaim, { nonces }).hashes.forEach(
        (hash) => {
          expect(hashes).toContain(hash)
        }
      )
    })
  })
})

describe('Claim', () => {
  let did: DidUri
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
    expect(() => Claim.verify(claimObj, testCType.schema)).not.toThrow()
  })

  it('allows falsy claim values', () => {
    const claimWithFalsy: IClaim = {
      ...claim,
      contents: {
        name: '',
      },
    }
    expect(() => Claim.verifyDataStructure(claimWithFalsy)).not.toThrow()
  })

  it('compresses and decompresses the Claim object', () => {
    expect(Claim.compress(claim)).toEqual(compressedClaim)

    expect(Claim.decompress(compressedClaim)).toEqual(claim)
  })

  it('Negative test for compresses and decompresses the Claim object', () => {
    compressedClaim.pop()
    // Claim type guard won't throw on deleted claim.owner
    // delete claim.owner

    // expect(() => {
    //   Claim.compress(claim)
    // }).toThrow()

    expect(() => {
      Claim.decompress(compressedClaim)
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

    // @ts-ignore
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

    expect(() => Claim.verifyDataStructure(everything)).not.toThrow()

    expect(() => Claim.verifyDataStructure(noCTypeHash)).toThrowError(
      SDKErrors.ERROR_CTYPE_HASH_NOT_PROVIDED
    )

    expect(() => Claim.verifyDataStructure(malformedCTypeHash)).toThrowError(
      SDKErrors.ERROR_HASH_MALFORMED
    )

    expect(() => Claim.verifyDataStructure(malformedAddress)).toThrowError(
      SDKErrors.ERROR_ADDRESS_INVALID
    )
  })
})
