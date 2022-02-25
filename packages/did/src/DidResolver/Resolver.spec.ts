/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { BN } from '@polkadot/util'
import { decodeAddress } from '@polkadot/util-crypto'
import Keyring from '@polkadot/keyring'

import {
  DidKey,
  DidResolutionDocumentMetadata,
  DidResolvedDetails,
  DidServiceEndpoint,
  IDidDetails,
  IDidIdentifier,
  KeyringPair,
  ResolvedDidKey,
  ResolvedDidServiceEndpoint,
  VerificationKeyType,
  EncryptionKeyType,
} from '@kiltprotocol/types'

import type { IDidChainRecordJSON } from '../Did.chain'
import { getKiltDidFromIdentifier } from '../Did.utils'

import { DidResolver } from './index.js'
import { LightDidDetails } from '../index.js'

/**
 * @group unit/did
 */

const identifierWithAuthenticationKey =
  '4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs'
const identifierWithAllKeys = '4sDxAgw86PFvC6TQbvZzo19WoYF6T4HcLd2i9wzvojkLXLvp'
const identifierWithServiceEndpoints =
  '4q4DHavMdesaSMH3g32xH3fhxYPt5pmoP9oSwgTr73dQLrkN'
const deletedIdentifier = '4rrVTLAXgeoE8jo8si571HnqHtd5WmvLuzfH6e1xBsVXsRo7'

function generateAuthenticationKeyDetails(): DidKey {
  return {
    id: 'auth',
    type: VerificationKeyType.Ed25519,
    publicKey: new Uint8Array(32).fill(0),
  }
}

function generateEncryptionKeyDetails(): DidKey {
  return {
    id: 'enc',
    type: EncryptionKeyType.X25519,
    publicKey: new Uint8Array(32).fill(1),
    includedAt: new BN(15),
  }
}

function generateAttestationKeyDetails(): DidKey {
  return {
    id: 'att',
    type: VerificationKeyType.Sr25519,
    publicKey: new Uint8Array(32).fill(2),
    includedAt: new BN(20),
  }
}

function generateDelegationKeyDetails(): DidKey {
  return {
    id: 'del',
    type: VerificationKeyType.Ecdsa,
    publicKey: new Uint8Array(32).fill(3),
    includedAt: new BN(25),
  }
}

function generateServiceEndpointDetails(serviceId: string): DidServiceEndpoint {
  return {
    id: serviceId,
    types: [`type-${serviceId}`],
    urls: [`url-${serviceId}`],
  }
}

jest.mock('../Did.chain', () => {
  const queryDetails = jest.fn(
    async (
      didIdentifier: IDidIdentifier
    ): Promise<IDidChainRecordJSON | null> => {
      const authKey = generateAuthenticationKeyDetails()
      const encKey = generateEncryptionKeyDetails()
      const attKey = generateAttestationKeyDetails()
      const delKey = generateDelegationKeyDetails()

      switch (didIdentifier) {
        case identifierWithAuthenticationKey:
          return {
            authenticationKey: authKey.id,
            keyAgreementKeys: [],
            publicKeys: [authKey],
            lastTxCounter: new BN(0),
            deposit: {
              amount: new BN(2),
              owner: didIdentifier,
            },
          }
        case identifierWithAllKeys:
          return {
            authenticationKey: authKey.id,
            keyAgreementKeys: [encKey.id],
            assertionMethodKey: attKey.id,
            capabilityDelegationKey: delKey.id,
            publicKeys: [authKey, encKey, attKey, delKey],
            lastTxCounter: new BN(0),
            deposit: {
              amount: new BN(2),
              owner: didIdentifier,
            },
          }
        case identifierWithServiceEndpoints:
          return {
            authenticationKey: authKey.id,
            keyAgreementKeys: [],
            publicKeys: [authKey],
            lastTxCounter: new BN(0),
            deposit: {
              amount: new BN(2),
              owner: didIdentifier,
            },
          }
        default:
          return null
      }
    }
  )
  const queryKey = jest.fn(
    async (
      didIdentifier: IDidIdentifier,
      keyId: DidKey['id']
    ): Promise<DidKey | null> => {
      const details = await queryDetails(didIdentifier)
      return details?.publicKeys.find((key) => key.id === keyId) || null
    }
  )
  const queryServiceEndpoint = jest.fn(
    async (
      didIdentifier: IDidIdentifier,
      serviceId: DidServiceEndpoint['id']
    ): Promise<DidServiceEndpoint | null> => {
      switch (didIdentifier) {
        case identifierWithServiceEndpoints:
          return generateServiceEndpointDetails(serviceId)
        default:
          return null
      }
    }
  )
  const queryServiceEndpoints = jest.fn(
    async (didIdentifier: IDidIdentifier): Promise<DidServiceEndpoint[]> => {
      switch (didIdentifier) {
        case identifierWithServiceEndpoints:
          return [
            (await queryServiceEndpoint(
              didIdentifier,
              'id-1'
            )) as DidServiceEndpoint,
            (await queryServiceEndpoint(
              didIdentifier,
              'id-2'
            )) as DidServiceEndpoint,
          ]
        default:
          return []
      }
    }
  )
  const queryDidDeletionStatus = jest.fn(
    async (didIdentifier: IDidIdentifier): Promise<boolean> => {
      return didIdentifier === deletedIdentifier
    }
  )
  return {
    queryDetails,
    queryKey,
    queryServiceEndpoint,
    queryServiceEndpoints,
    queryDidDeletionStatus,
  }
})

