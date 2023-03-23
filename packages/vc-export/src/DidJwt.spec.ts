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
import { ed25519PairFromSeed } from '@polkadot/util-crypto'
import type { Keypair } from '@polkadot/util-crypto/types'

import { init } from '@kiltprotocol/core'
import {
  exportToDidDocument,
  getFullDidUriFromKey,
  resolveCompliant,
} from '@kiltprotocol/did'
import type {
  ConformingDidDocument,
  DidVerificationKey,
  VerificationKeyType,
} from '@kiltprotocol/types'

import * as JWT from './DidJwt'
import * as Presentation from './Presentation'
import type { VerifiableCredential } from './types'

jest.mock('@kiltprotocol/did', () => ({
  ...jest.requireActual('@kiltprotocol/did'),
  resolveCompliant: jest.fn(),
}))

const seed = hexToU8a(
  '0xc48ea34c57ab63752ac5b797304de15cc036d126b96fb9c8198498d756c0579c'
)

function mockDidDoc(key: Keypair, type: VerificationKeyType) {
  const did = getFullDidUriFromKey({ ...key, type })
  const didKey = {
    controller: did,
    publicKey: key.publicKey,
    type,
  }
  const didDocument: ConformingDidDocument = exportToDidDocument(
    {
      uri: did,
      authentication: [{ ...didKey, id: `#key1` } as DidVerificationKey],
      assertionMethod: [{ ...didKey, id: `#key2` } as DidVerificationKey],
    },
    'application/json'
  )
  return { didDocument, did, didKey }
}

jest.useFakeTimers()
jest.setSystemTime(1679407014000)

const key = ed25519PairFromSeed(seed)
const { didDocument, did } = mockDidDoc(key, 'ed25519')
jest.mocked(resolveCompliant).mockImplementation(async (d) => {
  if (d === did)
    return {
      didDocument,
      didDocumentMetadata: {},
      didResolutionMetadata: {},
    }
  return {
    didResolutionMetadata: {
      error: 'notFound',
    },
    didDocumentMetadata: {},
  }
})

beforeAll(async () => {
  await init({})
})

it('produces and reverses JWT payload representations of a credential and presentation', () => {
  const credential = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://www.kilt.io/contexts/credentials',
    ],
    type: ['VerifiableCredential', 'KiltCredentialV1'],
    id: 'kilt:credential:0x24195dd6313c0bb560f3043f839533b54bcd32d602dd848471634b0345ec88ad',
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
    expirationDate: '2022-03-25T10:20:44.000Z',
    nonTransferable: true,
    proof: {
      type: 'KiltAttestationProofV1',
      block: '1234567890',
      commitments: ['censored'],
      salt: ['censored'],
    },
    credentialSchema: {
      type: 'JsonSchemaValidator2018',
      id: 'kilt:ctype:0xf0fd09f9ed6233b2627d37eb5d6c528345e8945e0b610e70997ed470728b2ebf',
    },
    credentialStatus: {
      id: 'polkadot:1234567890:0x24195dd6313c0bb560f3043f839533b54bcd32d602dd848471634b0345ec88ad',
      type: 'KiltRevocationStatusV1',
    },
  } as VerifiableCredential

  let payload = JWT.credentialToPayload(credential)
  const fromPayload = JWT.credentialFromPayload(payload)
  expect(credential).toStrictEqual(fromPayload)

  const presentation = Presentation.create(
    [credential],
    credential.credentialSubject.id
  )
  payload = JWT.presentationToPayload(presentation)
  const fromPayload2 = JWT.presentationFromPayload(payload)
  expect(presentation).toStrictEqual(fromPayload2)
})

it('verifies a JWT signed by an ed25519 key', async () => {
  const credential: Partial<VerifiableCredential> = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://www.kilt.io/contexts/credentials',
    ],
    type: ['VerifiableCredential'],
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
    issuer: didDocument.id,
    issuanceDate: new Date().toISOString(),
    nonTransferable: true,
  }

  const payload = JWT.credentialToPayload(credential as VerifiableCredential)

  const signedJWT = await JWT.create(
    payload,
    {
      ...key,
      keyUri: `${didDocument.id}${didDocument.assertionMethod![0]}`,
      type: 'ed25519',
    },
    { expiresIn: 60 }
  )

  const result = await JWT.verify(signedJWT, {
    proofPurpose: 'assertionMethod',
  })

  expect(result).toMatchObject({
    payload: JSON.parse(JSON.stringify(payload)),
  })

  const fromPayload = JWT.credentialFromPayload(result.payload)

  expect(fromPayload).toMatchObject(credential)
  expect(fromPayload).toHaveProperty('expirationDate')
})
