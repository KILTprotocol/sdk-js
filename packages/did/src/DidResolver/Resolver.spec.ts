/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */

/**
 * @group unit/did
 */

import { TypeRegistry } from '@kiltprotocol/chain-helpers'
import {
  IDidKeyDetails,
  IDidResolutionDocumentMetadata,
  IDidServiceEndpoint,
  IIdentity,
  KeyringPair,
} from '@kiltprotocol/types'
import type { IDidResolvedDetails } from '@kiltprotocol/types'
import { Keyring } from '@kiltprotocol/utils'
import { hexToU8a, u8aToHex } from '@polkadot/util'
import { LightDidDetails } from '../DidDetails'
import type { INewPublicKey } from '../types'
import { IDidChainRecordJSON } from '../types'
import { DefaultResolver } from './DefaultResolver'
import {
  getIdentifierFromKiltDid,
  getKiltDidFromIdentifier,
  parseDidUrl,
} from '../Did.utils'

const fullDidPresentWithAuthenticationKey =
  'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs'
const fullDidPresentWithAllKeys =
  'did:kilt:4sDxAgw86PFvC6TQbvZzo19WoYF6T4HcLd2i9wzvojkLXLvp'
const fullDidPresentWithServiceEndpoints =
  'did:kilt:4q4DHavMdesaSMH3g32xH3fhxYPt5pmoP9oSwgTr73dQLrkN'
const deletedDid = 'did:kilt:4rrVTLAXgeoE8jo8si571HnqHtd5WmvLuzfH6e1xBsVXsRo7'
const migratedUndeletedLightDid = `did:kilt:light:00${getIdentifierFromKiltDid(
  fullDidPresentWithAuthenticationKey
)}`
const migratedDeletedLightDid = `did:kilt:light:00${getIdentifierFromKiltDid(
  deletedDid
)}`

function generateAuthenticationKeyDetails(
  didIdentifier: IIdentity['address']
): [string, IDidKeyDetails] {
  const didUri = getKiltDidFromIdentifier(didIdentifier, 'full')
  return [
    `${didUri}#auth`,
    {
      id: `${didUri}#auth`,
      type: 'ed25519',
      controller: didUri,
      publicKeyHex:
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      includedAt: 200,
    },
  ]
}

function generateEncryptionKeyDetails(
  didIdentifier: IIdentity['address']
): [string, IDidKeyDetails] {
  const didUri = getKiltDidFromIdentifier(didIdentifier, 'full')
  return [
    `${didUri}#enc`,
    {
      id: `${didUri}#enc`,
      type: 'x25519',
      controller: didUri,
      publicKeyHex:
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      includedAt: 250,
    },
  ]
}

function generateAttestationKeyDetails(
  didIdentifier: IIdentity['address']
): [string, IDidKeyDetails] {
  const didUri = getKiltDidFromIdentifier(didIdentifier, 'full')
  return [
    `${didUri}#att`,
    {
      id: `${didUri}#att`,
      type: 'sr25519',
      controller: didUri,
      publicKeyHex:
        '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      includedAt: 300,
    },
  ]
}

function generateDelegationKeyDetails(
  didIdentifier: IIdentity['address']
): [string, IDidKeyDetails] {
  const didUri = getKiltDidFromIdentifier(didIdentifier, 'full')
  return [
    `${didUri}#del`,
    {
      id: `${didUri}#del`,
      type: 'ed25519',
      controller: didUri,
      publicKeyHex:
        '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
      includedAt: 350,
    },
  ]
}

function generateServiceEndpointDetails(
  didIdentifier: IIdentity['address'],
  serviceId: string
): IDidServiceEndpoint {
  const didUri = getKiltDidFromIdentifier(didIdentifier, 'full')
  return {
    id: `${didUri}#${serviceId}`,
    types: [`type-${serviceId}`],
    urls: [`urls-${serviceId}`],
  }
}