describe('When resolving a key', () => {
  it('correctly resolves it for a full DID if both the DID and the key exist', async () => {
    const fullDid = getKiltDidFromIdentifier(
      identifierWithAuthenticationKey,
      'full'
    )
    const keyIdUri = `${fullDid}#auth`

    await expect(
      DidResolver.resolveKey(keyIdUri)
    ).resolves.toStrictEqual<ResolvedDidKey>({
      controller: fullDid,
      publicKey: new Uint8Array(32).fill(0),
      id: keyIdUri,
      type: VerificationKeyType.Ed25519,
    })
  })

  it('returns null if either the DID or the key do not exist', async () => {
    const deletedFullDid = getKiltDidFromIdentifier(deletedIdentifier, 'full')
    let keyIdUri = `${deletedFullDid}#enc`

    await expect(DidResolver.resolveKey(keyIdUri)).resolves.toBeNull()

    const didWithNoEncryptionKey = getKiltDidFromIdentifier(
      identifierWithAuthenticationKey,
      'full'
    )
    keyIdUri = `${didWithNoEncryptionKey}#enc`

    await expect(DidResolver.resolveKey(keyIdUri)).resolves.toBeNull()
  })

  it('throws for invalid URIs', async () => {
    const uriWithoutFragment = getKiltDidFromIdentifier(
      deletedIdentifier,
      'full'
    )
    await expect(DidResolver.resolveKey(uriWithoutFragment)).rejects.toThrow()

    const invalidUri = 'invalid-uri'
    await expect(DidResolver.resolveKey(invalidUri)).rejects.toThrow()
  })
})

describe('When resolving a service endpoint', () => {
  it('correctly resolves it for a full DID if both the DID and the endpoint exist', async () => {
    const fullDid = getKiltDidFromIdentifier(
      identifierWithServiceEndpoints,
      'full'
    )
    const serviceIdUri = `${fullDid}#service-1`

    await expect(
      DidResolver.resolveServiceEndpoint(serviceIdUri)
    ).resolves.toStrictEqual<ResolvedDidServiceEndpoint>({
      id: serviceIdUri,
      type: [`type-service-1`],
      serviceEndpoint: [`url-service-1`],
    })
  })

  it('returns null if either the DID or the service do not exist', async () => {
    const deletedFullDid = getKiltDidFromIdentifier(deletedIdentifier, 'full')
    let serviceIdUri = `${deletedFullDid}#service-1`

    await expect(
      DidResolver.resolveServiceEndpoint(serviceIdUri)
    ).resolves.toBeNull()

    const didWithNoServiceEndpoints = getKiltDidFromIdentifier(
      identifierWithAuthenticationKey,
      'full'
    )
    serviceIdUri = `${didWithNoServiceEndpoints}#service-1`

    await expect(
      DidResolver.resolveServiceEndpoint(serviceIdUri)
    ).resolves.toBeNull()
  })

  it('throws for invalid URIs', async () => {
    const uriWithoutFragment = getKiltDidFromIdentifier(
      deletedIdentifier,
      'full'
    )
    await expect(
      DidResolver.resolveServiceEndpoint(uriWithoutFragment)
    ).rejects.toThrow()

    const invalidUri = 'invalid-uri'
    await expect(
      DidResolver.resolveServiceEndpoint(invalidUri)
    ).rejects.toThrow()
  })
})

