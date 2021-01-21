/**
 * @packageDocumentation
 * @group unit/claim
 * @ignore
 */

import { IClaim } from '..'
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
  owner: '5D4FoyWD1y4Zn2UM4PiG8PAzmamUbCehpfFChiqyCXD7E2B4',
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
        "@id": "did:kilt:5D4FoyWD1y4Zn2UM4PiG8PAzmamUbCehpfFChiqyCXD7E2B4",
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
        "@id": "did:kilt:5D4FoyWD1y4Zn2UM4PiG8PAzmamUbCehpfFChiqyCXD7E2B4",
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
  const nonces = {
    '0x1481712e2e8f2f8372216510c487a82543ab5e901a447afb8dfe1366cd73781e':
      '276b53b6-37db-4179-822e-ed2337a5b889',
    '0x3f490cb42d224c339cc92381d2205b8c44afb29155b1f24189688c9fa09341fd':
      'a63ff753-2622-4312-b612-571495c1bc9d',
    '0x88e53f8d7e8cced445ffc89453448077cd154671ead1df4945a0b07bf8eab299':
      'd5ceaebd-1e0e-432a-a501-58baa2f66e59',
    '0xb1f984b606d073d2ae8e8802c383e78af4786ffe381994fe87a7cb47f4f9e035':
      '8db12d9e-26c0-49c0-bf91-818d6cc6116a',
    '0x4b88ab9b8ada95d425c767c58f32f83b7b479ac25b0c3defbbbf571ec07d3a5a':
      '81687a00-f759-4fee-a68c-d9085f9d32f5',
  }
  // we expect the resulting hashes to be the same every time
  const hashed = hashClaimContents(claim, {
    nonces,
  })
  expect(hashed.nonceMap).toEqual(nonces)
  expect(hashed.hashes).toMatchInlineSnapshot(`
    Array [
      "0x06a9f901566d6f095f256d72e7f93ecdea2fd040b591ff53a6df1fdca33c5094",
      "0x72f198fbfa727874e18d758ac3a4664437eaa2c7c651352f649ca9ad281a9553",
      "0x8a8089c46e1b363be1744120c122671260c77133fa680217cffcb8aa45521b9c",
      "0xad82658110207f8e65e1c2ae196ec7952aacda0aa9f19c83ce18b60612fe909a",
      "0xf5db5c377a5e85ba94a457d5be8b8ec05419c3e0a666147d6ed86b45089374bd",
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
