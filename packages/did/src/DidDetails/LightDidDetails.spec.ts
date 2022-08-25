/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { Keyring } from '@polkadot/api'

import { DidDetails, DidServiceEndpoint, DidUri } from '@kiltprotocol/types'
import { ss58Format } from '@kiltprotocol/utils'

import { CreateDetailsInput } from './LightDidDetails.utils'

import * as Did from '../index.js'

/**
 * @group unit/did
 */

/*
 * Functions tested:
 * - createDetails
 * - parseDetailsFromLightDid
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
    const validInput: CreateDetailsInput = {
      authentication: [{ publicKey: authKey.publicKey, type: 'sr25519' }],
      keyAgreement: [{ publicKey: encKey.publicKey, type: 'x25519' }],
      service,
    }
    const lightDidDetails = Did.createLightDidDetails(validInput)

    expect(lightDidDetails).toEqual(<DidDetails>{
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
    const validInput: CreateDetailsInput = {
      authentication: [{ publicKey: authKey.publicKey, type: 'ed25519' }],
      keyAgreement: [{ publicKey: encKey.publicKey, type: 'x25519' }],
    }
    const lightDidDetails = Did.createLightDidDetails(validInput)

    expect(Did.Utils.parseDidUri(lightDidDetails.uri).address).toStrictEqual(
      authKey.address
    )

    expect(lightDidDetails).toEqual({
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
      Did.createLightDidDetails(invalidInput as CreateDetailsInput)
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
      Did.createLightDidDetails(invalidInput as CreateDetailsInput)
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
    const creationInput: CreateDetailsInput = {
      authentication: [{ publicKey: authKey.publicKey, type: 'sr25519' }],
      keyAgreement: [{ publicKey: encKey.publicKey, type: 'x25519' }],
      service: endpoints,
    }
    // We are sure this is correct because of the described case above
    const expectedLightDidDetails = Did.createLightDidDetails(creationInput)

    const { address } = Did.Utils.parseDidUri(expectedLightDidDetails.uri)
    const builtLightDidDetails = Did.parseDetailsFromLightDid(
      expectedLightDidDetails.uri
    )

    expect(builtLightDidDetails).toStrictEqual(expectedLightDidDetails)
    expect(builtLightDidDetails).toStrictEqual(<DidDetails>{
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
    const creationInput: CreateDetailsInput = {
      authentication: [{ publicKey: authKey.publicKey, type: 'sr25519' }],
      keyAgreement: [{ publicKey: encKey.publicKey, type: 'x25519' }],
      service,
    }
    // We are sure this is correct because of the described case above
    const expectedLightDidDetails = Did.createLightDidDetails(creationInput)

    const uriWithFragment: DidUri = `${expectedLightDidDetails.uri}#authentication`

    expect(() => Did.parseDetailsFromLightDid(uriWithFragment, true)).toThrow()
    expect(() =>
      Did.parseDetailsFromLightDid(uriWithFragment, false)
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
      expect(() => Did.parseDetailsFromLightDid(uri as DidUri)).toThrow()
    })
  })
})
