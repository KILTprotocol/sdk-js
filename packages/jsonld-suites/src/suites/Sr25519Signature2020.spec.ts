/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

// @ts-expect-error not a typescript module
import * as vcjs from '@digitalbazaar/vc'

import { base58Encode } from '@polkadot/util-crypto'
import { Types, W3C_CREDENTIAL_CONTEXT_URL } from '@kiltprotocol/credentials'
import * as Did from '@kiltprotocol/did'
import { Crypto } from '@kiltprotocol/utils'
import type {
  DidDocument,
  Did as KiltDid,
  KiltKeyringPair,
} from '@kiltprotocol/types'

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
  resolve: jest.fn(),
}))

const documentLoader = combineDocumentLoaders([
  kiltDidLoader,
  kiltContextsLoader,
  vcjs.defaultDocumentLoader,
])

export async function makeFakeDid() {
  const keypair = Crypto.makeKeypairFromUri('//Ingo', 'sr25519')
  const id = ingosCredential.credentialSubject.id as KiltDid
  const didDocument: DidDocument = {
    id,
    authentication: [`${id}#authentication`],
    assertionMethod: [`${id}#assertion`],
    verificationMethod: [
      Did.didKeyToVerificationMethod(id, `${id}#authentication`, {
        ...keypair,
        keyType: keypair.type,
      }),
      Did.didKeyToVerificationMethod(id, `${id}#assertion`, {
        ...keypair,
        keyType: keypair.type,
      }),
    ],
  }

  jest.mocked(Did.resolve).mockImplementation(async (did) => {
    if (did.includes('light')) {
      return {
        didDocumentMetadata: {},
        didResolutionMetadata: {},
        didDocument: Did.parseDocumentFromLightDid(did, false),
      }
    }
    if (did.startsWith(didDocument.id)) {
      return {
        didDocumentMetadata: {},
        didResolutionMetadata: {},
        didDocument,
      }
    }
    return {
      didDocumentMetadata: {},
      didResolutionMetadata: { error: 'notFound' },
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
    id: didDocument.assertionMethod![0],
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

  const authenticationMethod = (() => {
    const vm = didDocument.verificationMethod?.find(({ id }) =>
      id.includes('authentication')
    )
    const { publicKey } = Did.multibaseKeyToDidKey(vm!.publicKeyMultibase)
    const publicKeyBase58 = base58Encode(publicKey)
    return {
      ...vm,
      id: vm!.id,
      publicKeyBase58,
    }
  })()
  const assertionMethod = (() => {
    const vm = didDocument.verificationMethod?.find(({ id }) =>
      id.includes('assertion')
    )
    const { publicKey } = Did.multibaseKeyToDidKey(vm!.publicKeyMultibase)
    const publicKeyBase58 = base58Encode(publicKey)
    return {
      ...vm,
      id: vm!.id,
      publicKeyBase58,
    }
  })()

  result = await vcjs.verifyCredential({
    credential: verifiableCredential,
    suite: new Sr25519Signature2020({
      key: new Sr25519VerificationKey2020({
        ...assertionMethod,
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
      }),
    }),
    documentLoader,
  })
  expect(result).toHaveProperty('error')
  expect(result).toHaveProperty('verified', false)
})
