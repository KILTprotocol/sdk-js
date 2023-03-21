/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/vc-export
 */

import { hexToU8a } from '@polkadot/util'
import {
  secp256k1PairFromSeed,
  ed25519PairFromSeed,
  randomAsU8a,
  encodeAddress,
} from '@polkadot/util-crypto'
import type { ApiPromise } from '@polkadot/api'
import type { Keypair } from '@polkadot/util-crypto/types'
import type { Codec } from '@polkadot/types/types'
import * as DidJwt from 'did-jwt'

import { init } from '@kiltprotocol/core'
import { Crypto } from '@kiltprotocol/utils'
import {
  exportToDidDocument,
  getFullDidUri,
  getFullDidUriFromKey,
} from '@kiltprotocol/did'
import { ApiMocks } from '@kiltprotocol/testing'
import type {
  DidDocument,
  DidVerificationKey,
  ResolvedDidKey,
  VerificationKeyType,
} from '@kiltprotocol/types'

import {
  create as createPresentation,
  signJwt,
  verifyJwt,
} from './Presentation'
import type { VerifiableCredential, VerifiablePresentation } from './types'

const credential = {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    'https://www.kilt.io/contexts/credentials',
  ],
  type: ['VerifiableCredential', 'KiltCredential2020'],
  id: 'kilt:cred:0x24195dd6313c0bb560f3043f839533b54bcd32d602dd848471634b0345ec88ad',
  credentialSubject: {
    '@context': {
      '@vocab':
        'kilt:ctype:0xf0fd09f9ed6233b2627d37eb5d6c528345e8945e0b610e70997ed470728b2ebf#',
    },
    birthday: '1991-01-01',
    name: 'Kurt',
    premium: true,
  },
  issuer: 'did:kilt:4sejigvu6STHdYmmYf2SuN92aNp8TbrsnBBDUj7tMrJ9Z3cG',
  issuanceDate: '2021-03-25T10:20:44.242Z',
  nonTransferable: true,
  proof: [
    {
      type: 'KILTAttestation2020',
      proofPurpose: 'assertionMethod',
      attester: 'did:kilt:4sejigvu6STHdYmmYf2SuN92aNp8TbrsnBBDUj7tMrJ9Z3cG',
    },
  ],
} as any

let api: ApiPromise
const seed = hexToU8a(
  '0xc48ea34c57ab63752ac5b797304de15cc036d126b96fb9c8198498d756c0579c'
)
const keyHash = Crypto.hashStr('key1')

function mockDidDoc(key: Keypair, type: VerificationKeyType) {
  const did = getFullDidUriFromKey({ ...key, type })
  const didKey: ResolvedDidKey = {
    id: `${did}#${keyHash}`,
    controller: did,
    publicKey: key.publicKey,
    type,
  }
  const didDocument: DidDocument = {
    uri: did,
    authentication: [{ ...didKey, id: `#${keyHash}` } as DidVerificationKey],
  }
  const onChainDoc = api.createType('Option<RawDidLinkedInfo>', {
    identifier: key.publicKey,
    details: {
      authenticationKey: keyHash,
      publicKeys: {
        [keyHash]: {
          key: { PublicVerificationKey: { [type]: key.publicKey } },
        },
      },
    },
  })
  return { did, didDocument, didKey, onChainDoc }
}

beforeAll(async () => {
  jest.useFakeTimers()
  jest.setSystemTime(1679407014000)
  api = ApiMocks.createAugmentedApi()
  api.call.did = {
    // @ts-ignore
    query: jest
      .fn()
      .mockResolvedValue(api.createType('Option<RawDidLinkedInfo>')),
  }
  api.query.did = {
    // @ts-ignore
    didBlacklist: jest.fn().mockResolvedValue(api.createType('Option<Null>')),
  }
  await init({ api })
})

