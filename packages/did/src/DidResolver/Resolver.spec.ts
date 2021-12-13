/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { BN } from '@polkadot/util'

import type {
  DidKey,
  DidServiceEndpoint,
  IDidIdentifier,
  ResolvedDidKey,
  ResolvedDidServiceEndpoint,
} from '@kiltprotocol/types'

import type { IDidChainRecordJSON } from '../Did.chain'
import { getKiltDidFromIdentifier } from '../Did.utils'

import { DefaultResolver } from '.'

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
    type: 'ed25519',
    publicKey: new Uint8Array(32).fill(0),
  }
}

function generateEncryptionKeyDetails(): DidKey {
  return {
    id: 'enc',
    type: 'x25519',
    publicKey: new Uint8Array(32).fill(1),
    includedAt: new BN(15),
  }
}

function generateAttestationKeyDetails(): DidKey {
  return {
    id: 'att',
    type: 'sr25519',
    publicKey: new Uint8Array(32).fill(2),
    includedAt: new BN(20),
  }
}

function generateDelegationKeyDetails(): DidKey {
  return {
    id: 'del',
    type: 'ed25519',
    publicKey: new Uint8Array(32).fill(3),
    includedAt: new BN(25),
  }
}

function generateServiceEndpointDetails(serviceId: string): DidServiceEndpoint {
  return {
    id: serviceId,
    types: [`type-${serviceId}`],
    urls: [`urls-${serviceId}`],
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
          }
        case identifierWithAllKeys:
          return {
            authenticationKey: authKey.id,
            keyAgreementKeys: [encKey.id],
            assertionMethodKey: attKey.id,
            capabilityDelegationKey: delKey.id,
            publicKeys: [authKey, encKey, attKey, delKey],
            lastTxCounter: new BN(0),
          }
        case identifierWithServiceEndpoints:
          return {
            authenticationKey: authKey.id,
            keyAgreementKeys: [],
            publicKeys: [authKey],
            lastTxCounter: new BN(0),
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
      DefaultResolver.resolveKey(keyIdUri)
    ).resolves.toStrictEqual<ResolvedDidKey>({
      controller: fullDid,
      publicKey: new Uint8Array(32).fill(0),
      id: keyIdUri,
      type: 'ed25519',
    })
  })

  it('returns null if either the DID or the key do not exist', async () => {
    const deletedFullDid = getKiltDidFromIdentifier(deletedIdentifier, 'full')
    let keyIdUri = `${deletedFullDid}#enc`

    await expect(DefaultResolver.resolveKey(keyIdUri)).resolves.toBeNull()

    const didWithNoEncryptionKey = getKiltDidFromIdentifier(
      identifierWithAuthenticationKey,
      'full'
    )
    keyIdUri = `${didWithNoEncryptionKey}#enc`

    await expect(DefaultResolver.resolveKey(keyIdUri)).resolves.toBeNull()
  })

  it.only('throws for invalid URIs', async () => {
    const uriWithoutFragment = getKiltDidFromIdentifier(
      deletedIdentifier,
      'full'
    )
    await expect(
      DefaultResolver.resolveKey(uriWithoutFragment)
    ).rejects.toThrow()

    const invalidUri = 'invalid-uri'
    await expect(DefaultResolver.resolveKey(invalidUri)).rejects.toThrow()
  })
})

