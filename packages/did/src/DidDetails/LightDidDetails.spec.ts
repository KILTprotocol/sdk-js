/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { Keyring } from '@polkadot/api'

import {
  DidKey,
  DidServiceEndpoint,
  KeyRelationship,
} from '@kiltprotocol/types'

import type { LightDidCreationDetails } from '../types'
import { getKiltDidFromIdentifier } from '../Did.utils'
import {
  serializeAndEncodeAdditionalLightDidDetails,
  LightDidSupportedSigningKeyTypes,
  getEncodingForSigningKeyType,
} from './LightDidDetails.utils'

import { LightDidDetails } from '.'

/**
 * @group unit/did
 */

/*
 * Functions tested:
 * - fromDetails
 * - fromUri
 * - fromIdentifier
 *
 * Functions tested in integration tests:
 * - getKeysForExtrinsic
 * - authorizeExtrinsic
 * - migrate
 */

describe('When creating an instance from the details', () => {
  it('correctly assign the right ed25519 authentication key, x25519 encryption key, and service endpoints', () => {
    const authKey = new Keyring({
      type: 'sr25519',
      ss58Format: 38,
    }).addFromMnemonic('auth')
    const encKey = new Keyring().addFromMnemonic('enc')
    const endpoints: DidServiceEndpoint[] = [
      {
        id: 'service#1',
        types: ['type-1'],
        urls: ['url-1'],
      },
      {
        id: 'service#2',
        types: ['type-21', 'type-22'],
        urls: ['url-21', 'url-22'],
      },
    ]
    const validOptions: LightDidCreationDetails = {
      authenticationKey: {
        publicKey: authKey.publicKey,
        type: authKey.type,
      },
      encryptionKey: {
        publicKey: encKey.publicKey,
        type: 'x25519',
      },
      serviceEndpoints: endpoints,
    }
    const lightDidDetails: LightDidDetails =
      LightDidDetails.fromDetails(validOptions)

    expect(lightDidDetails?.identifier).toStrictEqual(authKey.address)

    const encodedDetails: string = serializeAndEncodeAdditionalLightDidDetails({
      encryptionKey: {
        publicKey: encKey.publicKey,
        type: 'x25519',
      },
      serviceEndpoints: endpoints,
    })!
    const expectedDid = getKiltDidFromIdentifier(
      lightDidDetails.authKeyEncoding + authKey.address,
      'light',
      undefined,
      encodedDetails
    )
    expect(lightDidDetails?.did).toStrictEqual(expectedDid)

    expect(lightDidDetails?.getKey('authentication')).toStrictEqual<DidKey>({
      id: 'authentication',
      publicKey: authKey.publicKey,
      type: 'sr25519',
    })
    expect(
      lightDidDetails?.getKeys(KeyRelationship.authentication)
    ).toStrictEqual<DidKey[]>([
      {
        id: 'authentication',
        publicKey: authKey.publicKey,
        type: 'sr25519',
      },
    ])
    expect(lightDidDetails?.authenticationKey.id).toStrictEqual(
      'authentication'
    )

    expect(lightDidDetails?.getKey('encryption')).toStrictEqual<DidKey>({
      id: 'encryption',
      publicKey: encKey.publicKey,
      type: 'x25519',
    })
    expect(
      lightDidDetails?.getKeys(KeyRelationship.keyAgreement)
    ).toStrictEqual<DidKey[]>([
      {
        id: 'encryption',
        publicKey: encKey.publicKey,
        type: 'x25519',
      },
    ])
    expect(lightDidDetails?.encryptionKey?.id).toStrictEqual('encryption')

    expect(lightDidDetails?.attestationKey).toBeUndefined()
    expect(lightDidDetails?.delegationKey).toBeUndefined()

    expect(
      lightDidDetails?.getEndpoint('service#1')
    ).toStrictEqual<DidServiceEndpoint>({
      id: 'service#1',
      types: ['type-1'],
      urls: ['url-1'],
    })
    expect(lightDidDetails?.getEndpoints('type-1')).toStrictEqual<
      DidServiceEndpoint[]
    >([
      {
        id: 'service#1',
        types: ['type-1'],
        urls: ['url-1'],
      },
    ])

    expect(
      lightDidDetails?.getEndpoint('service#2')
    ).toStrictEqual<DidServiceEndpoint>({
      id: 'service#2',
      types: ['type-21', 'type-22'],
      urls: ['url-21', 'url-22'],
    })
    expect(lightDidDetails?.getEndpoints('type-21')).toStrictEqual<
      DidServiceEndpoint[]
    >([
      {
        id: 'service#2',
        types: ['type-21', 'type-22'],
        urls: ['url-21', 'url-22'],
      },
    ])
  })

  it('correctly assign the right ed25519 authentication key and encryption key', () => {
    const authKey = new Keyring({
      type: 'ed25519',
      ss58Format: 38,
    }).addFromMnemonic('auth')
    const encKey = new Keyring().addFromMnemonic('enc')
    const validOptions: LightDidCreationDetails = {
      authenticationKey: {
        publicKey: authKey.publicKey,
        type: authKey.type,
      },
      encryptionKey: {
        publicKey: encKey.publicKey,
        type: 'x25519',
      },
    }
    const lightDidDetails: LightDidDetails =
      LightDidDetails.fromDetails(validOptions)

    expect(lightDidDetails?.identifier).toStrictEqual(authKey.address)

    const encodedDetails: string = serializeAndEncodeAdditionalLightDidDetails({
      encryptionKey: {
        publicKey: encKey.publicKey,
        type: 'x25519',
      },
    })!
    const expectedDid = getKiltDidFromIdentifier(
      lightDidDetails.authKeyEncoding + authKey.address,
      'light',
      undefined,
      encodedDetails
    )
    expect(lightDidDetails?.did).toStrictEqual(expectedDid)

    expect(lightDidDetails?.getKey('authentication')).toStrictEqual<DidKey>({
      id: 'authentication',
      publicKey: authKey.publicKey,
      type: 'ed25519',
    })
    expect(
      lightDidDetails?.getKeys(KeyRelationship.authentication)
    ).toStrictEqual<DidKey[]>([
      {
        id: 'authentication',
        publicKey: authKey.publicKey,
        type: 'ed25519',
      },
    ])
    expect(lightDidDetails?.authenticationKey.id).toStrictEqual(
      'authentication'
    )

    expect(lightDidDetails?.getKey('encryption')).toStrictEqual<DidKey>({
      id: 'encryption',
      publicKey: encKey.publicKey,
      type: 'x25519',
    })
    expect(
      lightDidDetails?.getKeys(KeyRelationship.keyAgreement)
    ).toStrictEqual<DidKey[]>([
      {
        id: 'encryption',
        publicKey: encKey.publicKey,
        type: 'x25519',
      },
    ])
    expect(lightDidDetails?.encryptionKey?.id).toStrictEqual('encryption')

    expect(lightDidDetails?.attestationKey).toBeUndefined()
    expect(lightDidDetails?.delegationKey).toBeUndefined()

    expect(lightDidDetails?.getEndpoint('service#1')).toBeUndefined()

    expect(lightDidDetails?.getEndpoints('type-1')).toStrictEqual<
      DidServiceEndpoint[]
    >([])
    expect(lightDidDetails?.getEndpoints()).toStrictEqual<DidServiceEndpoint[]>(
      []
    )
  })

  it('throws for unsupported authentication key type', () => {
    const authKey = new Keyring({
      type: 'ed25519',
      ss58Format: 38,
    }).addFromMnemonic('auth')
    const invalidOptions: LightDidCreationDetails = {
      authenticationKey: {
        publicKey: authKey.publicKey,
        type: 'ecdsa',
      },
    }
    expect(() => LightDidDetails.fromDetails(invalidOptions)).toThrowError()
  })

  it('throws for unsupported encryption key type', () => {
    const authKey = new Keyring({
      type: 'ed25519',
      ss58Format: 38,
    }).addFromMnemonic('auth')
    const encKey = new Keyring().addFromMnemonic('enc')
    const invalidOptions: LightDidCreationDetails = {
      authenticationKey: {
        publicKey: authKey.publicKey,
        type: 'ed25519',
      },
      encryptionKey: {
        publicKey: encKey.publicKey,
        type: 'bls',
      },
    }
    expect(() => LightDidDetails.fromDetails(invalidOptions)).toThrowError()
  })
})