it('verifies a presentation signed by an ecdsa key', async () => {
  const key = secp256k1PairFromSeed(seed)
  const { did, didKey, onChainDoc, didDocument } = mockDidDoc(key, 'ecdsa')
  jest.mocked(api.call.did.query).mockResolvedValue(onChainDoc)

  credential.credentialSubject.id = did

  const presentation = createPresentation([credential], did)

  const signedPres = await signJwt(
    presentation,
    {
      ...key,
      keyUri: didKey.id,
      type: 'ecdsa',
    },
    { challenge: 'abcdef', expiresIn: 60, audience: 'did:kilt:1234' }
  )

  const myResult = await verifyJwt(signedPres, {
    audience: 'did:kilt:1234',
    challenge: 'abcdef',
  })

  expect(myResult).toMatchObject({
    presentation,
    payload: { iss: did },
  })

  const result = await DidJwt.verifyJWT(signedPres, {
    // proofPurpose: 'authentication',
    audience: 'did:kilt:1234',
    resolver: {
      resolve: async () =>
        ({
          didDocument: exportToDidDocument(didDocument, 'application/ld+json'),
        } as any),
    },
  })

  expect(result).toMatchObject({ verified: true })
})

it('verifies a presentation signed by an ed25519 key', async () => {
  const key = ed25519PairFromSeed(seed)
  const { did, didKey, onChainDoc, didDocument } = mockDidDoc(key, 'ed25519')
  jest.mocked(api.call.did.query).mockResolvedValue(onChainDoc)

  credential.credentialSubject.id = did

  const presentation = createPresentation([credential], did)

  const signedPres = await signJwt(
    presentation,
    {
      ...key,
      keyUri: didKey.id,
      type: 'ed25519',
    },
    { challenge: 'abcdef', expiresIn: 60, audience: 'did:kilt:1234' }
  )

  const myResult = await verifyJwt(signedPres, {
    audience: 'did:kilt:1234',
    challenge: 'abcdef',
  })

  expect(myResult).toMatchObject({
    presentation,
    payload: { iss: did },
  })

  const result = await DidJwt.verifyJWT(signedPres, {
    // proofPurpose: 'authentication',
    audience: 'did:kilt:1234',
    resolver: {
      resolve: async () =>
        ({
          didDocument: exportToDidDocument(didDocument, 'application/ld+json'),
        } as any),
    },
  })

  expect(result).toMatchObject({ verified: true })
})