describe('When resolving a service endpoint', () => {
  it.only('correctly resolves it for a full DID if both the DID and the endpoint exist', async () => {
    const fullDid = getKiltDidFromIdentifier(
      identifierWithServiceEndpoints,
      'full'
    )
    const serviceIdUri = `${fullDid}#service-1`

    await expect(
      DefaultResolver.resolveServiceEndpoint(serviceIdUri)
    ).resolves.toStrictEqual<ResolvedDidServiceEndpoint>({
      id: serviceIdUri,
      type: [`type-service-1`],
      serviceEndpoint: [`urls-service-1`],
    })
  })

  // it('returns null if either the DID or the key do not exist', async () => {
  //   const deletedFullDid = getKiltDidFromIdentifier(deletedIdentifier, 'full')
  //   let keyIdUri = `${deletedFullDid}#enc`

  //   await expect(DefaultResolver.resolveKey(keyIdUri)).resolves.toBeNull()

  //   const didWithNoEncryptionKey = getKiltDidFromIdentifier(
  //     identifierWithAuthenticationKey,
  //     'full'
  //   )
  //   keyIdUri = `${didWithNoEncryptionKey}#enc`

  //   await expect(DefaultResolver.resolveKey(keyIdUri)).resolves.toBeNull()
  // })

  // it.only('throws for invalid URIs', async () => {
  //   const uriWithoutFragment = getKiltDidFromIdentifier(
  //     deletedIdentifier,
  //     'full'
  //   )
  //   await expect(
  //     DefaultResolver.resolveKey(uriWithoutFragment)
  //   ).rejects.toThrow()

  //   const invalidUri = 'invalid-uri'
  //   await expect(DefaultResolver.resolveKey(invalidUri)).rejects.toThrow()
  // })
})

// describe('Key resolution', () => {
//   it('Correctly resolves a key given its ID', async () => {
//     const key = (await DefaultResolver.resolveKey(
//       `${fullDidPresentWithAllKeys}#auth`
//     )) as IDidKeyDetails
//     expect(key).toMatchObject<Partial<IDidKeyDetails>>({
//       id: `${fullDidPresentWithAllKeys}#auth`,
//       type: 'ed25519',
//       controller: fullDidPresentWithAllKeys,
//     })
//   })
// })

// describe('Service endpoint resolution', () => {
//   it('Correctly resolves a service endpoint given its ID', async () => {
//     const serviceEndpoint = (await DefaultResolver.resolveServiceEndpoint(
//       `${fullDidPresentWithServiceEndpoints}#id-1`
//     )) as DidServiceEndpoint
//     expect(serviceEndpoint).toMatchObject<DidServiceEndpoint>({
//       id: `${fullDidPresentWithServiceEndpoints}#id-1`,
//       types: ['type-id-1'],
//       urls: ['urls-id-1'],
//     })
//   })
// })

// describe('Full DID resolution', () => {
//   it('Correctly resolves full DID details with authentication key', async () => {
//     const { details, metadata } = (await DefaultResolver.resolve(
//       fullDidPresentWithAuthenticationKey
//     )) as DidResolvedDetails
//     expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
//       deactivated: false,
//     })
//     expect(details?.did).toStrictEqual(fullDidPresentWithAuthenticationKey)
//     expect(details?.getKeys()).toStrictEqual([
//       {
//         id: `${fullDidPresentWithAuthenticationKey}#auth`,
//         type: 'ed25519',
//         controller: fullDidPresentWithAuthenticationKey,
//         publicKeyHex:
//           '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
//         includedAt: 200,
//       },
//     ])
//   })

//   it('Correctly resolves full DID details with all keys', async () => {
//     const { details, metadata } = (await DefaultResolver.resolve(
//       fullDidPresentWithAllKeys
//     )) as DidResolvedDetails
//     expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
//       deactivated: false,
//     })
//     expect(details?.did).toStrictEqual(fullDidPresentWithAllKeys)
//     expect(details?.getKeys()).toStrictEqual([
//       {
//         id: `${fullDidPresentWithAllKeys}#auth`,
//         type: 'ed25519',
//         controller: fullDidPresentWithAllKeys,
//         publicKeyHex:
//           '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
//         includedAt: 200,
//       },
//       {
//         id: `${fullDidPresentWithAllKeys}#enc`,
//         type: 'x25519',
//         controller: fullDidPresentWithAllKeys,
//         publicKeyHex:
//           '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
//         includedAt: 250,
//       },
//       {
//         id: `${fullDidPresentWithAllKeys}#att`,
//         type: 'sr25519',
//         controller: fullDidPresentWithAllKeys,
//         publicKeyHex:
//           '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
//         includedAt: 300,
//       },
//       {
//         id: `${fullDidPresentWithAllKeys}#del`,
//         type: 'ed25519',
//         controller: fullDidPresentWithAllKeys,
//         publicKeyHex:
//           '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
//         includedAt: 350,
//       },
//     ])
//   })