describe('When creating an instance from a URI', () => {
  it('correctly assign the right authentication key, encryption key, and service endpoints', () => {
    const authKey = new Keyring({
      type: 'sr25519',
      ss58Format: 38,
    }).addFromMnemonic('auth')
    const encKey = new Keyring().addFromMnemonic('enc')
    const endpoints: DidServiceEndpoint[] = [
      {
        id: 'service#1',
        types: ['type-1'],
        urls: ['url-1'],
      },
      {
        id: 'service#2',
        types: ['type-21', 'type-22'],
        urls: ['url-21', 'url-22'],
      },
    ]
    const creationOptions: LightDidCreationDetails = {
      authenticationKey: {
        publicKey: authKey.publicKey,
        type: authKey.type,
      },
      encryptionKey: {
        publicKey: encKey.publicKey,
        type: 'x25519',
      },
      serviceEndpoints: endpoints,
    }
    // We are sure this is correct because of the describe case above
    const expectedLightDidDetails: LightDidDetails =
      LightDidDetails.fromDetails(creationOptions)

    const builtLightDidDetails = LightDidDetails.fromUri(
      expectedLightDidDetails.did
    )

    expect(builtLightDidDetails).toStrictEqual<LightDidDetails>(
      expectedLightDidDetails
    )

    expect(builtLightDidDetails?.authenticationKey.id).toStrictEqual(
      'authentication'
    )
    expect(builtLightDidDetails?.encryptionKey?.id).toStrictEqual('encryption')
    expect(builtLightDidDetails?.attestationKey).toBeUndefined()
    expect(builtLightDidDetails?.delegationKey).toBeUndefined()
  })

  it('fail if a fragment is present according to the options', () => {
    const authKey = new Keyring({
      type: 'sr25519',
      ss58Format: 38,
    }).addFromMnemonic('auth')
    const encKey = new Keyring().addFromMnemonic('enc')
    const endpoints: DidServiceEndpoint[] = [
      {
        id: 'service#1',
        types: ['type-1'],
        urls: ['url-1'],
      },
      {
        id: 'service#2',
        types: ['type-21', 'type-22'],
        urls: ['url-21', 'url-22'],
      },
    ]
    const creationOptions: LightDidCreationDetails = {
      authenticationKey: {
        publicKey: authKey.publicKey,
        type: authKey.type,
      },
      encryptionKey: {
        publicKey: encKey.publicKey,
        type: 'x25519',
      },
      serviceEndpoints: endpoints,
    }
    // We are sure this is correct because of the describe case above
    const expectedLightDidDetails: LightDidDetails =
      LightDidDetails.fromDetails(creationOptions)

    const uriWithFragment = `${expectedLightDidDetails.did}#authentication`

    expect(() => LightDidDetails.fromUri(uriWithFragment, true)).toThrow()
    expect(() => LightDidDetails.fromUri(uriWithFragment, false)).not.toThrow()
  })

  it('fail if the URI is not correct', () => {
    const validKiltAddress = new Keyring({ ss58Format: 38 }).addFromMnemonic(
      'random'
    )
    const incorrectURIs: string[] = [
      'did:kilt:light:sdasdsadas',
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
      expect(() => LightDidDetails.fromUri(uri)).toThrow()
    })
  })
})