it('fails if subject !== holder', async () => {
  const key = ed25519PairFromSeed(seed)
  const { did, didKey, onChainDoc } = mockDidDoc(key, 'ed25519')
  jest.mocked(api.call.did.query).mockResolvedValue(onChainDoc)

  credential.credentialSubject.id = did

  const presentation = createPresentation([credential], did)

  // test making presentations
  const randomDid = getFullDidUri(encodeAddress(randomAsU8a(), 38))
  credential.credentialSubject.id = randomDid
  expect(() =>
    createPresentation([credential], did)
  ).toThrowErrorMatchingInlineSnapshot(
    `"The credential with id kilt:cred:0x24195dd6313c0bb560f3043f839533b54bcd32d602dd848471634b0345ec88ad is non-transferable and cannot be presented by the identity did:kilt:4qqbHjqZ45gLCjsoNS3PXECZpYZqHZuoGyWJZm1Jz8YFhMoo"`
  )

  // test verifying presentations

  // test verifying presentations
  ;(
    presentation.verifiableCredential as VerifiableCredential
  ).credentialSubject.id = randomDid
  const signedPres = await signJwt(presentation, {
    ...key,
    keyUri: didKey.id,
    type: 'ed25519',
  })

  await expect(
    verifyJwt(signedPres, {})
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"The credential with id kilt:cred:0x24195dd6313c0bb560f3043f839533b54bcd32d602dd848471634b0345ec88ad is non-transferable and cannot be presented by the identity did:kilt:4qqbHjqZ45gLCjsoNS3PXECZpYZqHZuoGyWJZm1Jz8YFhMoo"`
  )
})

it('fails if expired or not yet valid', async () => {
  const key = ed25519PairFromSeed(seed)
  const { did, didKey, onChainDoc } = mockDidDoc(key, 'ed25519')
  jest.mocked(api.call.did.query).mockResolvedValue(onChainDoc)

  credential.credentialSubject.id = did

  const presentation = createPresentation([credential], did)

  let signedPres = await signJwt(
    presentation,
    {
      ...key,
      keyUri: didKey.id,
      type: 'ed25519',
    },
    { validFrom: Date.now() - 70 * 1000, expiresIn: 60 }
  )

  await expect(
    verifyJwt(signedPres, {})
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"invalid_jwt: JWT has expired: exp: 1679407004 < now: 1679407014"`
  )

  signedPres = await signJwt(
    presentation,
    {
      ...key,
      keyUri: didKey.id,
      type: 'ed25519',
    },
    { validFrom: Date.now() + 60 * 1000 }
  )

  await expect(
    verifyJwt(signedPres, {})
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"invalid_jwt: JWT not valid before nbf: 1679407074"`
  )
})

describe('when there is a presentation', () => {
  let signedPresentation: string
  let presentation: VerifiablePresentation
  let onChainDoc: Codec
  let didDocument: DidDocument

  beforeAll(async () => {
    const key = ed25519PairFromSeed(seed)
    const mocks = mockDidDoc(key, 'ed25519')
    const { did, didKey } = mocks
    ;({ onChainDoc, didDocument } = mocks)

    credential.credentialSubject.id = did

    presentation = createPresentation([credential], did)

    signedPresentation = await signJwt(
      presentation,
      {
        ...key,
        keyUri: didKey.id,
        type: 'ed25519',
      },
      { challenge: 'abcdef', expiresIn: 60, audience: 'did:kilt:1234' }
    )
  })

  it('fails when DID doesnt exist', async () => {
    jest
      .mocked(api.call.did.query)
      .mockResolvedValue(api.createType('Option<RawDidLinkedInfo>'))

    await expect(
      verifyJwt(signedPresentation, {
        audience: 'did:kilt:1234',
        challenge: 'abcdef',
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"resolver_error: Unable to resolve DID document for did:kilt:4qqbHjqZ45gLCjsoNS3PXECZpYZqHZuoGyWJZm1Jz8YFhMoo: notFound, "`
    )

    await expect(
      DidJwt.verifyJWT(signedPresentation, {
        // proofPurpose: 'authentication',
        audience: 'did:kilt:1234',
        resolver: {
          resolve: async () =>
            ({
              didDocument: null,
              didResolutionMetadata: { error: 'notFound' },
            } as any),
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"resolver_error: Unable to resolve DID document for did:kilt:4qqbHjqZ45gLCjsoNS3PXECZpYZqHZuoGyWJZm1Jz8YFhMoo: notFound, "`
    )
  })

  it('fails when audience does not match', async () => {
    jest.mocked(api.call.did.query).mockResolvedValue(onChainDoc)

    await expect(
      verifyJwt(signedPresentation, {
        audience: 'did:kilt:4321',
        challenge: 'abcdef',
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"invalid_config: JWT audience does not match your DID or callback url"`
    )

    await expect(
      DidJwt.verifyJWT(signedPresentation, {
        // proofPurpose: 'authentication',
        audience: 'did:kilt:4321',
        resolver: {
          resolve: async () =>
            ({
              didDocument: exportToDidDocument(
                didDocument,
                'application/ld+json'
              ),
            } as any),
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"invalid_config: JWT audience does not match your DID or callback url"`
    )
  })

  it('fails if challenge does not match', async () => {
    jest.mocked(api.call.did.query).mockResolvedValue(onChainDoc)

    await expect(
      verifyJwt(signedPresentation, {
        challenge: 'whatup',
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"expected challenge not matching presentation"`
    )
  })
})
