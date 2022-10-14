/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { BN } from '@polkadot/util'

import type {
  DidEncryptionKey,
  DidKey,
  DidResolutionDocumentMetadata,
  DidResolutionResult,
  DidResourceUri,
  DidServiceEndpoint,
  DidUri,
  DidVerificationKey,
  ResolvedDidKey,
  ResolvedDidServiceEndpoint,
  UriFragment,
} from '@kiltprotocol/types'
import { Crypto } from '@kiltprotocol/utils'
import { ApiMocks, makeSigningKeyTool } from '@kiltprotocol/testing'
import { ConfigService } from '@kiltprotocol/config'

import { getFullDidUriFromKey } from '../Did.utils'
import {
  documentFromChain,
  resourceIdToChain,
  serviceFromChain,
  servicesFromChain,
} from '../Did.chain.js'

import { resolve, resolveKey, resolveService } from './index.js'
import * as Did from '../index.js'

/**
 * @group unit/did
 */

const addressWithAuthenticationKey =
  '4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs'
const didWithAuthenticationKey: DidUri = `did:kilt:${addressWithAuthenticationKey}`
const addressWithAllKeys = `4sDxAgw86PFvC6TQbvZzo19WoYF6T4HcLd2i9wzvojkLXLvp`
const didWithAllKeys: DidUri = `did:kilt:${addressWithAllKeys}`
const addressWithServiceEndpoints = `4q4DHavMdesaSMH3g32xH3fhxYPt5pmoP9oSwgTr73dQLrkN`
const didWithServiceEndpoints: DidUri = `did:kilt:${addressWithServiceEndpoints}`
const deletedAddress = '4rrVTLAXgeoE8jo8si571HnqHtd5WmvLuzfH6e1xBsVXsRo7'
const deletedDid: DidUri = `did:kilt:${deletedAddress}`

const didNotFound = ApiMocks.mockChainQueryReturn('did', 'did')
const encodedDidWithAuthenticationKey = ApiMocks.mockChainQueryReturn(
  'did',
  'did',
  [
    '01234567890123456789012345678901',
    [],
    undefined,
    undefined,
    [],
    '123',
    [addressWithAuthenticationKey, '0'],
  ]
)
const didIsBlacklisted = ApiMocks.mockChainQueryReturn(
  'did',
  'didBlacklist',
  'true'
)

let mockedApi: any
beforeAll(() => {
  mockedApi = ApiMocks.getMockedApi()
  ConfigService.set({ api: mockedApi })

  mockedApi.query.did.did.mockReturnValue(encodedDidWithAuthenticationKey)
  mockedApi.query.did.serviceEndpoints.mockReturnValue(
    ApiMocks.mockChainQueryReturn('did', 'serviceEndpoints', [
      'foo',
      ['type-service-1'],
      ['x:url-service-1'],
    ])
  )
})

function generateAuthenticationKey(): DidVerificationKey {
  return {
    id: '#auth',
    type: 'ed25519',
    publicKey: new Uint8Array(32).fill(0),
  }
}

function generateEncryptionKey(): DidEncryptionKey {
  return {
    id: '#enc',
    type: 'x25519',
    publicKey: new Uint8Array(32).fill(1),
    includedAt: new BN(15),
  }
}

function generateAttestationKey(): DidVerificationKey {
  return {
    id: '#att',
    type: 'sr25519',
    publicKey: new Uint8Array(32).fill(2),
    includedAt: new BN(20),
  }
}

function generateDelegationKey(): DidVerificationKey {
  return {
    id: '#del',
    type: 'ecdsa',
    publicKey: new Uint8Array(32).fill(3),
    includedAt: new BN(25),
  }
}

function generateServiceEndpoint(serviceId: UriFragment): DidServiceEndpoint {
  const fragment = serviceId.substring(1)
  return {
    id: serviceId,
    type: [`type-${fragment}`],
    serviceEndpoint: [`x:url-${fragment}`],
  }
}

jest.mock('../Did.chain.js')

jest.mocked(documentFromChain).mockReturnValue({
  authentication: [generateAuthenticationKey()],
  lastTxCounter: new BN(0),
  deposit: {
    amount: new BN(0),
    owner: addressWithAuthenticationKey,
  },
})
jest
  .mocked(serviceFromChain)
  .mockReturnValue(generateServiceEndpoint('#service-1'))
jest
  .mocked(servicesFromChain)
  .mockReturnValue([generateServiceEndpoint('#service-1')])
jest
  .mocked(resourceIdToChain)
  .mockImplementation((id: string) => id.substring(1))