describe('When resolving a full DID', () => {
  it('correctly resolves the details with an authentication key', async () => {
    const fullDidWithAuthenticationKey = getKiltDidFromIdentifier(
      identifierWithAuthenticationKey,
      'full'
    )
    const { details, metadata } = (await DidResolver.resolve(
      fullDidWithAuthenticationKey
    )) as DidResolvedDetails

    expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
      deactivated: false,
    })
    expect(details?.did).toStrictEqual<IDidDetails['did']>(
      fullDidWithAuthenticationKey
    )
    expect(details?.getKeys()).toStrictEqual<DidKey[]>([
      {
        id: 'auth',
        type: VerificationKeyType.Ed25519,
        publicKey: new Uint8Array(32).fill(0),
      },
    ])
  })

  it('correctly resolves the details with all keys', async () => {
    const fullDidWithAllKeys = getKiltDidFromIdentifier(
      identifierWithAllKeys,
      'full'
    )
    const { details, metadata } = (await DidResolver.resolve(
      fullDidWithAllKeys
    )) as DidResolvedDetails

    expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
      deactivated: false,
    })
    expect(details?.did).toStrictEqual<IDidDetails['did']>(fullDidWithAllKeys)
    expect(details?.getKeys()).toStrictEqual<DidKey[]>([
      {
        id: 'auth',
        type: VerificationKeyType.Ed25519,
        publicKey: new Uint8Array(32).fill(0),
      },
      {
        id: 'enc',
        type: EncryptionKeyType.X25519,
        publicKey: new Uint8Array(32).fill(1),
        includedAt: new BN(15),
      },
      {
        id: 'att',
        type: VerificationKeyType.Sr25519,
        publicKey: new Uint8Array(32).fill(2),
        includedAt: new BN(20),
      },
      {
        id: 'del',
        type: VerificationKeyType.Ecdsa,
        publicKey: new Uint8Array(32).fill(3),
        includedAt: new BN(25),
      },
    ])
  })

  it('correctly resolves the details with service endpoints', async () => {
    const fullDidWithServiceEndpoints = getKiltDidFromIdentifier(
      identifierWithServiceEndpoints,
      'full'
    )
    const { details, metadata } = (await DidResolver.resolve(
      fullDidWithServiceEndpoints
    )) as DidResolvedDetails

    expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
      deactivated: false,
    })
    expect(details?.did).toStrictEqual<IDidDetails['did']>(
      fullDidWithServiceEndpoints
    )
    expect(details?.getEndpoints()).toStrictEqual<DidServiceEndpoint[]>([
      {
        id: 'id-1',
        types: ['type-id-1'],
        urls: ['url-id-1'],
      },
      {
        id: 'id-2',
        types: ['type-id-2'],
        urls: ['url-id-2'],
      },
    ])
  })

  it('correctly resolves a non-existing DID', async () => {
    const randomIdentifier = new Keyring({ ss58Format: 38 }).addFromSeed(
      new Uint8Array(32).fill(32)
    ).address
    const randomDid = getKiltDidFromIdentifier(randomIdentifier, 'full')

    await expect(DidResolver.resolveDoc(randomDid)).resolves.toBeNull()
  })

  it('correctly resolves a deleted DID', async () => {
    const deletedDid = getKiltDidFromIdentifier(deletedIdentifier, 'full')
    const { details, metadata } = (await DidResolver.resolve(
      deletedDid
    )) as DidResolvedDetails

    expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
      deactivated: true,
    })
    expect(details).toBeUndefined()
  })

  it('correctly resolves DID details given a fragment', async () => {
    const fullDidWithAuthenticationKey = getKiltDidFromIdentifier(
      identifierWithAuthenticationKey,
      'full'
    )
    const keyIdUri = `${fullDidWithAuthenticationKey}#auth`
    const { details, metadata } = (await DidResolver.resolveDoc(
      keyIdUri
    )) as DidResolvedDetails

    expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
      deactivated: false,
    })
    expect(details?.did).toStrictEqual<IDidDetails['did']>(
      fullDidWithAuthenticationKey
    )
  })
})

