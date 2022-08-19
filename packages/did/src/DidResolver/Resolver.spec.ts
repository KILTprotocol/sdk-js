/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { BN } from '@polkadot/util'
import { decodeAddress } from '@polkadot/util-crypto'
import Keyring from '@polkadot/keyring'

import type {
  DidEncryptionKey,
  DidIdentifier,
  DidKey,
  DidResolutionDocumentMetadata,
  DidResolvedDetails,
  DidResourceUri,
  DidServiceEndpoint,
  DidUri,
  DidVerificationKey,
  ResolvedDidKey,
  ResolvedDidServiceEndpoint,
  UriFragment,
} from '@kiltprotocol/types'
import { ss58Format } from '@kiltprotocol/utils'
import { makeSigningKeyTool } from '@kiltprotocol/testing'

import type { IDidChainRecord } from '../Did.chain'
import { getFullDidUriByKey, stripFragment } from '../Did.utils'

import { DidResolver } from './index.js'
import * as Did from '../index.js'

/**
 * @group unit/did
 */

const identifierWithAuthenticationKey =
  '4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs'
const didWithAuthenticationKey: DidUri = `did:kilt:${identifierWithAuthenticationKey}`
const identifierWithAllKeys = '4sDxAgw86PFvC6TQbvZzo19WoYF6T4HcLd2i9wzvojkLXLvp'
const didWithAllKeys: DidUri = `did:kilt:${identifierWithAllKeys}`
const identifierWithServiceEndpoints =
  '4q4DHavMdesaSMH3g32xH3fhxYPt5pmoP9oSwgTr73dQLrkN'
const didWithServiceEndpoints: DidUri = `did:kilt:${identifierWithServiceEndpoints}`
const deletedIdentifier = '4rrVTLAXgeoE8jo8si571HnqHtd5WmvLuzfH6e1xBsVXsRo7'
const deletedDid: DidUri = `did:kilt:${deletedIdentifier}`

function generateAuthenticationKeyDetails(): DidVerificationKey {
  return {
    id: '#auth',
    type: 'ed25519',
    publicKey: new Uint8Array(32).fill(0),
  }
}

function generateEncryptionKeyDetails(): DidEncryptionKey {
  return {
    id: '#enc',
    type: 'x25519',
    publicKey: new Uint8Array(32).fill(1),
    includedAt: new BN(15),
  }
}

function generateAttestationKeyDetails(): DidVerificationKey {
  return {
    id: '#att',
    type: 'sr25519',
    publicKey: new Uint8Array(32).fill(2),
    includedAt: new BN(20),
  }
}

function generateDelegationKeyDetails(): DidVerificationKey {
  return {
    id: '#del',
    type: 'ecdsa',
    publicKey: new Uint8Array(32).fill(3),
    includedAt: new BN(25),
  }
}

function generateServiceEndpointDetails(
  serviceId: UriFragment
): DidServiceEndpoint {
  const fragment = stripFragment(serviceId)
  return {
    id: serviceId,
    type: [`type-${fragment}`],
    serviceEndpoint: [`x:url-${fragment}`],
  }
}

