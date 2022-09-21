/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { Keyring } from '@polkadot/api'

import { DidDocument, DidServiceEndpoint, DidUri } from '@kiltprotocol/types'
import { ss58Format } from '@kiltprotocol/utils'

import { CreateDocumentInput } from './LightDidDetails.utils'

import * as Did from '../index.js'

/**
 * @group unit/did
 */

/*
 * Functions tested:
 * - createLightDidDocument
 * - parseDocumentFromLightDid
 *
 * Functions tested in integration tests:
 * - getKeysForExtrinsic
 * - authorizeExtrinsic
 */

describe('When creating an instance from the details', () => {
  it('correctly assign the right ed25519 authentication key, x25519 encryption key, and service endpoints', () => {
    const authKey = new Keyring({
      type: 'sr25519',
      ss58Format,
    }).addFromMnemonic('auth')
    const encKey = new Keyring().addFromMnemonic('enc')
    const service: DidServiceEndpoint[] = [
      {
        id: '#service-1',
        type: ['type-1'],
        serviceEndpoint: ['x:url-1'],
      },
      {
        id: '#service-2',
        type: ['type-21', 'type-22'],
        serviceEndpoint: ['x:url-21', 'x:url-22'],
      },
    ]
    const validInput: CreateDocumentInput = {
      authentication: [{ publicKey: authKey.publicKey, type: 'sr25519' }],
      keyAgreement: [{ publicKey: encKey.publicKey, type: 'x25519' }],
      service,
    }
    const lightDid = Did.createLightDidDocument(validInput)

    expect(lightDid).toEqual(<DidDocument>{
      uri: `did:kilt:light:00${authKey.address}:z1Dzpgq4F3EVKSe4X1Gm3GZJBkQGrXB2cbXGsPabPWK861QXnJLRaCHjr1EGYAMF7hDJi6ikYBoyNu7qMiMfixZYWfgPL1TL7GcHSq9PkoTckt7YpUoeGPyjYwVFgwuvUEDvBMT8NqstfC39hTM1FkDCgHFXaeVY4HCHThKMyXw4r3k1rmXUEm52sCs7yqWxjLUuR1g7sbBo79EQjDRbLzUZq4Vs22PaYUfxdKzboNF5UVvw8ChzAaVk56dFQ2ivmbP`,
      authentication: [
        {
          id: '#authentication',
          publicKey: authKey.publicKey,
          type: 'sr25519',
        },
      ],
      keyAgreement: [
        {
          id: '#encryption',
          publicKey: encKey.publicKey,
          type: 'x25519',
        },
      ],
      service: [
        {
          id: '#service-1',
          type: ['type-1'],
          serviceEndpoint: ['x:url-1'],
        },
        {
          id: '#service-2',
          type: ['type-21', 'type-22'],
          serviceEndpoint: ['x:url-21', 'x:url-22'],
        },
      ],
    })
  })

  it('correctly assign the right ed25519 authentication key and encryption key', () => {
    const authKey = new Keyring({
      type: 'ed25519',
      ss58Format,
    }).addFromMnemonic('auth')
    const encKey = new Keyring().addFromMnemonic('enc')
    const validInput: CreateDocumentInput = {
      authentication: [{ publicKey: authKey.publicKey, type: 'ed25519' }],
      keyAgreement: [{ publicKey: encKey.publicKey, type: 'x25519' }],
    }
    const lightDid = Did.createLightDidDocument(validInput)

    expect(Did.parseDidUri(lightDid.uri).address).toStrictEqual(authKey.address)

    expect(lightDid).toEqual({
      uri: `did:kilt:light:01${authKey.address}:z1Ac9CMtYCTRWjetJfJqJoV7FcP9zdFudqUaupQkBCERoCQcnu2SUS5CGHdCXhWoxbihovMVymRperWSPpRc7mJ`,
      authentication: [
        {
          id: '#authentication',
          publicKey: authKey.publicKey,
          type: 'ed25519',
        },
      ],
      keyAgreement: [
        {
          id: '#encryption',
          publicKey: encKey.publicKey,
          type: 'x25519',
        },
      ],
    })
  })

  it('throws for unsupported authentication key type', () => {
    const authKey = new Keyring({
      type: 'ed25519',
      ss58Format,
    }).addFromMnemonic('auth')
    const invalidInput = {
      // Not an authentication key type
      authentication: [{ publicKey: authKey.publicKey, type: 'ecdsa' }],
    }
    expect(() =>
      Did.createLightDidDocument(invalidInput as CreateDocumentInput)
    ).toThrowError()
  })

  it('throws for unsupported encryption key type', () => {
    const authKey = new Keyring({
      type: 'ed25519',
      ss58Format,
    }).addFromMnemonic('auth')
    const encKey = new Keyring().addFromMnemonic('enc')
    const invalidInput = {
      authentication: [{ publicKey: authKey.publicKey, type: 'ed25519' }],
      // Not an encryption key type
      keyAgreement: [{ publicKey: encKey.publicKey, type: 'bls' }],
    }
    expect(() =>
      Did.createLightDidDocument(invalidInput as CreateDocumentInput)
    ).toThrowError()
  })
})

