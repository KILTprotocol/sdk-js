/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { BN } from '@polkadot/util'
import { base58Encode } from '@polkadot/util-crypto'

import { ConfigService } from '@kiltprotocol/config'
import type {
  ConformingDidKey,
  ConformingDidServiceEndpoint,
  DidEncryptionKey,
  DidKey,
  DidResolutionDocumentMetadata,
  DidResolutionMetadata,
  DidResolutionResult,
  DidResourceUri,
  DidServiceEndpoint,
  DidUri,
  DidVerificationKey,
  KiltAddress,
  ResolvedDidKey,
  ResolvedDidServiceEndpoint,
  UriFragment,
} from '@kiltprotocol/types'
import { Crypto } from '@kiltprotocol/utils'

import { ApiMocks, makeSigningKeyTool } from '../../../../tests/testUtils'
import { linkedInfoFromChain } from '../Did.rpc.js'
import { getFullDidUriFromKey } from '../Did.utils'

import * as Did from '../index.js'
import {
  resolve,
  resolveCompliant,
  resolveKey,
  resolveService,
} from './index.js'

const addressWithAuthenticationKey =
  '4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs'
const didWithAuthenticationKey: DidUri = `did:kilt:${addressWithAuthenticationKey}`
const addressWithAllKeys = `4sDxAgw86PFvC6TQbvZzo19WoYF6T4HcLd2i9wzvojkLXLvp`
const didWithAllKeys: DidUri = `did:kilt:${addressWithAllKeys}`
const addressWithServiceEndpoints = `4q4DHavMdesaSMH3g32xH3fhxYPt5pmoP9oSwgTr73dQLrkN`
const didWithServiceEndpoints: DidUri = `did:kilt:${addressWithServiceEndpoints}`
const deletedAddress = '4rrVTLAXgeoE8jo8si571HnqHtd5WmvLuzfH6e1xBsVXsRo7'
const deletedDid: DidUri = `did:kilt:${deletedAddress}`

const didIsBlacklisted = ApiMocks.mockChainQueryReturn(
  'did',
  'didBlacklist',
  'true'
)

const augmentedApi = ApiMocks.createAugmentedApi()