describe('When resolving a key', () => {
  it('correctly resolves it for a full DID if both the DID and the key exist', async () => {
    const fullDid = didWithAuthenticationKey
    const keyIdUri: DidResourceUri = `${fullDid}#auth`

    expect(await resolveKey(keyIdUri)).toStrictEqual<ResolvedDidKey>({
      controller: fullDid,
      publicKey: new Uint8Array(32).fill(0),
      id: keyIdUri,
      type: 'ed25519',
    })
  })

  it('returns null if either the DID or the key do not exist', async () => {
    let keyIdUri: DidResourceUri = `${deletedDid}#enc`

    await expect(resolveKey(keyIdUri)).rejects.toThrow()

    const didWithNoEncryptionKey = didWithAuthenticationKey
    keyIdUri = `${didWithNoEncryptionKey}#enc`

    await expect(resolveKey(keyIdUri)).rejects.toThrow()
  })

  it('throws for invalid URIs', async () => {
    const uriWithoutFragment = deletedDid
    await expect(
      resolveKey(uriWithoutFragment as DidResourceUri)
    ).rejects.toThrow()

    const invalidUri = 'invalid-uri' as DidResourceUri
    await expect(resolveKey(invalidUri)).rejects.toThrow()
  })
})

describe('When resolving a service endpoint', () => {
  it('correctly resolves it for a full DID if both the DID and the endpoint exist', async () => {
    const fullDid = didWithServiceEndpoints
    const serviceIdUri: DidResourceUri = `${fullDid}#service-1`

    expect(
      await resolveService(serviceIdUri)
    ).toStrictEqual<ResolvedDidServiceEndpoint>({
      id: serviceIdUri,
      type: [`type-service-1`],
      serviceEndpoint: [`x:url-service-1`],
    })
  })

  it('returns null if either the DID or the service do not exist', async () => {
    mockedApi.query.did.serviceEndpoints.mockReturnValueOnce(
      ApiMocks.mockChainQueryReturn('did', 'serviceEndpoints')
    )
    mockedApi.query.did.serviceEndpoints.mockReturnValueOnce(
      ApiMocks.mockChainQueryReturn('did', 'serviceEndpoints')
    )

    let serviceIdUri: DidResourceUri = `${deletedDid}#service-1`

    await expect(resolveService(serviceIdUri)).rejects.toThrow()

    const didWithNoServiceEndpoints = didWithAuthenticationKey
    serviceIdUri = `${didWithNoServiceEndpoints}#service-1`

    await expect(resolveService(serviceIdUri)).rejects.toThrow()
  })

  it('throws for invalid URIs', async () => {
    const uriWithoutFragment = deletedDid
    await expect(
      resolveService(uriWithoutFragment as DidResourceUri)
    ).rejects.toThrow()

    const invalidUri = 'invalid-uri' as DidResourceUri
    await expect(resolveService(invalidUri)).rejects.toThrow()
  })
})