jest.mock('../Did.chain', () => {
  const queryByDID = jest.fn(
    async (did: string): Promise<IDidChainRecordJSON | null> => {
      const [authKeyId, authKey] = generateAuthenticationKeyDetails(did)
      const [encKeyId, encKey] = generateEncryptionKeyDetails(did)
      const [attKeyId, attKey] = generateAttestationKeyDetails(did)
      const [delKeyId, delKey] = generateDelegationKeyDetails(did)
      switch (did) {
        case fullDidPresentWithAuthenticationKey:
          return {
            did,
            authenticationKey: authKeyId,
            keyAgreementKeys: [],
            publicKeys: [authKey],
            lastTxCounter: TypeRegistry.createType('u64'),
          }
        case fullDidPresentWithAllKeys:
          return {
            did,
            authenticationKey: authKeyId,
            keyAgreementKeys: [encKeyId],
            assertionMethodKey: attKeyId,
            capabilityDelegationKey: delKeyId,
            publicKeys: [authKey, encKey, attKey, delKey],
            lastTxCounter: TypeRegistry.createType('u64'),
          }
        case fullDidPresentWithServiceEndpoints:
          return {
            did,
            authenticationKey: authKeyId,
            keyAgreementKeys: [],
            publicKeys: [authKey],
            lastTxCounter: TypeRegistry.createType('u64'),
          }
        default:
          return null
      }
    }
  )
  const queryDidKey = jest.fn(
    async (didUri: string): Promise<IDidKeyDetails | null> => {
      const { identifier } = parseDidUrl(didUri)
      const subjectDid = getKiltDidFromIdentifier(identifier, 'full')
      const details = await queryByDID(subjectDid)
      return details?.publicKeys.find((key) => key.id === didUri) || null
    }
  )
  const queryServiceEndpoint = jest.fn(
    async (didUri: string): Promise<IDidServiceEndpoint | null> => {
      const { identifier, fragment } = parseDidUrl(didUri)
      const subjectDid = getKiltDidFromIdentifier(identifier, 'full')
      switch (subjectDid) {
        case fullDidPresentWithServiceEndpoints:
          return generateServiceEndpointDetails(identifier, fragment as string)
        default:
          return null
      }
    }
  )
  const queryServiceEndpoints = jest.fn(
    async (didUri: string): Promise<IDidServiceEndpoint[]> => {
      switch (didUri) {
        case fullDidPresentWithServiceEndpoints:
          return [
            (await queryServiceEndpoint(
              `${didUri}#id-1`
            )) as IDidServiceEndpoint,
            (await queryServiceEndpoint(
              `${didUri}#id-2`
            )) as IDidServiceEndpoint,
          ]
        default:
          return []
      }
    }
  )
  const queryDidDeletionStatus = jest.fn(
    async (did: string): Promise<boolean> => {
      switch (did) {
        case deletedDid:
          return true
        default:
          return false
      }
    }
  )
  return {
    queryByDID,
    queryById: jest.fn(
      async (id: string): Promise<IDidChainRecordJSON | null> =>
        queryByDID(getKiltDidFromIdentifier(id, 'full'))
    ),
    queryDidKey,
    queryServiceEndpoint,
    queryServiceEndpoints,
    queryDidDeletionStatus,
  }
})

describe('Key resolution', () => {
  it('Correctly resolves a key given its ID', async () => {
    const key = (await DefaultResolver.resolveKey(
      `${fullDidPresentWithAllKeys}#auth`
    )) as IDidKeyDetails
    expect(key).toMatchObject<Partial<IDidKeyDetails>>({
      id: `${fullDidPresentWithAllKeys}#auth`,
      type: 'ed25519',
      controller: fullDidPresentWithAllKeys,
    })
  })
})

describe('Service endpoint resolution', () => {
  it('Correctly resolves a service endpoint given its ID', async () => {
    const serviceEndpoint = (await DefaultResolver.resolveServiceEndpoint(
      `${fullDidPresentWithServiceEndpoints}#id-1`
    )) as IDidServiceEndpoint
    expect(serviceEndpoint).toMatchObject<IDidServiceEndpoint>({
      id: `${fullDidPresentWithServiceEndpoints}#id-1`,
      types: ['type-id-1'],
      urls: ['urls-id-1'],
    })
  })
})

