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
  DidUri,
  EncryptionKeyType,
  KeyRelationship,
  VerificationKeyType,
} from '@kiltprotocol/types'

import { getKiltDidFromIdentifier } from '../Did.utils'
import {
  getEncodingForVerificationKeyType,
  LightDidCreationDetails,
  serializeAndEncodeAdditionalLightDidDetails,
} from './LightDidDetails.utils'

import { LightDidDetails } from './index.js'

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
        id: 'service-1',
        types: ['type-1'],
        urls: ['x:url-1'],
      },
      {
        id: 'service-2',
        types: ['type-21', 'type-22'],
        urls: ['x:url-21', 'x:url-22'],
      },
    ]
    const validOptions: LightDidCreationDetails = {
      authenticationKey: {
        publicKey: authKey.publicKey,
        type: VerificationKeyType.Sr25519,
      },
      encryptionKey: {
        publicKey: encKey.publicKey,
        type: EncryptionKeyType.X25519,
      },
      serviceEndpoints: endpoints,
    }
    const lightDidDetails: LightDidDetails =
      LightDidDetails.fromDetails(validOptions)

    expect(lightDidDetails?.identifier).toStrictEqual(authKey.address)

    const encodedDetails: string = serializeAndEncodeAdditionalLightDidDetails({
      encryptionKey: {
        publicKey: encKey.publicKey,
        type: EncryptionKeyType.X25519,
      },
      serviceEndpoints: endpoints,
    })!
    const expectedDid = getKiltDidFromIdentifier(
      lightDidDetails.authKeyEncoding + authKey.address,
      'light',
      undefined,
      encodedDetails
    )
    expect(lightDidDetails?.uri).toStrictEqual(expectedDid)
    // Verify base58 encoding
    expect(lightDidDetails?.uri).toStrictEqual(
      `did:kilt:light:00${authKey.address}:z14eMxMS7xSK8fMxpGvesppXFH9Ujjd1asWF2XxNRixGvQFeRsNriHen6CWAG66kWYWkUmAUkyqG9rKPP9xJ6A3uNHb9puJ6cq4nh4DARDhLA81QHHW4Jcvwe5WaynsZgvGhH1BEY2gdoFb8vGYdNA7VKyyicVuUj2kubvYNZ3Y5mRtYv68BECTw3jg9vqv8WSueTuRM9Tg4d4uLDKMDgFmVwZ7UZDhMErGZ1Zeq`
    )

    expect(lightDidDetails?.getKey('authentication')).toStrictEqual<DidKey>({
      id: 'authentication',
      publicKey: authKey.publicKey,
      type: VerificationKeyType.Sr25519,
    })
    expect(
      lightDidDetails?.getVerificationKeys(KeyRelationship.authentication)
    ).toStrictEqual<DidKey[]>([
      {
        id: 'authentication',
        publicKey: authKey.publicKey,
        type: VerificationKeyType.Sr25519,
      },
    ])
    expect(lightDidDetails?.authenticationKey.id).toStrictEqual(
      'authentication'
    )

    expect(lightDidDetails?.getKey('encryption')).toStrictEqual<DidKey>({
      id: 'encryption',
      publicKey: encKey.publicKey,
      type: EncryptionKeyType.X25519,
    })
    expect(
      lightDidDetails?.getEncryptionKeys(KeyRelationship.keyAgreement)
    ).toStrictEqual<DidKey[]>([
      {
        id: 'encryption',
        publicKey: encKey.publicKey,
        type: EncryptionKeyType.X25519,
      },
    ])
    expect(lightDidDetails?.encryptionKey?.id).toStrictEqual('encryption')

    expect(lightDidDetails?.attestationKey).toBeUndefined()
    expect(lightDidDetails?.delegationKey).toBeUndefined()

    expect(
      lightDidDetails?.getEndpoint('service-1')
    ).toStrictEqual<DidServiceEndpoint>({
      id: 'service-1',
      types: ['type-1'],
      urls: ['x:url-1'],
    })
    expect(lightDidDetails?.getEndpoints('type-1')).toStrictEqual<
      DidServiceEndpoint[]
    >([
      {
        id: 'service-1',
        types: ['type-1'],
        urls: ['x:url-1'],
      },
    ])

    expect(
      lightDidDetails?.getEndpoint('service-2')
    ).toStrictEqual<DidServiceEndpoint>({
      id: 'service-2',
      types: ['type-21', 'type-22'],
      urls: ['x:url-21', 'x:url-22'],
    })
    expect(lightDidDetails?.getEndpoints('type-21')).toStrictEqual<
      DidServiceEndpoint[]
    >([
      {
        id: 'service-2',
        types: ['type-21', 'type-22'],
        urls: ['x:url-21', 'x:url-22'],
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
        type: VerificationKeyType.Ed25519,
      },
      encryptionKey: {
        publicKey: encKey.publicKey,
        type: EncryptionKeyType.X25519,
      },
    }
    const lightDidDetails: LightDidDetails =
      LightDidDetails.fromDetails(validOptions)

    expect(lightDidDetails?.identifier).toStrictEqual(authKey.address)

    const encodedDetails: string = serializeAndEncodeAdditionalLightDidDetails({
      encryptionKey: {
        publicKey: encKey.publicKey,
        type: EncryptionKeyType.X25519,
      },
    })!
    const expectedDid = getKiltDidFromIdentifier(
      lightDidDetails.authKeyEncoding + authKey.address,
      'light',
      undefined,
      encodedDetails
    )
    expect(lightDidDetails?.uri).toStrictEqual(expectedDid)
    // Verify base58 encoding
    expect(lightDidDetails?.uri).toStrictEqual(
      `did:kilt:light:01${authKey.address}:z1Ac9CMtYCTRWjetJfJqJoV7FcP9zdFudqUaupQkBCERoCQcnu2SUS5CGHdCXhWoxbihovMVymRperWSPpRc7mJ`
    )

    expect(lightDidDetails?.getKey('authentication')).toStrictEqual<DidKey>({
      id: 'authentication',
      publicKey: authKey.publicKey,
      type: VerificationKeyType.Ed25519,
    })
    expect(
      lightDidDetails?.getVerificationKeys(KeyRelationship.authentication)
    ).toStrictEqual<DidKey[]>([
      {
        id: 'authentication',
        publicKey: authKey.publicKey,
        type: VerificationKeyType.Ed25519,
      },
    ])
    expect(lightDidDetails?.authenticationKey.id).toStrictEqual(
      'authentication'
    )

    expect(lightDidDetails?.getKey('encryption')).toStrictEqual<DidKey>({
      id: 'encryption',
      publicKey: encKey.publicKey,
      type: EncryptionKeyType.X25519,
    })
    expect(
      lightDidDetails?.getEncryptionKeys(KeyRelationship.keyAgreement)
    ).toStrictEqual<DidKey[]>([
      {
        id: 'encryption',
        publicKey: encKey.publicKey,
        type: EncryptionKeyType.X25519,
      },
    ])
    expect(lightDidDetails?.encryptionKey?.id).toStrictEqual('encryption')

    expect(lightDidDetails?.attestationKey).toBeUndefined()
    expect(lightDidDetails?.delegationKey).toBeUndefined()

    expect(lightDidDetails?.getEndpoint('service-1')).toBeUndefined()

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
        // @ts-ignore Not an authentication key type
        type: VerificationKeyType.Ecdsa,
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
        type: VerificationKeyType.Ed25519,
      },
      encryptionKey: {
        publicKey: encKey.publicKey,
        // @ts-ignore Not an encryption key type
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
        id: 'service-1',
        types: ['type-1'],
        urls: ['x:url-1'],
      },
      {
        id: 'service-2',
        types: ['type-21', 'type-22'],
        urls: ['x:url-21', 'x:url-22'],
      },
    ]
    const creationOptions: LightDidCreationDetails = {
      authenticationKey: {
        publicKey: authKey.publicKey,
        type: VerificationKeyType.Sr25519,
      },
      encryptionKey: {
        publicKey: encKey.publicKey,
        type: EncryptionKeyType.X25519,
      },
      serviceEndpoints: endpoints,
    }
    // We are sure this is correct because of the describe case above
    const expectedLightDidDetails: LightDidDetails =
      LightDidDetails.fromDetails(creationOptions)

    const builtLightDidDetails = LightDidDetails.fromUri(
      expectedLightDidDetails.uri
    )

    expect(builtLightDidDetails).toStrictEqual<LightDidDetails>(
      expectedLightDidDetails
    )

    // Verify base58 encoding
    expect(builtLightDidDetails.uri).toStrictEqual(
      `did:kilt:light:00${expectedLightDidDetails.identifier}:z14eMxMS7xSK8fMxpGvesppXFH9Ujjd1asWF2XxNRixGvQFeRsNriHen6CWAG66kWYWkUmAUkyqG9rKPP9xJ6A3uNHb9puJ6cq4nh4DARDhLA81QHHW4Jcvwe5WaynsZgvGhH1BEY2gdoFb8vGYdNA7VKyyicVuUj2kubvYNZ3Y5mRtYv68BECTw3jg9vqv8WSueTuRM9Tg4d4uLDKMDgFmVwZ7UZDhMErGZ1Zeq`
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
        id: 'service-1',
        types: ['type-1'],
        urls: ['x:url-1'],
      },
      {
        id: 'service-2',
        types: ['type-21', 'type-22'],
        urls: ['x:url-21', 'x:url-22'],
      },
    ]
    const creationOptions: LightDidCreationDetails = {
      authenticationKey: {
        publicKey: authKey.publicKey,
        type: VerificationKeyType.Sr25519,
      },
      encryptionKey: {
        publicKey: encKey.publicKey,
        type: EncryptionKeyType.X25519,
      },
      serviceEndpoints: endpoints,
    }
    // We are sure this is correct because of the describe case above
    const expectedLightDidDetails: LightDidDetails =
      LightDidDetails.fromDetails(creationOptions)

    const uriWithFragment: DidUri = `${expectedLightDidDetails.uri}#authentication`

    expect(() => LightDidDetails.fromUri(uriWithFragment, true)).toThrow()
    expect(() => LightDidDetails.fromUri(uriWithFragment, false)).not.toThrow()
  })

  it('fail if the URI is not correct', () => {
    const validKiltAddress = new Keyring({ ss58Format: 38 }).addFromMnemonic(
      'random'
    )
    const incorrectURIs: DidUri[] = [
      'did:kilt:light:sdasdsadas',
      // @ts-ignore not a valid did uri
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
        type: VerificationKeyType.Sr25519,
      },
    }

    // We are sure this is correct because of the describe case above
    const expectedLightDidDetails: LightDidDetails =
      LightDidDetails.fromDetails(creationOptions)
    // We are sure this is correct because of the describe case above
    const builtLightDidDetails: LightDidDetails =
      LightDidDetails.fromIdentifier(
        authKey.address,
        VerificationKeyType.Sr25519
      )

    expect(builtLightDidDetails).toStrictEqual<LightDidDetails>(
      expectedLightDidDetails
    )
    expect(builtLightDidDetails.authKeyEncoding).toStrictEqual(
      getEncodingForVerificationKeyType(VerificationKeyType.Sr25519)
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
        type: VerificationKeyType.Ed25519,
      },
    }

    // We are sure this is correct because of the describe case above
    const expectedLightDidDetails: LightDidDetails =
      LightDidDetails.fromDetails(creationOptions)
    // We are sure this is correct because of the describe case above
    const builtLightDidDetails: LightDidDetails =
      LightDidDetails.fromIdentifier(
        authKey.address,
        VerificationKeyType.Ed25519
      )

    expect(builtLightDidDetails).toStrictEqual<LightDidDetails>(
      expectedLightDidDetails
    )
    expect(builtLightDidDetails.authKeyEncoding).toStrictEqual(
      getEncodingForVerificationKeyType(VerificationKeyType.Ed25519)
    )

    expect(builtLightDidDetails?.authenticationKey.id).toStrictEqual(
      'authentication'
    )
    expect(builtLightDidDetails?.encryptionKey).toBeUndefined()
    expect(builtLightDidDetails?.attestationKey).toBeUndefined()
    expect(builtLightDidDetails?.delegationKey).toBeUndefined()
  })
})