//   it('Correctly resolves full DID details with service endpoints', async () => {
//     const { details, metadata } = (await DefaultResolver.resolve(
//       fullDidPresentWithServiceEndpoints
//     )) as DidResolvedDetails
//     expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
//       deactivated: false,
//     })
//     expect(details?.did).toStrictEqual(fullDidPresentWithServiceEndpoints)
//     expect(details?.getKeys()).toStrictEqual([
//       {
//         id: `${fullDidPresentWithServiceEndpoints}#auth`,
//         type: 'ed25519',
//         controller: fullDidPresentWithServiceEndpoints,
//         publicKeyHex:
//           '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
//         includedAt: 200,
//       },
//     ])
//     expect(details?.getEndpoints()).toStrictEqual([
//       {
//         id: `${fullDidPresentWithServiceEndpoints}#id-1`,
//         types: ['type-id-1'],
//         urls: ['urls-id-1'],
//       },
//       {
//         id: `${fullDidPresentWithServiceEndpoints}#id-2`,
//         types: ['type-id-2'],
//         urls: ['urls-id-2'],
//       },
//     ])
//   })

//   it('Correctly resolves a full DID that does not exist', async () => {
//     const { details, metadata } = (await DefaultResolver.resolve(
//       deletedDid
//     )) as DidResolvedDetails
//     expect(details).toBeUndefined()
//     expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
//       deactivated: true,
//     })
//   })

//   it('Correctly resolves a full DID given a key ID', async () => {
//     const { details, metadata } = (await DefaultResolver.resolveDoc(
//       `${fullDidPresentWithAuthenticationKey}#auth`
//     )) as DidResolvedDetails
//     expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
//       deactivated: false,
//     })
//     expect(details?.did).toStrictEqual(fullDidPresentWithAuthenticationKey)
//     expect(details?.getKeys()).toStrictEqual([
//       {
//         id: `${fullDidPresentWithAuthenticationKey}#auth`,
//         type: 'ed25519',
//         controller: fullDidPresentWithAuthenticationKey,
//         publicKeyHex:
//           '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
//         includedAt: 200,
//       },
//     ])
//   })

//   it('Correctly resolves a full DID given a service ID', async () => {
//     const { details, metadata } = (await DefaultResolver.resolveDoc(
//       `${fullDidPresentWithServiceEndpoints}#id-1`
//     )) as DidResolvedDetails
//     expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
//       deactivated: false,
//     })
//     expect(details?.did).toStrictEqual(fullDidPresentWithServiceEndpoints)
//     expect(details?.getKeys()).toStrictEqual([
//       {
//         id: `${fullDidPresentWithServiceEndpoints}#auth`,
//         type: 'ed25519',
//         controller: fullDidPresentWithServiceEndpoints,
//         publicKeyHex:
//           '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
//         includedAt: 200,
//       },
//     ])
//     expect(details?.getEndpoints()).toStrictEqual([
//       {
//         id: `${fullDidPresentWithServiceEndpoints}#id-1`,
//         types: ['type-id-1'],
//         urls: ['urls-id-1'],
//       },
//       {
//         id: `${fullDidPresentWithServiceEndpoints}#id-2`,
//         types: ['type-id-2'],
//         urls: ['urls-id-2'],
//       },
//     ])
//   })
// })

// describe('Light DID resolution', () => {
//   const mnemonic = 'testMnemonic'

//   const keyring: Keyring = new Keyring({ ss58Format: 38 })
//   let keypair: KeyringPair
//   let publicAuthKey: INewPublicKey
//   let encryptionKey: INewPublicKey
//   let serviceEndpoints: DidServiceEndpoint[]