describe('Full DID resolution', () => {
  it('Correctly resolves full DID details with authentication key', async () => {
    const { details, metadata } = (await DefaultResolver.resolve(
      fullDidPresentWithAuthenticationKey
    )) as IDidResolvedDetails
    expect(metadata).toStrictEqual<IDidResolutionDocumentMetadata>({
      deactivated: false,
    })
    expect(details?.did).toStrictEqual(fullDidPresentWithAuthenticationKey)
    expect(details?.getKeys()).toStrictEqual([
      {
        id: `${fullDidPresentWithAuthenticationKey}#auth`,
        type: 'ed25519',
        controller: fullDidPresentWithAuthenticationKey,
        publicKeyHex:
          '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        includedAt: 200,
      },
    ])
  })

  it('Correctly resolves full DID details with all keys', async () => {
    const { details, metadata } = (await DefaultResolver.resolve(
      fullDidPresentWithAllKeys
    )) as IDidResolvedDetails
    expect(metadata).toStrictEqual<IDidResolutionDocumentMetadata>({
      deactivated: false,
    })
    expect(details?.did).toStrictEqual(fullDidPresentWithAllKeys)
    expect(details?.getKeys()).toStrictEqual([
      {
        id: `${fullDidPresentWithAllKeys}#auth`,
        type: 'ed25519',
        controller: fullDidPresentWithAllKeys,
        publicKeyHex:
          '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        includedAt: 200,
      },
      {
        id: `${fullDidPresentWithAllKeys}#enc`,
        type: 'x25519',
        controller: fullDidPresentWithAllKeys,
        publicKeyHex:
          '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        includedAt: 250,
      },
      {
        id: `${fullDidPresentWithAllKeys}#att`,
        type: 'sr25519',
        controller: fullDidPresentWithAllKeys,
        publicKeyHex:
          '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
        includedAt: 300,
      },
      {
        id: `${fullDidPresentWithAllKeys}#del`,
        type: 'ed25519',
        controller: fullDidPresentWithAllKeys,
        publicKeyHex:
          '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
        includedAt: 350,
      },
    ])
  })

  it('Correctly resolves full DID details with service endpoints', async () => {
    const { details, metadata } = (await DefaultResolver.resolve(
      fullDidPresentWithServiceEndpoints
    )) as IDidResolvedDetails
    expect(metadata).toStrictEqual<IDidResolutionDocumentMetadata>({
      deactivated: false,
    })
    expect(details?.did).toStrictEqual(fullDidPresentWithServiceEndpoints)
    expect(details?.getKeys()).toStrictEqual([
      {
        id: `${fullDidPresentWithServiceEndpoints}#auth`,
        type: 'ed25519',
        controller: fullDidPresentWithServiceEndpoints,
        publicKeyHex:
          '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        includedAt: 200,
      },
    ])
    expect(details?.getEndpoints()).toStrictEqual([
      {
        id: `${fullDidPresentWithServiceEndpoints}#id-1`,
        types: ['type-id-1'],
        urls: ['urls-id-1'],
      },
      {
        id: `${fullDidPresentWithServiceEndpoints}#id-2`,
        types: ['type-id-2'],
        urls: ['urls-id-2'],
      },
    ])
  })

  it('Correctly resolves a full DID that does not exist', async () => {
    const { details, metadata } = (await DefaultResolver.resolve(
      deletedDid
    )) as IDidResolvedDetails
    expect(details).toBeUndefined()
    expect(metadata).toStrictEqual<IDidResolutionDocumentMetadata>({
      deactivated: true,
    })
  })

  it('Correctly resolves a full DID given a key ID', async () => {
    const { details, metadata } = (await DefaultResolver.resolveDoc(
      `${fullDidPresentWithAuthenticationKey}#auth`
    )) as IDidResolvedDetails
    expect(metadata).toStrictEqual<IDidResolutionDocumentMetadata>({
      deactivated: false,
    })
    expect(details?.did).toStrictEqual(fullDidPresentWithAuthenticationKey)
    expect(details?.getKeys()).toStrictEqual([
      {
        id: `${fullDidPresentWithAuthenticationKey}#auth`,
        type: 'ed25519',
        controller: fullDidPresentWithAuthenticationKey,
        publicKeyHex:
          '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        includedAt: 200,
      },
    ])
  })

  it('Correctly resolves a full DID given a service ID', async () => {
    const { details, metadata } = (await DefaultResolver.resolveDoc(
      `${fullDidPresentWithServiceEndpoints}#id-1`
    )) as IDidResolvedDetails
    expect(metadata).toStrictEqual<IDidResolutionDocumentMetadata>({
      deactivated: false,
    })
    expect(details?.did).toStrictEqual(fullDidPresentWithServiceEndpoints)
    expect(details?.getKeys()).toStrictEqual([
      {
        id: `${fullDidPresentWithServiceEndpoints}#auth`,
        type: 'ed25519',
        controller: fullDidPresentWithServiceEndpoints,
        publicKeyHex:
          '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        includedAt: 200,
      },
    ])
    expect(details?.getEndpoints()).toStrictEqual([
      {
        id: `${fullDidPresentWithServiceEndpoints}#id-1`,
        types: ['type-id-1'],
        urls: ['urls-id-1'],
      },
      {
        id: `${fullDidPresentWithServiceEndpoints}#id-2`,
        types: ['type-id-2'],
        urls: ['urls-id-2'],
      },
    ])
  })
})

