/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/claim
 */

import type { IClaim } from '@kiltprotocol/types'
import { hashClaimContents, toJsonLD } from './Claim.utils'

const claim: IClaim = {
  cTypeHash:
    '0x90364302f3b6ccfa50f3d384ec0ab6369711e13298ba4a5316d7e2addd5647b2',
  contents: {
    name: 'John',
    address: 'homestreet, home',
    number: 26,
    optIn: true,
  },
  owner: 'did:kilt:v1:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
}

it('exports claim as json-ld', () => {
  // this is what a kilt claim looks like when expressed in expanded JSON-LD
  const jsonld = toJsonLD(claim, true)
  expect(jsonld).toMatchInlineSnapshot(`
    Object {
      "https://www.w3.org/2018/credentials#credentialSchema": Object {
        "@id": "kilt:ctype:0x90364302f3b6ccfa50f3d384ec0ab6369711e13298ba4a5316d7e2addd5647b2",
      },
      "https://www.w3.org/2018/credentials#credentialSubject": Object {
        "@id": "did:kilt:v1:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs",
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
  const jsonld = toJsonLD(claim, false)
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
        "@id": "did:kilt:v1:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs",
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
  const digests = Object.keys(hashClaimContents(claim).nonceMap)
  const nonceMap = digests.sort().reduce((previous, current, i) => {
    return { ...previous, [current]: nonces[i] }
  }, {})
  // we expect the resulting hashes to be the same every time
  const hashed = hashClaimContents(claim, {
    nonces: nonceMap,
  })
  expect(hashed.nonceMap).toEqual(nonceMap)
  expect(hashed.hashes).toMatchInlineSnapshot(`
    Array [
      "0x0273330883aa3fbd5fb4c6ec5d21e9f49ac0d34351fe65fd7e6c3bffde993446",
      "0x212adfffe4314b9a05a3a6640782be1150258f17f2760208afc81e86cc91e9ef",
      "0x8a8089c46e1b363be1744120c122671260c77133fa680217cffcb8aa45521b9c",
      "0x90ae04b86e405bc258b944150cc97539f0561d14862e64ab739e4ff5db277058",
      "0xf19a54a1d85c6b4c457145f4acac0fb8112805c7ec60afe4208d0585adb5db03",
    ]
  `)
})

describe('compute hashes & validate by reproducing them', () => {
  // hash claim contents with randomly generated nonces
  const hashed = hashClaimContents(claim)
  const { hashes, nonceMap: nonces } = hashed

  it('reproduces hashes of full claim', () => {
    // when rehashing with the same nonces, the result must be identical
    const rehashed = hashClaimContents(claim, { nonces })
    expect(hashes).toEqual(rehashed.hashes)
  })

  it('reproduces hashes of partial claims', () => {
    // when rehashing a partial claim (some properties removed) while using the original nonces,
    // the resulting hashes must be among those computed in the original hashing
    Object.keys(claim.contents).forEach((property) => {
      // deep copy, then delete only a single property
      const partialClaim = JSON.parse(JSON.stringify(claim))
      delete partialClaim.contents[property]
      hashClaimContents(partialClaim, { nonces }).hashes.forEach((hash) => {
        expect(hashes).toContain(hash)
      })
      // remove all but one single property
      partialClaim.contents = { [property]: claim.contents[property] }
      hashClaimContents(partialClaim, { nonces }).hashes.forEach((hash) => {
        expect(hashes).toContain(hash)
      })
    })
  })
})