jest.mock('../Did.chain', () => {
  const queryDetails = jest.fn(
    async (didIdentifier: DidIdentifier): Promise<IDidChainRecord | null> => {
      const authKey = generateAuthenticationKeyDetails()
      const encKey = generateEncryptionKeyDetails()
      const attKey = generateAttestationKeyDetails()
      const delKey = generateDelegationKeyDetails()

      switch (didIdentifier) {
        case identifierWithAuthenticationKey:
          return {
            authentication: [authKey],
            lastTxCounter: new BN(0),
            deposit: {
              amount: new BN(2),
              owner: didIdentifier,
            },
          }
        case identifierWithAllKeys:
          return {
            authentication: [authKey],
            keyAgreement: [encKey],
            assertionMethod: [attKey],
            capabilityDelegation: [delKey],
            lastTxCounter: new BN(0),
            deposit: {
              amount: new BN(2),
              owner: didIdentifier,
            },
          }
        case identifierWithServiceEndpoints:
          return {
            authentication: [authKey],
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
  const queryServiceEndpoint = jest.fn(
    async (
      didIdentifier: DidIdentifier,
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
    async (didIdentifier: DidIdentifier): Promise<DidServiceEndpoint[]> => {
      switch (didIdentifier) {
        case identifierWithServiceEndpoints:
          return [
            (await queryServiceEndpoint(
              didIdentifier,
              '#id-1'
            )) as DidServiceEndpoint,
            (await queryServiceEndpoint(
              didIdentifier,
              '#id-2'
            )) as DidServiceEndpoint,
          ]
        default:
          return []
      }
    }
  )
  const queryDidDeletionStatus = jest.fn(
    async (didIdentifier: DidIdentifier): Promise<boolean> =>
      didIdentifier === deletedIdentifier
  )
  return {
    queryDetails,
    queryServiceEndpoint,
    queryServiceEndpoints,
    queryDidDeletionStatus,
  }
})

describe('When resolving a key', () => {
  it('correctly resolves it for a full DID if both the DID and the key exist', async () => {
    const fullDid = didWithAuthenticationKey
    const keyIdUri: DidResourceUri = `${fullDid}#auth`

    expect(
      await DidResolver.resolveKey(keyIdUri)
    ).toStrictEqual<ResolvedDidKey>({
      controller: fullDid,
      publicKey: new Uint8Array(32).fill(0),
      id: keyIdUri,
      type: 'ed25519',
    })
  })

  it('returns null if either the DID or the key do not exist', async () => {
    let keyIdUri: DidResourceUri = `${deletedDid}#enc`

    expect(await DidResolver.resolveKey(keyIdUri)).toBeNull()

    const didWithNoEncryptionKey = didWithAuthenticationKey
    keyIdUri = `${didWithNoEncryptionKey}#enc`

    expect(await DidResolver.resolveKey(keyIdUri)).toBeNull()
  })

  it('throws for invalid URIs', async () => {
    const uriWithoutFragment = deletedDid
    await expect(
      DidResolver.resolveKey(uriWithoutFragment as DidResourceUri)
    ).rejects.toThrow()

    const invalidUri = 'invalid-uri' as DidResourceUri
    await expect(DidResolver.resolveKey(invalidUri)).rejects.toThrow()
  })
})

describe('When resolving a service endpoint', () => {
  it('correctly resolves it for a full DID if both the DID and the endpoint exist', async () => {
    const fullDid = didWithServiceEndpoints
    const serviceIdUri: DidResourceUri = `${fullDid}#service-1`

    expect(
      await DidResolver.resolveServiceEndpoint(serviceIdUri)
    ).toStrictEqual<ResolvedDidServiceEndpoint>({
      id: serviceIdUri,
      type: [`type-service-1`],
      serviceEndpoint: [`x:url-service-1`],
    })
  })

  it('returns null if either the DID or the service do not exist', async () => {
    let serviceIdUri: DidResourceUri = `${deletedDid}#service-1`

    expect(await DidResolver.resolveServiceEndpoint(serviceIdUri)).toBeNull()

    const didWithNoServiceEndpoints = didWithAuthenticationKey
    serviceIdUri = `${didWithNoServiceEndpoints}#service-1`

    expect(await DidResolver.resolveServiceEndpoint(serviceIdUri)).toBeNull()
  })

  it('throws for invalid URIs', async () => {
    const uriWithoutFragment = deletedDid
    await expect(
      DidResolver.resolveServiceEndpoint(uriWithoutFragment as DidResourceUri)
    ).rejects.toThrow()

    const invalidUri = 'invalid-uri' as DidResourceUri
    await expect(
      DidResolver.resolveServiceEndpoint(invalidUri)
    ).rejects.toThrow()
  })
})

describe('When resolving a full DID', () => {
  it('correctly resolves the details with an authentication key', async () => {
    const fullDidWithAuthenticationKey = didWithAuthenticationKey
    const { details, metadata } = (await DidResolver.resolve(
      fullDidWithAuthenticationKey
    )) as DidResolvedDetails
    if (!details) throw new Error('Details unresolved')

    expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
      deactivated: false,
    })
    expect(details.uri).toStrictEqual<DidUri>(fullDidWithAuthenticationKey)
    expect(Did.getKeys(details)).toStrictEqual<DidKey[]>([
      {
        id: '#auth',
        type: 'ed25519',
        publicKey: new Uint8Array(32).fill(0),
      },
    ])
  })

  it('correctly resolves the details with all keys', async () => {
    const fullDidWithAllKeys = didWithAllKeys
    const { details, metadata } = (await DidResolver.resolve(
      fullDidWithAllKeys
    )) as DidResolvedDetails
    if (!details) throw new Error('Details unresolved')

    expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
      deactivated: false,
    })
    expect(details.uri).toStrictEqual<DidUri>(fullDidWithAllKeys)
    expect(Did.getKeys(details)).toStrictEqual<DidKey[]>([
      {
        id: '#auth',
        type: 'ed25519',
        publicKey: new Uint8Array(32).fill(0),
      },
      {
        id: '#att',
        type: 'sr25519',
        publicKey: new Uint8Array(32).fill(2),
        includedAt: new BN(20),
      },
      {
        id: '#del',
        type: 'ecdsa',
        publicKey: new Uint8Array(32).fill(3),
        includedAt: new BN(25),
      },
      {
        id: '#enc',
        type: 'x25519',
        publicKey: new Uint8Array(32).fill(1),
        includedAt: new BN(15),
      },
    ])
  })

  it('correctly resolves the details with service endpoints', async () => {
    const fullDidWithServiceEndpoints = didWithServiceEndpoints
    const { details, metadata } = (await DidResolver.resolve(
      fullDidWithServiceEndpoints
    )) as DidResolvedDetails
    if (!details) throw new Error('Details unresolved')

    expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
      deactivated: false,
    })
    expect(details.uri).toStrictEqual<DidUri>(fullDidWithServiceEndpoints)
    expect(details.service).toStrictEqual<DidServiceEndpoint[]>([
      {
        id: '#id-1',
        type: ['type-id-1'],
        serviceEndpoint: ['x:url-id-1'],
      },
      {
        id: '#id-2',
        type: ['type-id-2'],
        serviceEndpoint: ['x:url-id-2'],
      },
    ])
  })

  it('correctly resolves a non-existing DID', async () => {
    const randomDid = getFullDidUriByKey(makeSigningKeyTool().authentication[0])
    expect(await DidResolver.resolveDoc(randomDid)).toBeNull()
  })

  it('correctly resolves a deleted DID', async () => {
    const { details, metadata } = (await DidResolver.resolve(
      deletedDid
    )) as DidResolvedDetails

    expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
      deactivated: true,
    })
    expect(details).toBeUndefined()
  })

  it('correctly resolves DID details given a fragment', async () => {
    const fullDidWithAuthenticationKey = didWithAuthenticationKey
    const keyIdUri: DidUri = `${fullDidWithAuthenticationKey}#auth`
    const { details, metadata } = (await DidResolver.resolveDoc(
      keyIdUri
    )) as DidResolvedDetails

    expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
      deactivated: false,
    })
    expect(details?.uri).toStrictEqual<DidUri>(fullDidWithAuthenticationKey)
  })
})

