/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import {
  DereferenceResult,
  Did,
  DidUrl,
  KiltAddress,
  RepresentationResolutionResult,
  ResolutionResult,
  Service,
  UriFragment,
  VerificationMethod,
} from '@kiltprotocol/types'
import { Crypto, cbor } from '@kiltprotocol/utils'
import { stringToU8a } from '@polkadot/util'

import { ApiMocks, makeSigningKeyTool } from '../../../../tests/testUtils'
import { linkedInfoFromChain } from '../Did.rpc.js'

import {
  getFullDidFromVerificationMethod,
  keypairToMultibaseKey,
} from '../Did.utils'
import { createLightDidDocument } from '../DidDetails'
import { KILT_DID_CONTEXT_URL, W3C_DID_CONTEXT_URL } from './DidContexts'
import {
  DID_CBOR_CONTENT_TYPE,
  DID_JSON_CONTENT_TYPE,
  DID_JSON_LD_CONTENT_TYPE,
  DidResolver,
  SupportedContentType,
} from './DidResolver.js'

const addressWithAuthenticationKey =
  '4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs'
const didWithAuthenticationKey: Did = `did:kilt:${addressWithAuthenticationKey}`
const addressWithAllKeys = `4sDxAgw86PFvC6TQbvZzo19WoYF6T4HcLd2i9wzvojkLXLvp`
const didWithAllKeys: Did = `did:kilt:${addressWithAllKeys}`
const addressWithServiceEndpoints = `4q4DHavMdesaSMH3g32xH3fhxYPt5pmoP9oSwgTr73dQLrkN`
const didWithServiceEndpoints: Did = `did:kilt:${addressWithServiceEndpoints}`
const deletedAddress = '4rrVTLAXgeoE8jo8si571HnqHtd5WmvLuzfH6e1xBsVXsRo7'
const deletedDid: Did = `did:kilt:${deletedAddress}`

const didIsBlacklisted = ApiMocks.mockChainQueryReturn(
  'did',
  'didBlacklist',
  'true'
)

const augmentedApi = ApiMocks.createAugmentedApi()

