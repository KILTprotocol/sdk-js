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
import { LightDidDetails } from '.'
import { getKiltDidFromIdentifier } from '../Did.utils'
import { serializeAndEncodeAdditionalLightDidDetails } from './LightDidDetails.utils'

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