describe('When resolving a light DID', () => {
  const keyring = new Keyring({ ss58Format })
  const authKey = keyring.addFromMnemonic('auth')
  const encryptionKey = keyring.addFromMnemonic('enc')

  it('correctly resolves the details with an authentication key', async () => {
    const lightDidWithAuthenticationKey = Did.createDetails({
      authentication: [{ publicKey: authKey.publicKey, type: 'sr25519' }],
    })
    const { details, metadata } = (await DidResolver.resolve(
      lightDidWithAuthenticationKey.uri
    )) as DidResolvedDetails

    expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
      deactivated: false,
    })
    expect(details?.uri).toStrictEqual<DidUri>(
      lightDidWithAuthenticationKey.uri
    )
    expect(Did.getKeys(lightDidWithAuthenticationKey)).toStrictEqual<DidKey[]>([
      {
        id: '#authentication',
        type: 'sr25519',
        publicKey: authKey.publicKey,
      },
    ])
  })

  it('correctly resolves the details with authentication key, encryption key, and two service endpoints', async () => {
    const lightDid = Did.createDetails({
      authentication: [{ publicKey: authKey.publicKey, type: 'sr25519' }],
      keyAgreement: [{ publicKey: encryptionKey.publicKey, type: 'x25519' }],
      service: [
        generateServiceEndpointDetails('#service-1'),
        generateServiceEndpointDetails('#service-2'),
      ],
    })
    const { details, metadata } = (await DidResolver.resolve(
      lightDid.uri
    )) as DidResolvedDetails

    expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
      deactivated: false,
    })
    expect(details?.uri).toStrictEqual<DidUri>(lightDid.uri)
    expect(Did.getKeys(lightDid)).toStrictEqual<DidKey[]>([
      {
        id: '#authentication',
        type: 'sr25519',
        publicKey: authKey.publicKey,
      },
      {
        id: '#encryption',
        type: 'x25519',
        publicKey: encryptionKey.publicKey,
      },
    ])
    expect(lightDid.service).toStrictEqual<DidServiceEndpoint[]>([
      {
        id: '#service-1',
        type: ['type-service-1'],
        serviceEndpoint: ['x:url-service-1'],
      },
      {
        id: '#service-2',
        type: ['type-service-2'],
        serviceEndpoint: ['x:url-service-2'],
      },
    ])
  })

  it('correctly resolves a migrated and not deleted DID', async () => {
    const migratedDid: DidUri = `did:kilt:light:00${identifierWithAuthenticationKey}`
    const { details, metadata } = (await DidResolver.resolve(
      migratedDid
    )) as DidResolvedDetails
    if (!details) throw new Error('Details unresolved')

    expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
      deactivated: false,
      canonicalId: didWithAuthenticationKey,
    })
    expect(details?.uri).toStrictEqual<DidUri>(migratedDid)
    expect(Did.getKeys(details)).toStrictEqual<DidKey[]>([
      {
        id: '#authentication',
        type: 'sr25519',
        publicKey: decodeAddress(
          identifierWithAuthenticationKey,
          false,
          ss58Format
        ),
      },
    ])
  })

  it('correctly resolves a migrated and deleted DID', async () => {
    const migratedDid: DidUri = `did:kilt:light:00${deletedIdentifier}`
    const { details, metadata } = (await DidResolver.resolve(
      migratedDid
    )) as DidResolvedDetails

    expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
      deactivated: true,
    })
    expect(details).toBeUndefined()
  })

  it('correctly resolves DID details given a fragment', async () => {
    const lightDid = Did.createDetails({
      authentication: [{ publicKey: authKey.publicKey, type: 'sr25519' }],
    })
    const keyIdUri: DidUri = `${lightDid.uri}#auth`
    const { details, metadata } = (await DidResolver.resolveDoc(
      keyIdUri
    )) as DidResolvedDetails

    expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
      deactivated: false,
    })
    expect(details?.uri).toStrictEqual<DidUri>(lightDid.uri)
  })
})