//   it('Correctly resolves a light DID created with only an ed25519 authentication key', async () => {
//     keypair = keyring.addFromMnemonic(mnemonic, undefined, 'ed25519')
//     publicAuthKey = {
//       publicKey: keypair.publicKey,
//       type: 'ed25519',
//     }
//     const lightDID = new LightDidDetails({
//       authenticationKey: publicAuthKey,
//     })
//     const { details, metadata } = (await DefaultResolver.resolve(
//       lightDID.did
//     )) as DidResolvedDetails

//     expect(details?.getKey(`${lightDID.did}#authentication`)).toMatchObject<
//       Partial<IDidKeyDetails>
//     >({
//       id: `${lightDID.did}#authentication`,
//       controller: lightDID.did,
//       publicKeyHex: u8aToHex(publicAuthKey.publicKey),
//     })

//     expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
//       deactivated: false,
//     })
//   })

//   it('Correctly resolves a light DID created with only an sr25519 authentication key', async () => {
//     keypair = keyring.addFromMnemonic(mnemonic, undefined, 'sr25519')
//     publicAuthKey = {
//       publicKey: keypair.publicKey,
//       type: 'sr25519',
//     }
//     const lightDID = new LightDidDetails({
//       authenticationKey: publicAuthKey,
//     })
//     const { details, metadata } = (await DefaultResolver.resolve(
//       lightDID.did
//     )) as DidResolvedDetails

//     expect(details?.getKey(`${lightDID.did}#authentication`)).toMatchObject<
//       Partial<IDidKeyDetails>
//     >({
//       id: `${lightDID.did}#authentication`,
//       controller: lightDID.did,
//       publicKeyHex: u8aToHex(publicAuthKey.publicKey),
//     })

//     expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
//       deactivated: false,
//     })
//   })

//   it('Correctly resolves a light DID created with an authentication, an encryption key, and three service endpoints', async () => {
//     keypair = keyring.addFromMnemonic(mnemonic, undefined, 'ed25519')
//     publicAuthKey = {
//       publicKey: keypair.publicKey,
//       type: 'sr25519',
//     }
//     encryptionKey = {
//       publicKey: hexToU8a(
//         '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
//       ),
//       type: 'x25519',
//     }
//     serviceEndpoints = [
//       {
//         id: 'id-1',
//         types: ['type-1'],
//         urls: ['url-1'],
//       },
//       {
//         id: 'id-2',
//         types: ['type-2'],
//         urls: ['url-2'],
//       },
//       {
//         id: 'id-3',
//         types: ['type-3'],
//         urls: ['url-3'],
//       },
//     ]
//     const lightDID = new LightDidDetails({
//       authenticationKey: publicAuthKey,
//       encryptionKey,
//       serviceEndpoints,
//     })
//     const { details, metadata } = (await DefaultResolver.resolve(
//       lightDID.did
//     )) as DidResolvedDetails

//     expect(details?.getKey(`${lightDID.did}#authentication`)).toMatchObject<
//       Partial<IDidKeyDetails>
//     >({
//       id: `${lightDID.did}#authentication`,
//       controller: lightDID.did,
//       publicKeyHex: u8aToHex(publicAuthKey.publicKey),
//     })
//     expect(details?.getKey(`${lightDID.did}#encryption`)).toMatchObject<
//       Partial<IDidKeyDetails>
//     >({
//       id: `${lightDID.did}#encryption`,
//       controller: lightDID.did,
//       publicKeyHex: u8aToHex(encryptionKey.publicKey),
//     })
//     expect(details?.getEndpoints()).toStrictEqual<DidServiceEndpoint[]>([
//       {
//         id: `${lightDID.did}#id-1`,
//         types: ['type-1'],
//         urls: ['url-1'],
//       },
//       {
//         id: `${lightDID.did}#id-2`,
//         types: ['type-2'],
//         urls: ['url-2'],
//       },
//       {
//         id: `${lightDID.did}#id-3`,
//         types: ['type-3'],
//         urls: ['url-3'],
//       },
//     ])

//     expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
//       deactivated: false,
//     })
//   })