describe('When creating an instance from a URI', () => {
  it('correctly assign the right authentication key, encryption key, and service endpoints', () => {
    const authKey = new Keyring({
      type: 'sr25519',
      ss58Format,
    }).addFromMnemonic('auth')
    const encKey = new Keyring().addFromMnemonic('enc')
    const endpoints: DidServiceEndpoint[] = [
      {
        id: '#service-1',
        type: ['type-1'],
        serviceEndpoint: ['x:url-1'],
      },
      {
        id: '#service-2',
        type: ['type-21', 'type-22'],
        serviceEndpoint: ['x:url-21', 'x:url-22'],
      },
    ]
    const creationInput: CreateDocumentInput = {
      authentication: [{ publicKey: authKey.publicKey, type: 'sr25519' }],
      keyAgreement: [{ publicKey: encKey.publicKey, type: 'x25519' }],
      service: endpoints,
    }
    // We are sure this is correct because of the described case above
    const expectedLightDid = Did.createLightDidDocument(creationInput)

    const { address } = Did.parseDidUri(expectedLightDid.uri)
    const builtLightDid = Did.parseDocumentFromLightDid(expectedLightDid.uri)

    expect(builtLightDid).toStrictEqual(expectedLightDid)
    expect(builtLightDid).toStrictEqual(<DidDocument>{
      uri: `did:kilt:light:00${address}:z1Dzpgq4F3EVKSe4X1Gm3GZJBkQGrXB2cbXGsPabPWK861QXnJLRaCHjr1EGYAMF7hDJi6ikYBoyNu7qMiMfixZYWfgPL1TL7GcHSq9PkoTckt7YpUoeGPyjYwVFgwuvUEDvBMT8NqstfC39hTM1FkDCgHFXaeVY4HCHThKMyXw4r3k1rmXUEm52sCs7yqWxjLUuR1g7sbBo79EQjDRbLzUZq4Vs22PaYUfxdKzboNF5UVvw8ChzAaVk56dFQ2ivmbP` as DidUri,
      authentication: [
        {
          id: '#authentication',
          publicKey: authKey.publicKey,
          type: 'sr25519',
        },
      ],
      keyAgreement: [
        {
          id: '#encryption',
          publicKey: encKey.publicKey,
          type: 'x25519',
        },
      ],
      service: [
        {
          id: '#service-1',
          type: ['type-1'],
          serviceEndpoint: ['x:url-1'],
        },
        {
          id: '#service-2',
          type: ['type-21', 'type-22'],
          serviceEndpoint: ['x:url-21', 'x:url-22'],
        },
      ],
    })
  })

  it('fail if a fragment is present according to the options', () => {
    const authKey = new Keyring({
      type: 'sr25519',
      ss58Format,
    }).addFromMnemonic('auth')
    const encKey = new Keyring().addFromMnemonic('enc')
    const service: DidServiceEndpoint[] = [
      {
        id: '#service-1',
        type: ['type-1'],
        serviceEndpoint: ['x:url-1'],
      },
      {
        id: '#service-2',
        type: ['type-21', 'type-22'],
        serviceEndpoint: ['x:url-21', 'x:url-22'],
      },
    ]
    const creationInput: CreateDocumentInput = {
      authentication: [{ publicKey: authKey.publicKey, type: 'sr25519' }],
      keyAgreement: [{ publicKey: encKey.publicKey, type: 'x25519' }],
      service,
    }
    // We are sure this is correct because of the described case above
    const expectedLightDid = Did.createLightDidDocument(creationInput)

    const uriWithFragment: DidUri = `${expectedLightDid.uri}#authentication`

    expect(() => Did.parseDocumentFromLightDid(uriWithFragment, true)).toThrow()
    expect(() =>
      Did.parseDocumentFromLightDid(uriWithFragment, false)
    ).not.toThrow()
  })

  it('fail if the URI is not correct', () => {
    const validKiltAddress = new Keyring({ ss58Format }).addFromMnemonic(
      'random'
    )
    const incorrectURIs = [
      'did:kilt:light:sdasdsadas',
      // @ts-ignore not a valid DID uri
      'random-uri',
      'did:kilt:light',
      'did:kilt:light:',
      // Wrong auth key encoding
      `did:kilt:light:11${validKiltAddress}`,
      // Full DID
      `did:kilt:${validKiltAddress}`,
      // Random encoded details
      `did:kilt:light:00${validKiltAddress}:randomdetails`,
    ]
    incorrectURIs.forEach((uri) => {
      expect(() => Did.parseDocumentFromLightDid(uri as DidUri)).toThrow()
    })
  })
})
