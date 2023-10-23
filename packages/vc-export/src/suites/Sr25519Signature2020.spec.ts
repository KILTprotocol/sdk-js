/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

// @ts-expect-error not a typescript module
import * as vcjs from '@digitalbazaar/vc'

import { base58Encode } from '@polkadot/util-crypto'
import { Types, init, W3C_CREDENTIAL_CONTEXT_URL } from '@kiltprotocol/core'
import * as Did from '@kiltprotocol/did'
import { Crypto } from '@kiltprotocol/utils'
import type { DidDocument, DidUri, KiltKeyringPair } from '@kiltprotocol/types'

import {
  combineDocumentLoaders,
  kiltContextsLoader,
  kiltDidLoader,
} from '../documentLoader.js'
import { Sr25519Signature2020 } from './Sr25519Signature2020.js'
import { Sr25519VerificationKey2020 } from './Sr25519VerificationKey.js'
import ingosCredential from '../examples/KiltCredentialV1.json'

// is not needed and imports a dependency that does not work in node 18
jest.mock('@digitalbazaar/http-client', () => ({}))

jest.mock('@kiltprotocol/did', () => ({
  ...jest.requireActual('@kiltprotocol/did'),
  dereference: jest.fn(),
}))

const documentLoader = combineDocumentLoaders([
  kiltDidLoader,
  kiltContextsLoader,
  vcjs.defaultDocumentLoader,
])

export async function makeFakeDid() {
  await init()
  const keypair = Crypto.makeKeypairFromUri('//Ingo', 'sr25519')
  const didDocument: DidDocument = {
    id: ingosCredential.credentialSubject.id as DidUri,
    authentication: ['#authentication'],
    assertionMethod: ['#assertion'],
    verificationMethod: [
      Did.didKeyToVerificationMethod(
        ingosCredential.credentialSubject.id as DidUri,
        '#authentication',
        { ...keypair, keyType: keypair.type }
      ),
      Did.didKeyToVerificationMethod(
        ingosCredential.credentialSubject.id as DidUri,
        '#assertion',
        { ...keypair, keyType: keypair.type }
      ),
    ],
  }

  jest.mocked(Did.dereference).mockImplementation(async (did) => {
    if (did.includes('light')) {
      return {
        contentMetadata: {},
        dereferencingMetadata: { contentType: 'application/did+json' },
        contentStream: Did.parseDocumentFromLightDid(did, false),
      }
    }
    if (did.startsWith(didDocument.id)) {
      return {
        contentMetadata: {},
        dereferencingMetadata: { contentType: 'application/did+json' },
        contentStream: didDocument,
      }
    }
    return {
      contentMetadata: {},
      dereferencingMetadata: { error: 'notFound' },
    }
  })
  return { didDocument, keypair }
}

let didDocument: DidDocument
let keypair: KiltKeyringPair

beforeAll(async () => {
  ;({ didDocument, keypair } = await makeFakeDid())
})

it('issues and verifies a signed credential', async () => {
  const signer = {
    sign: async ({ data }: { data: Uint8Array }) => keypair.sign(data),
    // TODO: This goes against the signer interface of the rest of the SDK, where `id` is supposed to be only the verification method ID. Change this.
    id: `${didDocument.id}${didDocument.assertionMethod![0]}`,
  }
  const attestationSigner = new Sr25519Signature2020({ signer })

  const credential = {
    '@context': [W3C_CREDENTIAL_CONTEXT_URL] as any,
    type: ['VerifiableCredential'],
    credentialSubject: ingosCredential.credentialSubject,
    issuer: ingosCredential.credentialSubject.id,
  } as Partial<Types.VerifiableCredential>

  const verifiableCredential = await vcjs.issue({
    credential,
    suite: attestationSigner,
    documentLoader,
  })

  let result = await vcjs.verifyCredential({
    credential: verifiableCredential,
    suite: new Sr25519Signature2020(),
    documentLoader,
  })
  expect(result).not.toHaveProperty('error')
  expect(result).toHaveProperty('verified', true)

  const authenticationMethod = didDocument.verificationMethod?.find(({ id }) =>
    id.includes('authentication')
  )
  const assertionMethod = didDocument.verificationMethod?.find(({ id }) =>
    id.includes('assertion')
  )
  const { publicKey } = Did.multibaseKeyToDidKey(
    assertionMethod!.publicKeyMultibase
  )
  const publicKeyBase58 = base58Encode(publicKey)

  result = await vcjs.verifyCredential({
    credential: verifiableCredential,
    suite: new Sr25519Signature2020({
      key: new Sr25519VerificationKey2020({
        ...assertionMethod,
        publicKeyBase58,
      }),
    }),
    documentLoader,
  })
  expect(result).not.toHaveProperty('error')
  expect(result).toHaveProperty('verified', true)

  result = await vcjs.verifyCredential({
    credential: verifiableCredential,
    suite: new Sr25519Signature2020({
      key: new Sr25519VerificationKey2020({
        ...authenticationMethod,
        publicKeyBase58: authenticationMethod!.publicKeyMultibase.substring(1),
      }),
    }),
    documentLoader,
  })
  expect(result).toHaveProperty('error')
  expect(result).toHaveProperty('verified', false)
})