describe('Light DID resolution', () => {
  const mnemonic = 'testMnemonic'

  const keyring: Keyring = new Keyring({ ss58Format: 38 })
  let keypair: KeyringPair
  let publicAuthKey: INewPublicKey
  let encryptionKey: INewPublicKey
  let serviceEndpoints: IDidServiceEndpoint[]

  it('Correctly resolves a light DID created with only an ed25519 authentication key', async () => {
    keypair = keyring.addFromMnemonic(mnemonic, undefined, 'ed25519')
    publicAuthKey = {
      publicKey: keypair.publicKey,
      type: 'ed25519',
    }
    const lightDID = new LightDidDetails({
      authenticationKey: publicAuthKey,
    })
    const { details, metadata } = (await DefaultResolver.resolve(
      lightDID.did
    )) as IDidResolvedDetails

    expect(details?.getKey(`${lightDID.did}#authentication`)).toMatchObject<
      Partial<IDidKeyDetails>
    >({
      id: `${lightDID.did}#authentication`,
      controller: lightDID.did,
      publicKeyHex: u8aToHex(publicAuthKey.publicKey),
    })

    expect(metadata).toStrictEqual<IDidResolutionDocumentMetadata>({
      deactivated: false,
    })
  })

  it('Correctly resolves a light DID created with only an sr25519 authentication key', async () => {
    keypair = keyring.addFromMnemonic(mnemonic, undefined, 'sr25519')
    publicAuthKey = {
      publicKey: keypair.publicKey,
      type: 'sr25519',
    }
    const lightDID = new LightDidDetails({
      authenticationKey: publicAuthKey,
    })
    const { details, metadata } = (await DefaultResolver.resolve(
      lightDID.did
    )) as IDidResolvedDetails

    expect(details?.getKey(`${lightDID.did}#authentication`)).toMatchObject<
      Partial<IDidKeyDetails>
    >({
      id: `${lightDID.did}#authentication`,
      controller: lightDID.did,
      publicKeyHex: u8aToHex(publicAuthKey.publicKey),
    })

    expect(metadata).toStrictEqual<IDidResolutionDocumentMetadata>({
      deactivated: false,
    })
  })

  it('Correctly resolves a light DID created with an authentication, an encryption key, and three service endpoints', async () => {
    keypair = keyring.addFromMnemonic(mnemonic, undefined, 'ed25519')
    publicAuthKey = {
      publicKey: keypair.publicKey,
      type: 'sr25519',
    }
    encryptionKey = {
      publicKey: hexToU8a(
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
      ),
      type: 'x25519',
    }
    serviceEndpoints = [
      {
        id: 'id-1',
        types: ['type-1'],
        urls: ['url-1'],
      },
      {
        id: 'id-2',
        types: ['type-2'],
        urls: ['url-2'],
      },
      {
        id: 'id-3',
        types: ['type-3'],
        urls: ['url-3'],
      },
    ]
    const lightDID = new LightDidDetails({
      authenticationKey: publicAuthKey,
      encryptionKey,
      serviceEndpoints,
    })
    const { details, metadata } = (await DefaultResolver.resolve(
      lightDID.did
    )) as IDidResolvedDetails

    expect(details?.getKey(`${lightDID.did}#authentication`)).toMatchObject<
      Partial<IDidKeyDetails>
    >({
      id: `${lightDID.did}#authentication`,
      controller: lightDID.did,
      publicKeyHex: u8aToHex(publicAuthKey.publicKey),
    })
    expect(details?.getKey(`${lightDID.did}#encryption`)).toMatchObject<
      Partial<IDidKeyDetails>
    >({
      id: `${lightDID.did}#encryption`,
      controller: lightDID.did,
      publicKeyHex: u8aToHex(encryptionKey.publicKey),
    })
    expect(details?.getEndpoints()).toStrictEqual<IDidServiceEndpoint[]>([
      {
        id: `${lightDID.did}#id-1`,
        types: ['type-1'],
        urls: ['url-1'],
      },
      {
        id: `${lightDID.did}#id-2`,
        types: ['type-2'],
        urls: ['url-2'],
      },
      {
        id: `${lightDID.did}#id-3`,
        types: ['type-3'],
        urls: ['url-3'],
      },
    ])

    expect(metadata).toStrictEqual<IDidResolutionDocumentMetadata>({
      deactivated: false,
    })
  })

  it('Correctly resolves a light DID created with an authentication, an encryption key, and three service endpoints base64-encoded', async () => {
    keypair = keyring.addFromMnemonic(mnemonic, undefined, 'ed25519')
    publicAuthKey = {
      publicKey: keypair.publicKey,
      type: 'sr25519',
    }
    encryptionKey = {
      publicKey: hexToU8a(
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
      ),
      type: 'x25519',
    }
    serviceEndpoints = [
      {
        id: 'id-1',
        types: ['type-1'],
        urls: ['url-1'],
      },
      {
        id: 'id-2',
        types: ['type-2'],
        urls: ['url-2'],
      },
      {
        id: 'id-3',
        types: ['type-3'],
        urls: ['url-3'],
      },
    ]
    const lightDID = new LightDidDetails({
      authenticationKey: publicAuthKey,
      encryptionKey,
      serviceEndpoints,
      detailsEncoding: 'base64',
    })
    const { details, metadata } = (await DefaultResolver.resolve(
      lightDID.did
    )) as IDidResolvedDetails

    expect(details?.getKey(`${lightDID.did}#authentication`)).toMatchObject<
      Partial<IDidKeyDetails>
    >({
      id: `${lightDID.did}#authentication`,
      controller: lightDID.did,
      publicKeyHex: u8aToHex(publicAuthKey.publicKey),
    })
    expect(details?.getKey(`${lightDID.did}#encryption`)).toMatchObject<
      Partial<IDidKeyDetails>
    >({
      id: `${lightDID.did}#encryption`,
      controller: lightDID.did,
      publicKeyHex: u8aToHex(encryptionKey.publicKey),
    })
    expect(details?.getEndpoints()).toStrictEqual<IDidServiceEndpoint[]>([
      {
        id: `${lightDID.did}#id-1`,
        types: ['type-1'],
        urls: ['url-1'],
      },
      {
        id: `${lightDID.did}#id-2`,
        types: ['type-2'],
        urls: ['url-2'],
      },
      {
        id: `${lightDID.did}#id-3`,
        types: ['type-3'],
        urls: ['url-3'],
      },
    ])

    expect(metadata).toStrictEqual<IDidResolutionDocumentMetadata>({
      deactivated: false,
    })
  })

  it('Correctly resolves a light DID using a key ID', async () => {
    keypair = keyring.addFromMnemonic(mnemonic, undefined, 'sr25519')
    publicAuthKey = {
      publicKey: keypair.publicKey,
      type: 'sr25519',
    }
    const lightDID = new LightDidDetails({
      authenticationKey: publicAuthKey,
    })
    const { details, metadata } = (await DefaultResolver.resolveDoc(
      `${lightDID.did}#auth`
    )) as IDidResolvedDetails

    expect(details?.getKey(`${lightDID.did}#authentication`)).toMatchObject<
      Partial<IDidKeyDetails>
    >({
      id: `${lightDID.did}#authentication`,
      controller: lightDID.did,
      publicKeyHex: u8aToHex(publicAuthKey.publicKey),
    })

    expect(metadata).toStrictEqual<IDidResolutionDocumentMetadata>({
      deactivated: false,
    })
  })

  it('Correctly resolves a light DID using a service ID', async () => {
    keypair = keyring.addFromMnemonic(mnemonic, undefined, 'ed25519')
    publicAuthKey = {
      publicKey: keypair.publicKey,
      type: 'sr25519',
    }
    encryptionKey = {
      publicKey: hexToU8a(
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
      ),
      type: 'x25519',
    }
    serviceEndpoints = [
      {
        id: 'id-1',
        types: ['type-1'],
        urls: ['url-1'],
      },
      {
        id: 'id-2',
        types: ['type-2'],
        urls: ['url-2'],
      },
      {
        id: 'id-3',
        types: ['type-3'],
        urls: ['url-3'],
      },
    ]
    const lightDID = new LightDidDetails({
      authenticationKey: publicAuthKey,
      encryptionKey,
      serviceEndpoints,
    })
    const { details, metadata } = (await DefaultResolver.resolveDoc(
      `${lightDID.did}#id-1`
    )) as IDidResolvedDetails

    expect(details?.getKey(`${lightDID.did}#authentication`)).toMatchObject<
      Partial<IDidKeyDetails>
    >({
      id: `${lightDID.did}#authentication`,
      controller: lightDID.did,
      publicKeyHex: u8aToHex(publicAuthKey.publicKey),
    })
    expect(details?.getKey(`${lightDID.did}#encryption`)).toMatchObject<
      Partial<IDidKeyDetails>
    >({
      id: `${lightDID.did}#encryption`,
      controller: lightDID.did,
      publicKeyHex: u8aToHex(encryptionKey.publicKey),
    })
    expect(details?.getEndpoints()).toStrictEqual<IDidServiceEndpoint[]>([
      {
        id: `${lightDID.did}#id-1`,
        types: ['type-1'],
        urls: ['url-1'],
      },
      {
        id: `${lightDID.did}#id-2`,
        types: ['type-2'],
        urls: ['url-2'],
      },
      {
        id: `${lightDID.did}#id-3`,
        types: ['type-3'],
        urls: ['url-3'],
      },
    ])

    expect(metadata).toStrictEqual<IDidResolutionDocumentMetadata>({
      deactivated: false,
    })
  })
})

describe('Migrated DID resolution', () => {
  it('Correctly resolves a migrated light DID that has not been deleted', async () => {
    const { details, metadata } = (await DefaultResolver.resolve(
      migratedUndeletedLightDid
    )) as IDidResolvedDetails
    expect(details).toBeDefined()
    expect(metadata).toStrictEqual<IDidResolutionDocumentMetadata>({
      deactivated: false,
      canonicalId: fullDidPresentWithAuthenticationKey,
    })
  })

  it('Correctly resolves a migrated light DID that has been deleted', async () => {
    const { details, metadata } = (await DefaultResolver.resolve(
      migratedDeletedLightDid
    )) as IDidResolvedDetails
    expect(details).toBeUndefined()
    expect(metadata).toStrictEqual<IDidResolutionDocumentMetadata>({
      deactivated: true,
    })
  })
})