//   it('Correctly resolves a light DID using a key ID', async () => {
//     keypair = keyring.addFromMnemonic(mnemonic, undefined, 'sr25519')
//     publicAuthKey = {
//       publicKey: keypair.publicKey,
//       type: 'sr25519',
//     }
//     const lightDID = new LightDidDetails({
//       authenticationKey: publicAuthKey,
//     })
//     const { details, metadata } = (await DefaultResolver.resolveDoc(
//       `${lightDID.did}#auth`
//     )) as DidResolvedDetails

//     expect(details?.getKey(`${lightDID.did}#authentication`)).toMatchObject<
//       Partial<IDidKeyDetails>
//     >({
//       id: `${lightDID.did}#authentication`,
//       controller: lightDID.did,
//       publicKeyHex: u8aToHex(publicAuthKey.publicKey),
//     })

//     expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
//       deactivated: false,
//     })
//   })

//   it('Correctly resolves a light DID using a service ID', async () => {
//     keypair = keyring.addFromMnemonic(mnemonic, undefined, 'ed25519')
//     publicAuthKey = {
//       publicKey: keypair.publicKey,
//       type: 'sr25519',
//     }
//     encryptionKey = {
//       publicKey: hexToU8a(
//         '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
//       ),
//       type: 'x25519',
//     }
//     serviceEndpoints = [
//       {
//         id: 'id-1',
//         types: ['type-1'],
//         urls: ['url-1'],
//       },
//       {
//         id: 'id-2',
//         types: ['type-2'],
//         urls: ['url-2'],
//       },
//       {
//         id: 'id-3',
//         types: ['type-3'],
//         urls: ['url-3'],
//       },
//     ]
//     const lightDID = new LightDidDetails({
//       authenticationKey: publicAuthKey,
//       encryptionKey,
//       serviceEndpoints,
//     })
//     const { details, metadata } = (await DefaultResolver.resolveDoc(
//       `${lightDID.did}#id-1`
//     )) as DidResolvedDetails

//     expect(details?.getKey(`${lightDID.did}#authentication`)).toMatchObject<
//       Partial<IDidKeyDetails>
//     >({
//       id: `${lightDID.did}#authentication`,
//       controller: lightDID.did,
//       publicKeyHex: u8aToHex(publicAuthKey.publicKey),
//     })
//     expect(details?.getKey(`${lightDID.did}#encryption`)).toMatchObject<
//       Partial<IDidKeyDetails>
//     >({
//       id: `${lightDID.did}#encryption`,
//       controller: lightDID.did,
//       publicKeyHex: u8aToHex(encryptionKey.publicKey),
//     })
//     expect(details?.getEndpoints()).toStrictEqual<DidServiceEndpoint[]>([
//       {
//         id: `${lightDID.did}#id-1`,
//         types: ['type-1'],
//         urls: ['url-1'],
//       },
//       {
//         id: `${lightDID.did}#id-2`,
//         types: ['type-2'],
//         urls: ['url-2'],
//       },
//       {
//         id: `${lightDID.did}#id-3`,
//         types: ['type-3'],
//         urls: ['url-3'],
//       },
//     ])

//     expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
//       deactivated: false,
//     })
//   })
// })

// describe('Migrated DID resolution', () => {
//   it('Correctly resolves a migrated light DID that has not been deleted', async () => {
//     const { details, metadata } = (await DefaultResolver.resolve(
//       migratedUndeletedLightDid
//     )) as DidResolvedDetails
//     expect(details).toBeDefined()
//     expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
//       deactivated: false,
//       canonicalId: fullDidPresentWithAuthenticationKey,
//     })
//   })

//   it('Correctly resolves a migrated light DID that has been deleted', async () => {
//     const { details, metadata } = (await DefaultResolver.resolve(
//       migratedDeletedLightDid
//     )) as DidResolvedDetails
//     expect(details).toBeUndefined()
//     expect(metadata).toStrictEqual<DidResolutionDocumentMetadata>({
//       deactivated: true,
//     })
//   })
// })