let mockedApi: any
beforeAll(() => {
  mockedApi = ApiMocks.getMockedApi()
  ConfigService.set({ api: mockedApi })

  // Mock `api.call.did.query(didUri)`
  // By default it returns a simple LinkedDidInfo with no web3name and no accounts linked.
  jest
    .spyOn(mockedApi.call.did, 'query')
    .mockImplementation(async (identifier) => {
      return augmentedApi.createType('Option<RawDidLinkedInfo>', {
        identifier,
        accounts: [],
        w3n: null,
        serviceEndpoints: [
          {
            id: 'foo',
            serviceTypes: ['type-service-1'],
            urls: ['x:url-service-1'],
          },
        ],
        details: {
          authenticationKey: '01234567890123456789012345678901',
          keyAgreementKeys: [],
          delegationKey: null,
          attestationKey: null,
          publicKeys: [],
          lastTxCounter: 123,
          deposit: {
            owner: addressWithAuthenticationKey,
            amount: 0,
          },
        },
      })
    })
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

jest.mock('../Did.rpc.js')
// By default its mock returns a DIDDocument with the test authentication key, test service, and the URI derived from the identifier provided in the resolution.
jest.mocked(linkedInfoFromChain).mockImplementation((linkedInfo) => {
  const { identifier } = linkedInfo.unwrap()

  return {
    accounts: [],
    document: {
      uri: `did:kilt:${identifier as unknown as KiltAddress}`,
      authentication: [generateAuthenticationKey()],
      service: [generateServiceEndpoint('#service-1')],
    },
  }
})

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
    // Mock transform function changed to not return any services (twice).
    jest.mocked(linkedInfoFromChain).mockImplementationOnce((linkedInfo) => {
      const { identifier } = linkedInfo.unwrap()

      return {
        accounts: [],
        document: {
          uri: `did:kilt:${identifier as unknown as KiltAddress}`,
          authentication: [generateAuthenticationKey()],
        },
      }
    })
    jest.mocked(linkedInfoFromChain).mockImplementationOnce((linkedInfo) => {
      const { identifier } = linkedInfo.unwrap()

      return {
        accounts: [],
        document: {
          uri: `did:kilt:${identifier as unknown as KiltAddress}`,
          authentication: [generateAuthenticationKey()],
        },
      }
    })

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
    const { document, metadata, web3Name } = (await resolve(
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
    expect(web3Name).toBeUndefined()
  })

  it('correctly resolves the document with all keys', async () => {
    // Mock transform function changed to return all keys for the DIDDocument.
    jest.mocked(linkedInfoFromChain).mockImplementationOnce((linkedInfo) => {
      const { identifier } = linkedInfo.unwrap()

      return {
        accounts: [],
        document: {
          authentication: [generateAuthenticationKey()],
          keyAgreement: [generateEncryptionKey()],
          assertionMethod: [generateAttestationKey()],
          capabilityDelegation: [generateDelegationKey()],
          uri: `did:kilt:${identifier as unknown as KiltAddress}`,
        },
      }
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
    // Mock transform function changed to return two service endpoints.
    jest.mocked(linkedInfoFromChain).mockImplementationOnce((linkedInfo) => {
      const { identifier } = linkedInfo.unwrap()

      return {
        accounts: [],
        document: {
          authentication: [generateAuthenticationKey()],
          service: [
            generateServiceEndpoint('#id-1'),
            generateServiceEndpoint('#id-2'),
          ],
          uri: `did:kilt:${identifier as unknown as KiltAddress}`,
        },
      }
    })
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

  it('correctly resolves the document with web3Name', async () => {
    // Mock transform function changed to return two service endpoints.
    jest.mocked(linkedInfoFromChain).mockImplementationOnce((linkedInfo) => {
      const { identifier } = linkedInfo.unwrap()

      return {
        accounts: [],
        document: {
          authentication: [generateAuthenticationKey()],
          service: [],
          uri: `did:kilt:${identifier as unknown as KiltAddress}`,
        },
        web3Name: 'w3nick',
      }
    })
    const { document, metadata, web3Name } = (await resolve(
      didWithAuthenticationKey
    )) as DidResolutionResult
    if (document === undefined) throw new Error('Document unresolved')

    expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
      deactivated: false,
    })
    expect(document.uri).toStrictEqual<DidUri>(didWithAuthenticationKey)
    expect(web3Name).toStrictEqual('w3nick')
  })

  it('correctly resolves a non-existing DID', async () => {
    // RPC call changed to not return anything.
    jest
      .spyOn(mockedApi.call.did, 'query')
      .mockResolvedValueOnce(
        augmentedApi.createType('Option<RawDidLinkedInfo>', null)
      )
    const randomDid = getFullDidUriFromKey(
      makeSigningKeyTool().authentication[0]
    )
    expect(await resolve(randomDid)).toBeNull()
  })

  it('correctly resolves a deleted DID', async () => {
    // RPC call changed to not return anything.
    jest
      .spyOn(mockedApi.call.did, 'query')
      .mockResolvedValueOnce(
        augmentedApi.createType('Option<RawDidLinkedInfo>', null)
      )
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
    // RPC call changed to not return anything by default.
    jest
      .spyOn(mockedApi.call.did, 'query')
      .mockResolvedValue(
        augmentedApi.createType('Option<RawDidLinkedInfo>', null)
      )
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
    // RPC call changed to return something.
    jest.spyOn(mockedApi.call.did, 'query').mockResolvedValueOnce(
      augmentedApi.createType('Option<RawDidLinkedInfo>', {
        addressWithAuthenticationKey,
        accounts: [],
        w3n: null,
        details: {
          authenticationKey: '01234567890123456789012345678901',
          keyAgreementKeys: [],
          delegationKey: null,
          attestationKey: null,
          publicKeys: [],
          lastTxCounter: 123,
          deposit: {
            owner: addressWithAuthenticationKey,
            amount: 0,
          },
        },
      })
    )
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
    // Mock the resolved DID as deleted.
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

describe('When resolving with the spec compliant resolver', () => {
  beforeAll(() => {
    jest
      .spyOn(mockedApi.call.did, 'query')
      .mockImplementation(async (identifier) => {
        return augmentedApi.createType('Option<RawDidLinkedInfo>', {
          identifier,
        })
      })
    // Mock transform function changed to return two service endpoints.
    jest.mocked(linkedInfoFromChain).mockImplementationOnce((linkedInfo) => {
      const { identifier } = linkedInfo.unwrap()

      return {
        accounts: [],
        document: {
          authentication: [generateAuthenticationKey()],
          service: [
            generateServiceEndpoint('#id-1'),
            generateServiceEndpoint('#id-2'),
          ],
          uri: `did:kilt:${identifier as unknown as KiltAddress}`,
        },
        web3Name: 'w3nick',
      }
    })
  })

  it('returns a spec-compliant DID document', async () => {
    const { didDocument, didDocumentMetadata, didResolutionMetadata } =
      await resolveCompliant(didWithAuthenticationKey)
    if (didDocument === undefined) throw new Error('Document unresolved')

    expect(didDocumentMetadata).toStrictEqual<DidResolutionDocumentMetadata>({
      deactivated: false,
    })

    expect(didResolutionMetadata).toStrictEqual({})

    expect(didDocument.id).toStrictEqual<DidUri>(didWithAuthenticationKey)
    expect(didDocument.authentication).toStrictEqual([`${didDocument.id}#auth`])
    expect(didDocument.verificationMethod).toContainEqual<ConformingDidKey>({
      id: `${didWithAuthenticationKey}${'#auth'}`,
      controller: didWithAuthenticationKey,
      type: 'Ed25519VerificationKey2018',
      publicKeyBase58: base58Encode(new Uint8Array(32).fill(0)),
    })
    expect(didDocument.service).toStrictEqual<ConformingDidServiceEndpoint[]>([
      {
        id: `${didWithAuthenticationKey}#id-1`,
        type: ['type-id-1'],
        serviceEndpoint: ['x:url-id-1'],
      },
      {
        id: `${didWithAuthenticationKey}#id-2`,
        type: ['type-id-2'],
        serviceEndpoint: ['x:url-id-2'],
      },
    ])
    expect(didDocument).toHaveProperty('alsoKnownAs', ['w3n:w3nick'])
  })

  it('correctly resolves a non-existing DID', async () => {
    // RPC call changed to not return anything.
    jest
      .spyOn(mockedApi.call.did, 'query')
      .mockResolvedValueOnce(
        augmentedApi.createType('Option<RawDidLinkedInfoV2>', null)
      )
    const randomDid = getFullDidUriFromKey(
      makeSigningKeyTool().authentication[0]
    )

    const { didDocument, didDocumentMetadata, didResolutionMetadata } =
      await resolveCompliant(randomDid)

    expect(didDocumentMetadata).toStrictEqual({})
    expect(didResolutionMetadata).toHaveProperty('error', 'notFound')
    expect(didDocument).toBeUndefined()
  })

  it('correctly resolves a deleted DID', async () => {
    // RPC call changed to not return anything.
    jest
      .spyOn(mockedApi.call.did, 'query')
      .mockResolvedValueOnce(
        augmentedApi.createType('Option<RawDidLinkedInfoV2>', null)
      )
    mockedApi.query.did.didBlacklist.mockReturnValueOnce(didIsBlacklisted)

    const { didDocument, didDocumentMetadata, didResolutionMetadata } =
      await resolveCompliant(deletedDid)

    expect(didDocumentMetadata).toStrictEqual<DidResolutionDocumentMetadata>({
      deactivated: true,
    })
    expect(didResolutionMetadata).toStrictEqual({})
    expect(didDocument).toStrictEqual({ id: deletedDid })
  })

  it('correctly resolves an upgraded light DID', async () => {
    const key = makeSigningKeyTool().authentication[0]
    const lightDid = Did.createLightDidDocument({ authentication: [key] }).uri
    const fullDid = getFullDidUriFromKey(key)

    const { didDocument, didDocumentMetadata, didResolutionMetadata } =
      await resolveCompliant(lightDid)

    expect(didDocumentMetadata).toStrictEqual<DidResolutionDocumentMetadata>({
      deactivated: false,
      canonicalId: fullDid,
    })
    expect(didResolutionMetadata).toStrictEqual({})
    expect(didDocument).toStrictEqual({ id: lightDid })
  })

  it('does not dereference a DID URL (with fragment)', async () => {
    const fullDidWithAuthenticationKey = didWithAuthenticationKey
    const keyIdUri: DidUri = `${fullDidWithAuthenticationKey}#auth`
    const { didDocument, didDocumentMetadata, didResolutionMetadata } =
      await resolveCompliant(keyIdUri)

    expect(didDocumentMetadata).toStrictEqual({})
    expect(didResolutionMetadata).toHaveProperty<
      DidResolutionMetadata['error']
    >('error', 'invalidDid')
    expect(didDocument).toBeUndefined()
  })
})
