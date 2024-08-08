/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { createSigner, cryptosuite } from '@kiltprotocol/sr25519-jcs-2023'
import { randomAsHex, sr25519PairFromSeed } from '@polkadot/util-crypto'

import { didKeyToVerificationMethod, resolve } from '@kiltprotocol/did'
import type { Did } from '@kiltprotocol/types'

import { createProof, verifyProof, signWithDid } from '../proofs/DataIntegrity'
import {
  create as createPresentation,
  verifyPresentationProof,
} from './Presentation'
import { VerifyPresentationResult } from '../interfaces'

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
    id: 'did:kilt:4sejigvu6STHdYmmYf2SuN92aNp8TbrsnBBDUj7tMrJ9Z3cG',
    birthday: '1991-01-01',
    name: 'Kurt',
    premium: true,
  },
  issuer: 'did:kilt:4sejigvu6STHdYmmYf2SuN92aNp8TbrsnBBDUj7tMrJ9Z3cG',
  issuanceDate: '2021-03-25T10:20:44.000Z',
  nonTransferable: true,
  proof: [
    {
      type: 'KILTAttestation2020',
      proofPurpose: 'assertionMethod',
      attester: 'did:kilt:4sejigvu6STHdYmmYf2SuN92aNp8TbrsnBBDUj7tMrJ9Z3cG',
    },
  ],
} as any

const seed = new Uint8Array(32).fill(0)

it('creates a presentation', async () => {
  const presentation = await createPresentation({
    credentials: [credential],
    holder: credential.credentialSubject.id,
  })
  expect(presentation).toHaveProperty(
    'type',
    expect.arrayContaining(['VerifiablePresentation'])
  )
})

it('fails if subject !== holder', async () => {
  const randomDid = 'did:kilt:4qqbHjqZ45gLCjsoNS3PXECZpYZqHZuoGyWJZm1Jz8YFhMoo'
  await expect(
    createPresentation({ credentials: [credential], holder: randomDid })
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"The credential with id kilt:cred:0x24195dd6313c0bb560f3043f839533b54bcd32d602dd848471634b0345ec88ad is non-transferable and cannot be presented by the identity did:kilt:4qqbHjqZ45gLCjsoNS3PXECZpYZqHZuoGyWJZm1Jz8YFhMoo"`
  )
})

it('signs', async () => {
  const presentation = await createPresentation({
    credentials: [credential],
    holder: credential.credentialSubject.id,
  })
  const signer = await createSigner({
    seed,
    id: `${credential.credentialSubject.id}#key-1`,
  })
  const signed = await createProof(presentation, cryptosuite, signer)
  expect(signed).toHaveProperty(
    'proof',
    expect.objectContaining({ type: 'DataIntegrityProof' })
  )
})

jest.mock('@kiltprotocol/did', () => {
  return {
    ...jest.requireActual('@kiltprotocol/did'),
    resolve: jest.fn(),
  }
})

describe('verification', () => {
  const signerDid = credential.credentialSubject.id as Did
  const vmUrl = `${signerDid}#key-1` as const

  beforeAll(async () => {
    const { publicKey } = sr25519PairFromSeed(seed)

    jest.mocked(resolve).mockImplementation(async (did: string) => {
      if (did.startsWith(signerDid)) {
        return {
          didDocumentMetadata: {},
          didResolutionMetadata: {},
          didDocument: {
            id: signerDid,
            verificationMethod: [
              didKeyToVerificationMethod(signerDid, vmUrl, {
                publicKey,
                keyType: 'sr25519',
              }),
            ],
            assertionMethod: [vmUrl],
            authentication: [vmUrl],
          },
        }
      }
      return {
        didResolutionMetadata: { error: 'notFound' },
        didDocumentMetadata: {},
      }
    })
  })
  it('verifies a signature', async () => {
    const presentation = await createPresentation({
      credentials: [credential],
      holder: credential.credentialSubject.id,
    })

    const signer = await createSigner({
      seed,
      id: vmUrl,
    })
    const signed = await createProof(presentation, cryptosuite, signer, {
      proofPurpose: 'assertionMethod',
    })
    await expect(
      verifyProof(signed, signed.proof, {
        cryptosuites: [cryptosuite],
        expectedProofPurpose: 'assertionMethod',
      })
    ).resolves.toBe(true)
  })

  it('verifies a presentation proof', async () => {
    const signer = await createSigner({
      seed,
      id: vmUrl,
    })
    const challenge = randomAsHex()
    let presentation = await createPresentation({
      credentials: [credential],
      holder: signerDid,
      verifier: 'did:web:example.com',
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 10_000),
    })

    presentation = await signWithDid({
      signerDid,
      document: presentation,
      signers: [signer],
      challenge,
    })

    const result = await verifyPresentationProof(presentation, {
      verifier: 'did:web:example.com',
      challenge,
    })

    expect(result).not.toHaveProperty('error')
    expect(result).toMatchObject<typeof result>({
      verified: true,
      proofResults: [expect.objectContaining({ verified: true })],
    })

    await expect(
      verifyPresentationProof(presentation, {
        verifier: 'did:web:example.de',
        challenge,
      })
    ).resolves.toMatchObject({
      verified: false,
      error: expect.arrayContaining([expect.any(Error)]),
    })

    await expect(
      verifyPresentationProof(presentation, {
        verifier: 'did:web:example.com',
        challenge: `${challenge}00`,
      })
    ).resolves.toMatchObject({
      verified: false,
      proofResults: [expect.objectContaining({ verified: false })],
      error: expect.arrayContaining([expect.any(Error)]),
    })

    presentation.expirationDate = new Date(2999, 1, 1).toISOString()
    await expect(
      verifyPresentationProof(presentation, {
        verifier: 'did:web:example.com',
        challenge,
      })
    ).resolves.toMatchObject<VerifyPresentationResult>({
      verified: false,
      proofResults: [expect.objectContaining({ verified: false })],
      error: expect.arrayContaining([expect.any(Error)]),
    })
  })
})