describe('When resolving a light DID', () => {
  const keyring: Keyring = new Keyring({ ss58Format: 38 })
  const authKey: KeyringPair = keyring.addFromMnemonic('auth')
  const encryptionKey: KeyringPair = keyring.addFromMnemonic('enc')

  it('correctly resolves the details with an authentication key', async () => {
    const lightDidWithAuthenticationKey = LightDidDetails.fromDetails({
      authenticationKey: {
        publicKey: authKey.publicKey,
        type: VerificationKeyType.Sr25519,
      },
    })
    const { details, metadata } = (await DidResolver.resolve(
      lightDidWithAuthenticationKey.did
    )) as DidResolvedDetails

    expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
      deactivated: false,
    })
    expect(details?.did).toStrictEqual<IDidDetails['did']>(
      lightDidWithAuthenticationKey.did
    )
    expect(lightDidWithAuthenticationKey?.getKeys()).toStrictEqual<DidKey[]>([
      {
        id: 'authentication',
        type: VerificationKeyType.Sr25519,
        publicKey: authKey.publicKey,
      },
    ])
  })

  it('correctly resolves the details with authentication key, encryption key, and two service endpoints', async () => {
    const lightDid = LightDidDetails.fromDetails({
      authenticationKey: {
        publicKey: authKey.publicKey,
        type: VerificationKeyType.Sr25519,
      },
      encryptionKey: {
        publicKey: encryptionKey.publicKey,
        type: EncryptionKeyType.X25519,
      },
      serviceEndpoints: [
        generateServiceEndpointDetails('service-1'),
        generateServiceEndpointDetails('service-2'),
      ],
    })
    const { details, metadata } = (await DidResolver.resolve(
      lightDid.did
    )) as DidResolvedDetails

    expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
      deactivated: false,
    })
    expect(details?.did).toStrictEqual<IDidDetails['did']>(lightDid.did)
    expect(lightDid?.getKeys()).toStrictEqual<DidKey[]>([
      {
        id: 'authentication',
        type: VerificationKeyType.Sr25519,
        publicKey: authKey.publicKey,
      },
      {
        id: 'encryption',
        type: EncryptionKeyType.X25519,
        publicKey: encryptionKey.publicKey,
      },
    ])
    expect(lightDid?.getEndpoints()).toStrictEqual<DidServiceEndpoint[]>([
      {
        id: 'service-1',
        types: ['type-service-1'],
        urls: ['url-service-1'],
      },
      {
        id: 'service-2',
        types: ['type-service-2'],
        urls: ['url-service-2'],
      },
    ])
  })

  it('correctly resolves a migrated and not deleted DID', async () => {
    const migratedDid = getKiltDidFromIdentifier(
      '00'.concat(identifierWithAuthenticationKey),
      'light'
    )
    const { details, metadata } = (await DidResolver.resolve(
      migratedDid
    )) as DidResolvedDetails

    expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
      deactivated: false,
      canonicalId: getKiltDidFromIdentifier(
        identifierWithAuthenticationKey,
        'full'
      ),
    })
    expect(details?.did).toStrictEqual<IDidIdentifier>(migratedDid)
    expect(details?.getKeys()).toStrictEqual<DidKey[]>([
      {
        id: 'authentication',
        type: VerificationKeyType.Sr25519,
        publicKey: decodeAddress(identifierWithAuthenticationKey, false, 38),
      },
    ])
  })

  it('correctly resolves a migrated and deleted DID', async () => {
    const migratedDid = getKiltDidFromIdentifier(
      '00'.concat(deletedIdentifier),
      'light'
    )
    const { details, metadata } = (await DidResolver.resolve(
      migratedDid
    )) as DidResolvedDetails

    expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
      deactivated: true,
    })
    expect(details).toBeUndefined()
  })

  it('correctly resolves DID details given a fragment', async () => {
    const lightDid = LightDidDetails.fromDetails({
      authenticationKey: {
        publicKey: authKey.publicKey,
        type: VerificationKeyType.Sr25519,
      },
    })
    const keyIdUri = `${lightDid.did}#auth`
    const { details, metadata } = (await DidResolver.resolveDoc(
      keyIdUri
    )) as DidResolvedDetails

    expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
      deactivated: false,
    })
    expect(details?.did).toStrictEqual<IDidDetails['did']>(lightDid.did)
  })
})
