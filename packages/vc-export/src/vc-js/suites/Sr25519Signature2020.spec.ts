/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

// @ts-expect-error not a typescript module
import * as vcjs from '@digitalbazaar/vc'

import * as Did from '@kiltprotocol/did'
import type {
  ConformingDidDocument,
  DidUri,
  KiltKeyringPair,
} from '@kiltprotocol/types'
import { Crypto } from '@kiltprotocol/utils'

import { W3C_CREDENTIAL_CONTEXT_URL } from '../../constants.js'
import type { VerifiableCredential } from '../../types.js'
import {
  combineDocumentLoaders,
  kiltContextsLoader,
  kiltDidLoader,
} from '../documentLoader.js'
import ingosCredential from '../examples/ICredentialExample.json'
import { Sr25519Signature2020 } from './Sr25519Signature2020.js'
import { Sr25519VerificationKey2020 } from './Sr25519VerificationKey.js'

// is not needed and imports a dependency that does not work in node 18
jest.mock('@digitalbazaar/http-client', () => ({}))

jest.mock('@kiltprotocol/did', () => ({
  ...jest.requireActual('@kiltprotocol/did'),
  resolveCompliant: jest.fn(),
}))

const documentLoader = combineDocumentLoaders([
  kiltDidLoader,
  kiltContextsLoader,
  vcjs.defaultDocumentLoader,
])

export async function makeFakeDid() {
  const keypair = Crypto.makeKeypairFromUri('//Ingo', 'sr25519')
  const didDocument = Did.exportToDidDocument(
    {
      uri: ingosCredential.claim.owner as DidUri,
      authentication: [
        {
          ...keypair,
          id: '#authentication',
        },
      ],
      assertionMethod: [{ ...keypair, id: '#assertion' }],
    },
    'application/json'
  )
  jest.mocked(Did.resolveCompliant).mockImplementation(async (did) => {
    if (did.includes('light')) {
      return {
        didDocument: Did.exportToDidDocument(
          Did.parseDocumentFromLightDid(did, false),
          'application/json'
        ),
        didDocumentMetadata: {},
        didResolutionMetadata: {},
      }
    }
    if (did.startsWith(didDocument.id)) {
      return {
        didDocument,
        didDocumentMetadata: {},
        didResolutionMetadata: {},
      }
    }
    return {
      didDocumentMetadata: {},
      didResolutionMetadata: { error: 'notFound' },
    }
  })
  return { didDocument, keypair }
}

let didDocument: ConformingDidDocument
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
    credentialSubject: {
      '@context': {
        '@vocab': `kilt:ctype:${ingosCredential.claim.cTypeHash}#`,
      },
      id: ingosCredential.claim.owner,
      ...ingosCredential.claim.contents,
    },
    issuer: ingosCredential.claim.owner,
  } as Partial<VerifiableCredential>

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

  result = await vcjs.verifyCredential({
    credential: verifiableCredential,
    suite: new Sr25519Signature2020({
      key: new Sr25519VerificationKey2020({
        ...didDocument.verificationMethod.find(({ id }) =>
          id.includes('assertion')
        )!,
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
        ...didDocument.verificationMethod.find(({ id }) =>
          id.includes('authentication')
        )!,
      }),
    }),
    documentLoader,
  })
  expect(result).toHaveProperty('error')
  expect(result).toHaveProperty('verified', false)
})