describe('When resolving a full DID', () => {
  it('correctly resolves the document with an authentication key', async () => {
    const fullDidWithAuthenticationKey = didWithAuthenticationKey
    const { document, metadata } = (await resolve(
      fullDidWithAuthenticationKey
    )) as DidResolutionResult
    if (document === undefined) throw new Error('Document unresolved')

    expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
      deactivated: false,
    })
    expect(document.uri).toStrictEqual<DidUri>(fullDidWithAuthenticationKey)
    expect(Did.getKeys(document)).toStrictEqual<DidKey[]>([
      {
        id: '#auth',
        type: 'ed25519',
        publicKey: new Uint8Array(32).fill(0),
      },
    ])
  })

  it('correctly resolves the document with all keys', async () => {
    jest.mocked(documentFromChain).mockReturnValueOnce({
      authentication: [generateAuthenticationKey()],
      keyAgreement: [generateEncryptionKey()],
      assertionMethod: [generateAttestationKey()],
      capabilityDelegation: [generateDelegationKey()],
      lastTxCounter: new BN(0),
      deposit: {
        amount: new BN(0),
        owner: addressWithAuthenticationKey,
      },
    })
    const fullDidWithAllKeys = didWithAllKeys
    const { document, metadata } = (await resolve(
      fullDidWithAllKeys
    )) as DidResolutionResult
    if (document === undefined) throw new Error('Document unresolved')

    expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
      deactivated: false,
    })
    expect(document.uri).toStrictEqual<DidUri>(fullDidWithAllKeys)
    expect(Did.getKeys(document)).toStrictEqual<DidKey[]>([
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

  it('correctly resolves the document with service endpoints', async () => {
    jest
      .mocked(servicesFromChain)
      .mockReturnValue([
        generateServiceEndpoint('#id-1'),
        generateServiceEndpoint('#id-2'),
      ])
    const fullDidWithServiceEndpoints = didWithServiceEndpoints
    const { document, metadata } = (await resolve(
      fullDidWithServiceEndpoints
    )) as DidResolutionResult
    if (document === undefined) throw new Error('Document unresolved')

    expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
      deactivated: false,
    })
    expect(document.uri).toStrictEqual<DidUri>(fullDidWithServiceEndpoints)
    expect(document.service).toStrictEqual<DidServiceEndpoint[]>([
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
    mockedApi.query.did.did.mockReturnValueOnce(didNotFound)
    const randomDid = getFullDidUriFromKey(
      makeSigningKeyTool().authentication[0]
    )
    expect(await resolve(randomDid)).toBeNull()
  })

  it('correctly resolves a deleted DID', async () => {
    mockedApi.query.did.did.mockReturnValueOnce(didNotFound)
    mockedApi.query.did.didBlacklist.mockReturnValueOnce(didIsBlacklisted)

    const { document, metadata } = (await resolve(
      deletedDid
    )) as DidResolutionResult

    expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
      deactivated: true,
    })
    expect(document).toBeUndefined()
  })

  it('correctly resolves DID document given a fragment', async () => {
    const fullDidWithAuthenticationKey = didWithAuthenticationKey
    const keyIdUri: DidUri = `${fullDidWithAuthenticationKey}#auth`
    const { document, metadata } = (await resolve(
      keyIdUri
    )) as DidResolutionResult

    expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
      deactivated: false,
    })
    expect(document?.uri).toStrictEqual<DidUri>(fullDidWithAuthenticationKey)
  })
})

describe('When resolving a light DID', () => {
  const authKey = Crypto.makeKeypairFromSeed()
  const encryptionKey = Crypto.makeEncryptionKeypairFromSeed()

  beforeEach(() => {
    mockedApi.query.did.did.mockReturnValue(didNotFound)
  })

  it('correctly resolves the document with an authentication key', async () => {
    const lightDidWithAuthenticationKey = Did.createLightDidDocument({
      authentication: [{ publicKey: authKey.publicKey, type: 'sr25519' }],
    })
    const { document, metadata } = (await resolve(
      lightDidWithAuthenticationKey.uri
    )) as DidResolutionResult

    expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
      deactivated: false,
    })
    expect(document?.uri).toStrictEqual<DidUri>(
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

  it('correctly resolves the document with authentication key, encryption key, and two service endpoints', async () => {
    const lightDid = Did.createLightDidDocument({
      authentication: [{ publicKey: authKey.publicKey, type: 'sr25519' }],
      keyAgreement: [{ publicKey: encryptionKey.publicKey, type: 'x25519' }],
      service: [
        generateServiceEndpoint('#service-1'),
        generateServiceEndpoint('#service-2'),
      ],
    })
    const { document, metadata } = (await resolve(
      lightDid.uri
    )) as DidResolutionResult

    expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
      deactivated: false,
    })
    expect(document?.uri).toStrictEqual<DidUri>(lightDid.uri)
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
    mockedApi.query.did.did.mockReturnValueOnce(encodedDidWithAuthenticationKey)

    const migratedDid: DidUri = `did:kilt:light:00${addressWithAuthenticationKey}`
    const { document, metadata } = (await resolve(
      migratedDid
    )) as DidResolutionResult

    expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
      deactivated: false,
      canonicalId: didWithAuthenticationKey,
    })
    expect(document).toBe(undefined)
  })

  it('correctly resolves a migrated and deleted DID', async () => {
    mockedApi.query.did.didBlacklist.mockReturnValueOnce(didIsBlacklisted)

    const migratedDid: DidUri = `did:kilt:light:00${deletedAddress}`
    const { document, metadata } = (await resolve(
      migratedDid
    )) as DidResolutionResult

    expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
      deactivated: true,
    })
    expect(document).toBeUndefined()
  })

  it('correctly resolves DID document given a fragment', async () => {
    const lightDid = Did.createLightDidDocument({
      authentication: [{ publicKey: authKey.publicKey, type: 'sr25519' }],
    })
    const keyIdUri: DidUri = `${lightDid.uri}#auth`
    const { document, metadata } = (await resolve(
      keyIdUri
    )) as DidResolutionResult

    expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
      deactivated: false,
    })
    expect(document?.uri).toStrictEqual<DidUri>(lightDid.uri)
  })
})