let mockedApi: any
let resolver: ReturnType<typeof DidResolver>
beforeAll(() => {
  mockedApi = ApiMocks.getMockedApi()
  resolver = DidResolver({ api: mockedApi })

  // Mock `api.call.did.query(did)`
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

function generateAuthenticationVerificationMethod(
  controller: Did
): VerificationMethod {
  return {
    id: `${controller}#auth`,
    controller,
    type: 'Multikey',
    publicKeyMultibase: keypairToMultibaseKey({
      publicKey: new Uint8Array(32).fill(0),
      type: 'ed25519',
    }),
  }
}

function generateEncryptionVerificationMethod(
  controller: Did
): VerificationMethod {
  return {
    id: `${controller}#enc`,
    controller,
    type: 'Multikey',
    publicKeyMultibase: keypairToMultibaseKey({
      publicKey: new Uint8Array(32).fill(1),
      type: 'x25519',
    }),
  }
}

function generateAssertionVerificationMethod(
  controller: Did
): VerificationMethod {
  return {
    id: `${controller}#att`,
    controller,
    type: 'Multikey',
    publicKeyMultibase: keypairToMultibaseKey({
      publicKey: new Uint8Array(32).fill(2),
      type: 'sr25519',
    }),
  }
}

function generateCapabilityDelegationVerificationMethod(
  controller: Did
): VerificationMethod {
  return {
    id: `${controller}#del`,
    controller,
    type: 'Multikey',
    publicKeyMultibase: keypairToMultibaseKey({
      publicKey: new Uint8Array(33).fill(3),
      type: 'ecdsa',
    }),
  }
}

function generateServiceEndpoint<T extends DidUrl | UriFragment>(
  serviceId: T
): Service<T> {
  const [fragment] = serviceId.split('#').reverse()
  return {
    id: serviceId,
    type: [`type-${fragment}`],
    serviceEndpoint: [`x:url-${fragment}`],
  }
}

jest.mock('../Did.rpc.js')
// By default its mock returns a DIDDocument with the test authentication key, test service, and the DID derived from the identifier provided in the resolution.
jest.mocked(linkedInfoFromChain).mockImplementation((linkedInfo) => {
  const { identifier } =
    'unwrap' in linkedInfo ? linkedInfo.unwrap() : linkedInfo
  const did: Did = `did:kilt:${identifier as unknown as KiltAddress}`
  const authMethod = generateAuthenticationVerificationMethod(did)

  return {
    accounts: [],
    document: {
      id: did,
      authentication: [authMethod.id],
      verificationMethod: [authMethod],
      service: [generateServiceEndpoint(`${did}#service-1`)],
    },
  }
})

describe('When dereferencing a verification method', () => {
  it('correctly dereference it for a full DID if both the DID and the verification method exist', async () => {
    const fullDid = didWithAuthenticationKey
    const verificationMethodUrl: DidUrl = `${fullDid}#auth`

    expect(
      await resolver.dereference(verificationMethodUrl, {
        accept: 'application/did+json',
      })
    ).toStrictEqual<DereferenceResult>({
      contentMetadata: {},
      dereferencingMetadata: { contentType: 'application/did+json' },
      contentStream: generateAuthenticationVerificationMethod(fullDid),
    })
  })

  it('returns error if either the DID or the verification method do not exist', async () => {
    let verificationMethodUrl: DidUrl = `${deletedDid}#enc`

    expect(
      await resolver.dereference(verificationMethodUrl)
    ).toStrictEqual<DereferenceResult>({
      contentMetadata: {},
      dereferencingMetadata: { error: 'notFound' },
    })

    const didWithNoEncryptionKey = didWithAuthenticationKey
    verificationMethodUrl = `${didWithNoEncryptionKey}#enc`

    expect(
      await resolver.dereference(verificationMethodUrl)
    ).toStrictEqual<DereferenceResult>({
      contentMetadata: {},
      dereferencingMetadata: { error: 'notFound' },
    })
  })

  it('throws for invalid URLs', async () => {
    const invalidUrl = 'invalid-url' as DidUrl
    expect(
      await resolver.dereference(invalidUrl)
    ).toStrictEqual<DereferenceResult>({
      contentMetadata: {},
      dereferencingMetadata: { error: 'invalidDidUrl' },
    })
  })

  it('throws for valid light URLs but with details that cannot be decoded', async () => {
    const invalidLightDidUrl =
      `did:kilt:light:00${addressWithAuthenticationKey}:z22222#auth` as DidUrl
    expect(
      await resolver.dereference(invalidLightDidUrl)
    ).toStrictEqual<DereferenceResult>({
      contentMetadata: {},
      dereferencingMetadata: { error: 'invalidDidUrl' },
    })
  })
})

describe('When resolving a service', () => {
  it('correctly resolves it for a full DID if both the DID and the endpoint exist', async () => {
    const fullDid = didWithServiceEndpoints
    const serviceIdUrl: DidUrl = `${fullDid}#service-1`

    expect(
      await resolver.dereference(serviceIdUrl, {
        accept: 'application/did+json',
      })
    ).toStrictEqual<DereferenceResult>({
      contentMetadata: {},
      dereferencingMetadata: { contentType: 'application/did+json' },
      contentStream: {
        id: `${fullDid}#service-1`,
        type: [`type-service-1`],
        serviceEndpoint: [`x:url-service-1`],
      },
    })
  })

  it('returns error if either the DID or the service do not exist', async () => {
    // Mock transform function changed to not return any services (twice).
    jest.mocked(linkedInfoFromChain).mockImplementationOnce((linkedInfo) => {
      const { identifier } =
        'unwrap' in linkedInfo ? linkedInfo.unwrap() : linkedInfo
      const did: Did = `did:kilt:${identifier as unknown as KiltAddress}`
      const authMethod = generateAuthenticationVerificationMethod(did)

      return {
        accounts: [],
        document: {
          id: did,
          authentication: [authMethod.id],
          verificationMethod: [authMethod],
        },
      }
    })
    jest.mocked(linkedInfoFromChain).mockImplementationOnce((linkedInfo) => {
      const { identifier } =
        'unwrap' in linkedInfo ? linkedInfo.unwrap() : linkedInfo
      const did: Did = `did:kilt:${identifier as unknown as KiltAddress}`
      const authMethod = generateAuthenticationVerificationMethod(did)

      return {
        accounts: [],
        document: {
          id: did,
          authentication: [authMethod.id],
          verificationMethod: [authMethod],
        },
      }
    })

    let serviceIdUrl: DidUrl = `${deletedDid}#service-1`

    expect(
      await resolver.dereference(serviceIdUrl)
    ).toStrictEqual<DereferenceResult>({
      contentMetadata: {},
      dereferencingMetadata: { error: 'notFound' },
    })

    const didWithNoServiceEndpoints = didWithAuthenticationKey
    serviceIdUrl = `${didWithNoServiceEndpoints}#service-1`

    expect(
      await resolver.dereference(serviceIdUrl)
    ).toStrictEqual<DereferenceResult>({
      contentMetadata: {},
      dereferencingMetadata: { error: 'notFound' },
    })
  })
})

describe('When resolving a full DID', () => {
  it('correctly resolves the document with an authentication verification method', async () => {
    const fullDidWithAuthenticationKey = didWithAuthenticationKey
    expect(
      await resolver.resolve(fullDidWithAuthenticationKey)
    ).toMatchObject<ResolutionResult>({
      didDocumentMetadata: {},
      didResolutionMetadata: {},
      didDocument: {
        id: fullDidWithAuthenticationKey,
        authentication: [`${fullDidWithAuthenticationKey}#auth`],
        verificationMethod: [
          {
            controller: fullDidWithAuthenticationKey,
            id: `${fullDidWithAuthenticationKey}#auth`,
            type: 'Multikey',
            publicKeyMultibase: keypairToMultibaseKey({
              type: 'ed25519',
              publicKey: new Uint8Array(32).fill(0),
            }),
          },
        ],
      },
    })
  })

  it('correctly resolves the document with all keys', async () => {
    // Mock transform function changed to return all keys for the DIDDocument.
    jest.mocked(linkedInfoFromChain).mockImplementationOnce((linkedInfo) => {
      const { identifier } =
        'unwrap' in linkedInfo ? linkedInfo.unwrap() : linkedInfo
      const did: Did = `did:kilt:${identifier as unknown as KiltAddress}`
      const authMethod = generateAuthenticationVerificationMethod(did)
      const encMethod = generateEncryptionVerificationMethod(did)
      const attMethod = generateAssertionVerificationMethod(did)
      const delMethod = generateCapabilityDelegationVerificationMethod(did)

      return {
        accounts: [],
        document: {
          id: did,
          authentication: [authMethod.id],
          keyAgreement: [encMethod.id],
          assertionMethod: [attMethod.id],
          capabilityDelegation: [delMethod.id],
          verificationMethod: [authMethod, encMethod, attMethod, delMethod],
        },
      }
    })
    const fullDidWithAllKeys = didWithAllKeys
    expect(
      await resolver.resolve(fullDidWithAllKeys)
    ).toStrictEqual<ResolutionResult>({
      didDocumentMetadata: {},
      didResolutionMetadata: {},
      didDocument: {
        id: fullDidWithAllKeys,
        authentication: [`${fullDidWithAllKeys}#auth`],
        keyAgreement: [`${fullDidWithAllKeys}#enc`],
        assertionMethod: [`${fullDidWithAllKeys}#att`],
        capabilityDelegation: [`${fullDidWithAllKeys}#del`],
        verificationMethod: [
          {
            controller: fullDidWithAllKeys,
            id: `${fullDidWithAllKeys}#auth`,
            type: 'Multikey',
            publicKeyMultibase: keypairToMultibaseKey({
              type: 'ed25519',
              publicKey: new Uint8Array(32).fill(0),
            }),
          },
          {
            controller: fullDidWithAllKeys,
            id: `${fullDidWithAllKeys}#enc`,
            type: 'Multikey',
            publicKeyMultibase: keypairToMultibaseKey({
              type: 'x25519',
              publicKey: new Uint8Array(32).fill(1),
            }),
          },
          {
            controller: fullDidWithAllKeys,
            id: `${fullDidWithAllKeys}#att`,
            type: 'Multikey',
            publicKeyMultibase: keypairToMultibaseKey({
              type: 'sr25519',
              publicKey: new Uint8Array(32).fill(2),
            }),
          },
          {
            controller: fullDidWithAllKeys,
            id: `${fullDidWithAllKeys}#del`,
            type: 'Multikey',
            publicKeyMultibase: keypairToMultibaseKey({
              type: 'ecdsa',
              publicKey: new Uint8Array(33).fill(3),
            }),
          },
        ],
      },
    })
  })

  it('correctly resolves the document with services', async () => {
    // Mock transform function changed to return two services.
    jest.mocked(linkedInfoFromChain).mockImplementationOnce((linkedInfo) => {
      const { identifier } =
        'unwrap' in linkedInfo ? linkedInfo.unwrap() : linkedInfo
      const did: Did = `did:kilt:${identifier as unknown as KiltAddress}`
      const authMethod = generateAuthenticationVerificationMethod(did)

      return {
        accounts: [],
        document: {
          id: did,
          authentication: [authMethod.id],
          verificationMethod: [authMethod],
          service: [
            generateServiceEndpoint(`${did}#id-1`),
            generateServiceEndpoint(`${did}#id-2`),
          ],
        },
      }
    })
    const fullDidWithServiceEndpoints = didWithServiceEndpoints
    expect(
      await resolver.resolve(fullDidWithServiceEndpoints)
    ).toStrictEqual<ResolutionResult>({
      didDocumentMetadata: {},
      didResolutionMetadata: {},
      didDocument: {
        id: fullDidWithServiceEndpoints,
        authentication: [`${fullDidWithServiceEndpoints}#auth`],
        verificationMethod: [
          {
            controller: fullDidWithServiceEndpoints,
            id: `${fullDidWithServiceEndpoints}#auth`,
            type: 'Multikey',
            publicKeyMultibase: keypairToMultibaseKey({
              type: 'ed25519',
              publicKey: new Uint8Array(32).fill(0),
            }),
          },
        ],
        service: [
          {
            id: `${fullDidWithServiceEndpoints}#id-1`,
            type: ['type-id-1'],
            serviceEndpoint: ['x:url-id-1'],
          },
          {
            id: `${fullDidWithServiceEndpoints}#id-2`,
            type: ['type-id-2'],
            serviceEndpoint: ['x:url-id-2'],
          },
        ],
      },
    })
  })

  it('correctly resolves the document with web3Name', async () => {
    // Mock transform function changed to return two services.
    jest.mocked(linkedInfoFromChain).mockImplementationOnce((linkedInfo) => {
      const { identifier } =
        'unwrap' in linkedInfo ? linkedInfo.unwrap() : linkedInfo
      const did: Did = `did:kilt:${identifier as unknown as KiltAddress}`
      const authMethod = generateAuthenticationVerificationMethod(did)

      return {
        accounts: [],
        document: {
          id: did,
          authentication: [authMethod.id],
          verificationMethod: [authMethod],
          alsoKnownAs: ['w3n:w3nick'],
        },
      }
    })
    expect(
      await resolver.resolve(didWithAuthenticationKey)
    ).toStrictEqual<ResolutionResult>({
      didDocumentMetadata: {},
      didResolutionMetadata: {},
      didDocument: {
        id: didWithAuthenticationKey,
        authentication: [`${didWithAuthenticationKey}#auth`],
        verificationMethod: [
          {
            controller: didWithAuthenticationKey,
            id: `${didWithAuthenticationKey}#auth`,
            type: 'Multikey',
            publicKeyMultibase: keypairToMultibaseKey({
              type: 'ed25519',
              publicKey: new Uint8Array(32).fill(0),
            }),
          },
        ],
        alsoKnownAs: ['w3n:w3nick'],
      },
    })
  })

  it('correctly resolves a non-existing DID', async () => {
    // RPC call changed to not return anything.
    jest
      .spyOn(mockedApi.call.did, 'query')
      .mockResolvedValueOnce(
        augmentedApi.createType('Option<RawDidLinkedInfo>', null)
      )
    const randomKeypair = (await makeSigningKeyTool()).authentication[0]
    const randomDid = getFullDidFromVerificationMethod({
      publicKeyMultibase: keypairToMultibaseKey(randomKeypair),
    })
    expect(await resolver.resolve(randomDid)).toStrictEqual<ResolutionResult>({
      didDocumentMetadata: {},
      didResolutionMetadata: { error: 'notFound' },
    })
  })

  it('correctly resolves a deleted DID', async () => {
    // RPC call changed to not return anything.
    jest
      .spyOn(mockedApi.call.did, 'query')
      .mockResolvedValueOnce(
        augmentedApi.createType('Option<RawDidLinkedInfo>', null)
      )
    mockedApi.query.did.didBlacklist.mockReturnValueOnce(didIsBlacklisted)

    expect(await resolver.resolve(deletedDid)).toStrictEqual<ResolutionResult>({
      didDocumentMetadata: { deactivated: true },
      didResolutionMetadata: {},
      didDocument: { id: deletedDid },
    })
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
    const lightDidWithAuthenticationKey = createLightDidDocument({
      authentication: [{ publicKey: authKey.publicKey, type: 'sr25519' }],
    })
    expect(
      await resolver.resolve(lightDidWithAuthenticationKey.id)
    ).toStrictEqual<ResolutionResult>({
      didDocumentMetadata: {},
      didResolutionMetadata: {},
      didDocument: {
        id: lightDidWithAuthenticationKey.id,
        authentication: [`${lightDidWithAuthenticationKey.id}#authentication`],
        verificationMethod: [
          {
            controller: lightDidWithAuthenticationKey.id,
            id: `${lightDidWithAuthenticationKey.id}#authentication`,
            type: 'Multikey',
            publicKeyMultibase: keypairToMultibaseKey({
              ...authKey,
              type: 'sr25519',
            }),
          },
        ],
      },
    })
  })

  it('correctly resolves the document with authentication key, encryption key, and two services', async () => {
    const lightDid = createLightDidDocument({
      authentication: [{ publicKey: authKey.publicKey, type: 'sr25519' }],
      keyAgreement: [{ publicKey: encryptionKey.publicKey, type: 'x25519' }],
      service: [
        generateServiceEndpoint('#service-1'),
        generateServiceEndpoint('#service-2'),
      ],
    })
    expect(await resolver.resolve(lightDid.id)).toStrictEqual<ResolutionResult>(
      {
        didDocumentMetadata: {},
        didResolutionMetadata: {},
        didDocument: {
          id: lightDid.id,
          authentication: [`${lightDid.id}#authentication`],
          keyAgreement: [`${lightDid.id}#encryption`],
          verificationMethod: [
            {
              controller: lightDid.id,
              id: `${lightDid.id}#authentication`,
              type: 'Multikey',
              publicKeyMultibase: keypairToMultibaseKey({
                ...authKey,
                type: 'sr25519',
              }),
            },
            {
              controller: lightDid.id,
              id: `${lightDid.id}#encryption`,
              type: 'Multikey',
              publicKeyMultibase: keypairToMultibaseKey(encryptionKey),
            },
          ],
          service: [
            {
              id: `${lightDid.id}#service-1`,
              type: ['type-service-1'],
              serviceEndpoint: ['x:url-service-1'],
            },
            {
              id: `${lightDid.id}#service-2`,
              type: ['type-service-2'],
              serviceEndpoint: ['x:url-service-2'],
            },
          ],
        },
      }
    )
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
    const migratedDid: Did = `did:kilt:light:00${addressWithAuthenticationKey}`
    expect(await resolver.resolve(migratedDid)).toStrictEqual<ResolutionResult>(
      {
        didDocumentMetadata: { canonicalId: didWithAuthenticationKey },
        didResolutionMetadata: {},
        didDocument: {
          id: migratedDid,
        },
      }
    )
  })

  it('correctly resolves a migrated and deleted DID', async () => {
    // Mock the resolved DID as deleted.
    mockedApi.query.did.didBlacklist.mockReturnValueOnce(didIsBlacklisted)

    const migratedDid: Did = `did:kilt:light:00${deletedAddress}`
    expect(await resolver.resolve(migratedDid)).toStrictEqual<ResolutionResult>(
      {
        didDocumentMetadata: { deactivated: true },
        didResolutionMetadata: {},
        didDocument: {
          id: migratedDid,
        },
      }
    )
  })

  it('throws for valid a light DID but with details that cannot be decoded', async () => {
    const invalidLightDid: Did = `did:kilt:light:00${addressWithAuthenticationKey}:z22222`
    expect(
      await resolver.resolve(invalidLightDid)
    ).toStrictEqual<ResolutionResult>({
      didDocumentMetadata: {},
      didResolutionMetadata: { error: 'invalidDid' },
    })
  })
})

describe('DID Resolution compliance', () => {
  beforeAll(() => {
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
    jest.mocked(linkedInfoFromChain).mockImplementation((linkedInfo) => {
      const { identifier } =
        'unwrap' in linkedInfo ? linkedInfo.unwrap() : linkedInfo
      const did: Did = `did:kilt:${identifier as unknown as KiltAddress}`
      const authMethod = generateAuthenticationVerificationMethod(did)

      return {
        accounts: [],
        document: {
          id: did,
          authentication: [authMethod.id],
          verificationMethod: [authMethod],
        },
      }
    })
  })
  describe('resolve(did, resolutionOptions) → « didResolutionMetadata, didDocument, didDocumentMetadata »', () => {
    it('returns empty `didDocumentMetadata` and `didResolutionMetadata` when successfully returning a DID Document that has not been deleted nor migrated', async () => {
      const did: Did =
        'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs'
      expect(await resolver.resolve(did)).toStrictEqual<ResolutionResult>({
        didDocumentMetadata: {},
        didResolutionMetadata: {},
        didDocument: {
          id: did,
          authentication: [`${did}#auth`],
          verificationMethod: [
            {
              id: `${did}#auth`,
              controller: did,
              type: 'Multikey',
              publicKeyMultibase: keypairToMultibaseKey({
                publicKey: new Uint8Array(32).fill(0),
                type: 'ed25519',
              }),
            },
          ],
        },
      })
    })
    it('returns the right `didResolutionMetadata.error` when the DID does not exist', async () => {
      jest
        .spyOn(mockedApi.call.did, 'query')
        .mockResolvedValueOnce(
          augmentedApi.createType('Option<RawDidLinkedInfo>', null)
        )
      const did: Did =
        'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs'
      expect(await resolver.resolve(did)).toStrictEqual<ResolutionResult>({
        didDocumentMetadata: {},
        didResolutionMetadata: { error: 'notFound' },
      })
    })
    it('returns the right `didResolutionMetadata.error` when the input DID is invalid', async () => {
      const did = 'did:kilt:test-did' as unknown as Did
      expect(await resolver.resolve(did)).toStrictEqual<ResolutionResult>({
        didDocumentMetadata: {},
        didResolutionMetadata: { error: 'invalidDid' },
      })
    })
  })

  describe('resolveRepresentation(did, resolutionOptions) → « didResolutionMetadata, didDocumentStream, didDocumentMetadata »', () => {
    it('returns empty `didDocumentMetadata` and `didResolutionMetadata.contentType: application/did+json` representation when successfully returning a DID Document that has not been deleted nor migrated', async () => {
      const did: Did =
        'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs'
      expect(
        await resolver.resolveRepresentation(did)
      ).toStrictEqual<RepresentationResolutionResult>({
        didDocumentMetadata: {},
        didResolutionMetadata: { contentType: DID_JSON_CONTENT_TYPE },
        didDocumentStream: stringToU8a(
          JSON.stringify({
            id: did,
            authentication: [`${did}#auth`],
            verificationMethod: [
              {
                id: `${did}#auth`,
                controller: did,
                type: 'Multikey',
                publicKeyMultibase: keypairToMultibaseKey({
                  publicKey: new Uint8Array(32).fill(0),
                  type: 'ed25519',
                }),
              },
            ],
          })
        ),
      })
    })
    it('returns empty `didDocumentMetadata` and `didResolutionMetadata.contentType: application/did+ld+json` representation when successfully returning a DID Document that has not been deleted nor migrated', async () => {
      const did: Did =
        'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs'
      expect(
        await resolver.resolveRepresentation(did, {
          accept: 'application/did+ld+json',
        })
      ).toStrictEqual<RepresentationResolutionResult>({
        didDocumentMetadata: {},
        didResolutionMetadata: {
          contentType: DID_JSON_LD_CONTENT_TYPE,
        },
        didDocumentStream: stringToU8a(
          JSON.stringify({
            id: did,
            authentication: [`${did}#auth`],
            verificationMethod: [
              {
                id: `${did}#auth`,
                controller: did,
                type: 'Multikey',
                publicKeyMultibase: keypairToMultibaseKey({
                  publicKey: new Uint8Array(32).fill(0),
                  type: 'ed25519',
                }),
              },
            ],
            '@context': [W3C_DID_CONTEXT_URL, KILT_DID_CONTEXT_URL],
          })
        ),
      })
    })
    it('returns empty `didDocumentMetadata` and `didResolutionMetadata.contentType: application/did+cbor` representation when successfully returning a DID Document that has not been deleted nor migrated', async () => {
      const did: Did =
        'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs'
      expect(
        await resolver.resolveRepresentation(did, {
          accept: 'application/did+cbor',
        })
      ).toMatchObject<RepresentationResolutionResult>({
        didDocumentMetadata: {},
        didResolutionMetadata: { contentType: DID_CBOR_CONTENT_TYPE },
        didDocumentStream: Uint8Array.from(
          cbor.encode({
            id: did,
            authentication: [`${did}#auth`],
            verificationMethod: [
              {
                id: `${did}#auth`,
                controller: did,
                type: 'Multikey',
                publicKeyMultibase: keypairToMultibaseKey({
                  publicKey: new Uint8Array(32).fill(0),
                  type: 'ed25519',
                }),
              },
            ],
          })
        ),
      })
    })
    it('returns the right `didResolutionMetadata.error` when the DID does not exist', async () => {
      jest
        .spyOn(mockedApi.call.did, 'query')
        .mockResolvedValueOnce(
          augmentedApi.createType('Option<RawDidLinkedInfo>', null)
        )

      const did: Did =
        'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs'
      expect(
        await resolver.resolveRepresentation(did)
      ).toStrictEqual<RepresentationResolutionResult>({
        didDocumentMetadata: {},
        didResolutionMetadata: { error: 'notFound' },
      })
    })
    it('returns the right `didResolutionMetadata.error` when the input DID is invalid', async () => {
      const did = 'did:kilt:test-did' as unknown as Did
      expect(
        await resolver.resolveRepresentation(did)
      ).toStrictEqual<RepresentationResolutionResult>({
        didDocumentMetadata: {},
        didResolutionMetadata: { error: 'invalidDid' },
      })
    })
    it('returns the right `didResolutionMetadata.error` when the requested content type is not supported', async () => {
      const did: Did =
        'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs'
      expect(
        await resolver.resolveRepresentation(did, {
          accept: 'application/json' as SupportedContentType,
        })
      ).toStrictEqual<RepresentationResolutionResult>({
        didDocumentMetadata: {},
        didResolutionMetadata: { error: 'representationNotSupported' },
      })
    })
  })

  describe('dereference(didUrl, dereferenceOptions) → « dereferencingMetadata, contentStream, contentMetadata »', () => {
    it('returns empty `contentMetadata` and `dereferencingMetadata.contentType: application/did+json` representation when successfully returning a DID Document that has not been deleted nor migrated', async () => {
      const did: Did =
        'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs'
      expect(await resolver.dereference(did)).toStrictEqual<DereferenceResult>({
        contentMetadata: {},
        dereferencingMetadata: { contentType: DID_JSON_CONTENT_TYPE },
        contentStream: {
          id: did,
          authentication: [`${did}#auth`],
          verificationMethod: [
            {
              id: `${did}#auth`,
              controller: did,
              type: 'Multikey',
              publicKeyMultibase: keypairToMultibaseKey({
                publicKey: new Uint8Array(32).fill(0),
                type: 'ed25519',
              }),
            },
          ],
        },
      })
    })
    it('returns empty `contentMetadata` and `dereferencingMetadata.contentType: application/did+ld+json` representation when successfully returning a DID Document that has not been deleted nor migrated', async () => {
      const did: Did =
        'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs'
      expect(
        await resolver.dereference(did, { accept: 'application/did+ld+json' })
      ).toStrictEqual<DereferenceResult>({
        contentMetadata: {},
        dereferencingMetadata: {
          contentType: DID_JSON_LD_CONTENT_TYPE,
        },
        contentStream: {
          id: did,
          authentication: [`${did}#auth`],
          verificationMethod: [
            {
              id: `${did}#auth`,
              controller: did,
              type: 'Multikey',
              publicKeyMultibase: keypairToMultibaseKey({
                publicKey: new Uint8Array(32).fill(0),
                type: 'ed25519',
              }),
            },
          ],
          '@context': [W3C_DID_CONTEXT_URL, KILT_DID_CONTEXT_URL],
        },
      })
    })
    it('returns empty `contentMetadata` and `dereferencingMetadata.contentType: application/did+cbor` representation when successfully returning a DID Document that has not been deleted nor migrated', async () => {
      const did: Did =
        'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs'
      expect(
        await resolver.dereference(did, { accept: 'application/did+cbor' })
      ).toStrictEqual<DereferenceResult>({
        contentMetadata: {},
        dereferencingMetadata: { contentType: DID_CBOR_CONTENT_TYPE },
        contentStream: Uint8Array.from(
          cbor.encode({
            id: did,
            authentication: [`${did}#auth`],
            verificationMethod: [
              {
                id: `${did}#auth`,
                controller: did,
                type: 'Multikey',
                publicKeyMultibase: keypairToMultibaseKey({
                  publicKey: new Uint8Array(32).fill(0),
                  type: 'ed25519',
                }),
              },
            ],
          })
        ),
      })
    })
    it('returns empty `didDocumentMetadata` and `didResolutionMetadata.contentType: application/did+json` (ignoring the provided `accept` option) representation when successfully returning a verification method for a DID that has not been deleted nor migrated', async () => {
      const didUrl: DidUrl =
        'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#auth'
      expect(
        await resolver.dereference(didUrl, { accept: 'application/did+cbor' })
      ).toStrictEqual<DereferenceResult>({
        contentMetadata: {},
        dereferencingMetadata: { contentType: DID_JSON_CONTENT_TYPE },
        contentStream: {
          id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#auth',
          controller:
            'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
          type: 'Multikey',
          publicKeyMultibase: keypairToMultibaseKey({
            publicKey: new Uint8Array(32).fill(0),
            type: 'ed25519',
          }),
        },
      })
    })
    it('returns empty `didDocumentMetadata` and `didResolutionMetadata.contentType: application/did+json` (ignoring the provided `accept` option) representation when successfully returning a service for a DID that has not been deleted nor migrated', async () => {
      jest.mocked(linkedInfoFromChain).mockImplementationOnce((linkedInfo) => {
        const { identifier } =
          'unwrap' in linkedInfo ? linkedInfo.unwrap() : linkedInfo
        const did: Did = `did:kilt:${identifier as unknown as KiltAddress}`
        const authMethod = generateAuthenticationVerificationMethod(did)

        return {
          accounts: [],
          document: {
            id: did,
            authentication: [authMethod.id],
            verificationMethod: [authMethod],
            service: [
              {
                id: `${did}#id-1`,
                type: ['type'],
                serviceEndpoint: ['x:url'],
              },
            ],
          },
        }
      })
      const didUrl: DidUrl =
        'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#id-1'
      expect(
        await resolver.dereference(didUrl, { accept: 'application/did+cbor' })
      ).toStrictEqual<DereferenceResult>({
        contentMetadata: {},
        dereferencingMetadata: { contentType: DID_JSON_CONTENT_TYPE },
        contentStream: {
          id: didUrl,
          type: ['type'],
          serviceEndpoint: ['x:url'],
        },
      })
    })
  })
  it('returns the right `dereferencingMetadata.error` when the DID does not exist', async () => {
    jest
      .spyOn(mockedApi.call.did, 'query')
      .mockResolvedValueOnce(
        augmentedApi.createType('Option<RawDidLinkedInfo>', null)
      )

    const did: Did =
      'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs'
    expect(await resolver.dereference(did)).toStrictEqual<DereferenceResult>({
      contentMetadata: {},
      dereferencingMetadata: { error: 'notFound' },
    })
  })
  it('returns the right `didResolutionMetadata.error` when the input DID is invalid', async () => {
    const did = 'did:kilt:test-did' as unknown as Did
    expect(await resolver.dereference(did)).toStrictEqual<DereferenceResult>({
      contentMetadata: {},
      dereferencingMetadata: { error: 'invalidDidUrl' },
    })
  })
  it('returns empty `contentMetadata` and `dereferencingMetadata.contentType: application/did+json` (the default value) when the `options.accept` value is invalid', async () => {
    const did: Did =
      'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs'
    expect(
      await resolver.dereference(did, {
        accept: 'application/json' as unknown as SupportedContentType,
      })
    ).toStrictEqual<DereferenceResult>({
      contentMetadata: {},
      dereferencingMetadata: { contentType: DID_JSON_CONTENT_TYPE },
      contentStream: {
        id: did,
        authentication: [`${did}#auth`],
        verificationMethod: [
          {
            id: `${did}#auth`,
            controller: did,
            type: 'Multikey',
            publicKeyMultibase: keypairToMultibaseKey({
              publicKey: new Uint8Array(32).fill(0),
              type: 'ed25519',
            }),
          },
        ],
      },
    })
  })
})