describe('When creating an instance from an identifier', () => {
  it('correctly assign the right sr25519 authentication key', () => {
    const authKey = new Keyring({
      type: 'sr25519',
      ss58Format: 38,
    }).addFromMnemonic('auth')

    const creationOptions: LightDidCreationDetails = {
      authenticationKey: {
        publicKey: authKey.publicKey,
        type: authKey.type,
      },
    }

    // We are sure this is correct because of the describe case above
    const expectedLightDidDetails: LightDidDetails =
      LightDidDetails.fromDetails(creationOptions)
    // We are sure this is correct because of the describe case above
    const builtLightDidDetails: LightDidDetails =
      LightDidDetails.fromIdentifier(
        authKey.address,
        LightDidSupportedSigningKeyTypes.sr25519
      )

    expect(builtLightDidDetails).toStrictEqual<LightDidDetails>(
      expectedLightDidDetails
    )
    expect(builtLightDidDetails.authKeyEncoding).toStrictEqual(
      getEncodingForSigningKeyType('sr25519')
    )

    expect(builtLightDidDetails?.authenticationKey.id).toStrictEqual(
      'authentication'
    )
    expect(builtLightDidDetails?.encryptionKey).toBeUndefined()
    expect(builtLightDidDetails?.attestationKey).toBeUndefined()
    expect(builtLightDidDetails?.delegationKey).toBeUndefined()
  })

  it('correctly assign the right ed25519 authentication key', () => {
    const authKey = new Keyring({
      type: 'ed25519',
      ss58Format: 38,
    }).addFromMnemonic('auth')

    const creationOptions: LightDidCreationDetails = {
      authenticationKey: {
        publicKey: authKey.publicKey,
        type: authKey.type,
      },
    }

    // We are sure this is correct because of the describe case above
    const expectedLightDidDetails: LightDidDetails =
      LightDidDetails.fromDetails(creationOptions)
    // We are sure this is correct because of the describe case above
    const builtLightDidDetails: LightDidDetails =
      LightDidDetails.fromIdentifier(
        authKey.address,
        LightDidSupportedSigningKeyTypes.ed25519
      )

    expect(builtLightDidDetails).toStrictEqual<LightDidDetails>(
      expectedLightDidDetails
    )
    expect(builtLightDidDetails.authKeyEncoding).toStrictEqual(
      getEncodingForSigningKeyType('ed25519')
    )

    expect(builtLightDidDetails?.authenticationKey.id).toStrictEqual(
      'authentication'
    )
    expect(builtLightDidDetails?.encryptionKey).toBeUndefined()
    expect(builtLightDidDetails?.attestationKey).toBeUndefined()
    expect(builtLightDidDetails?.delegationKey).toBeUndefined()
  })
})
