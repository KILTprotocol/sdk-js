/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { createSigner, cryptosuite } from '@kiltprotocol/sr25519-jcs-2023'
import { randomAsHex, sr25519PairFromSeed } from '@polkadot/util-crypto'

import { didKeyToVerificationMethod, resolve } from '@kiltprotocol/did'
import type { Did } from '@kiltprotocol/types'

import { createProof, verifyProof } from './DataIntegrity'
import {
  create as createPresentation,
  verify as verifyPresentation,
} from './Presentation'

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
  const keyId = `#key-1`

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
              didKeyToVerificationMethod(signerDid, keyId, {
                publicKey,
                keyType: 'sr25519',
              }),
            ],
            assertionMethod: [keyId],
            authentication: [keyId],
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
      id: signerDid + keyId,
    })
    const signed = await createProof(presentation, cryptosuite, signer, {
      purpose: 'assertionMethod',
    })
    await expect(
      verifyProof(signed, {
        cryptosuites: [cryptosuite],
        expectedProofPurpose: 'assertionMethod',
      })
    ).resolves.toBe(true)
  })

  it('verifies a signed presentation', async () => {
    const signer = await createSigner({
      seed,
      id: signerDid + keyId,
    })
    const challenge = randomAsHex()
    const presentation = await createPresentation({
      credentials: [
        // credential
      ],
      holder: signerDid,
      signers: [signer],
      // purpose: 'authentication',
      verifier: 'did:web:example.com',
      challenge,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 10_000),
    })

    const result = await verifyPresentation(presentation, {
      verifier: 'did:web:example.com',
      challenge,
    })

    // console.log(result)

    expect(result).toMatchObject({
      verified: true,
      presentation: { verified: true },
    })

    await expect(
      verifyPresentation(presentation, {
        verifier: 'did:web:example.de',
        challenge,
      })
    ).resolves.toMatchObject({
      verified: false,
      presentation: { verified: false },
    })

    await expect(
      verifyPresentation(presentation, {
        verifier: 'did:web:example.com',
        challenge: `${challenge}00`,
      })
    ).resolves.toMatchObject({
      verified: false,
      presentation: { verified: false },
    })

    presentation.verifiableCredential = [credential]
    await expect(
      verifyPresentation(presentation, {
        verifier: 'did:web:example.com',
        challenge,
      })
    ).resolves.toMatchObject({
      verified: false,
      presentation: { verified: false },
    })
  })
})
