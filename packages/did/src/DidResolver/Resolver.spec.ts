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
  IDidServiceEndpoint,
  IIdentity,
  KeyRelationship,
  KeyringPair,
} from '@kiltprotocol/types'
import type { IDidResolvedDetails } from '@kiltprotocol/types'
import { Keyring } from '@kiltprotocol/utils'
import { hexToU8a, u8aToHex } from '@polkadot/util'
import { LightDidDetails } from '../DidDetails'
import type { INewPublicKey } from '../types'
import { IDidChainRecordJSON } from '../types'
import { DefaultResolver } from './DefaultResolver'
import { getKiltDidFromIdentifier } from '../Did.utils'

const fullDidPresentWithAuthenticationKey =
  'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs'
const fullDidPresentWithAllKeys =
  'did:kilt:4sDxAgw86PFvC6TQbvZzo19WoYF6T4HcLd2i9wzvojkLXLvp'
const fullDidPresentWithServiceEndpoints =
  'did:kilt:4q4DHavMdesaSMH3g32xH3fhxYPt5pmoP9oSwgTr73dQLrkN'

function generateAuthenticationKeyDetails(
  didIdentifier: IIdentity['address']
): [string, IDidKeyDetails] {
  const didUri = getKiltDidFromIdentifier(didIdentifier, 'full')
  return [
    'auth',
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
    'enc',
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
    'att',
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
    'del',
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
        default:
          return null
      }
    }
  )
  const queryServiceEndpoint = jest.fn(
    async (
      did: string,
      serviceId: string
    ): Promise<IDidServiceEndpoint | null> => {
      switch (did) {
        case fullDidPresentWithServiceEndpoints:
          return {
            id: `${fullDidPresentWithServiceEndpoints}#${serviceId}`,
            types: [`type-${serviceId}`],
            urls: [`urls-${serviceId}`],
          }
        default:
          return null
      }
    }
  )
  const queryServiceEndpoints = jest.fn(
    async (did: string): Promise<IDidServiceEndpoint[]> => {
      switch (did) {
        case fullDidPresentWithServiceEndpoints:
          return [
            (await queryServiceEndpoint(did, 'id-1')) as IDidServiceEndpoint,
            (await queryServiceEndpoint(did, 'id-2')) as IDidServiceEndpoint,
          ]
        default:
          return []
      }
    }
  )
  return {
    queryByDID,
    queryById: jest.fn(
      async (id: string): Promise<IDidChainRecordJSON | null> =>
        queryByDID(`did:kilt:${id}`)
    ),
    queryServiceEndpoint,
    queryServiceEndpoints,
  }
})

// describe('Full DID resolution', () => {

// })

const identifier = '4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs'
const fullDid = `did:kilt:${identifier}`

it('resolves stuff', async () => {
  await expect(DefaultResolver.resolveDoc(fullDid)).resolves.toMatchObject({
    details: {
      did: fullDid,
      identifier,
    },
  })
})

it('has the right keys', async () => {
  const didRecord = await DefaultResolver.resolveDoc(fullDid)
  expect(didRecord?.details?.getKeyIds()).toStrictEqual([
    `${fullDid}#auth`,
    `${fullDid}#x25519`,
  ])
  expect(
    didRecord?.details?.getKeyIds(KeyRelationship.authentication)
  ).toStrictEqual([`${fullDid}#auth`])
  expect(
    didRecord?.details?.getKeys(KeyRelationship.keyAgreement)
  ).toStrictEqual([
    {
      id: `${fullDid}#x25519`,
      controller: fullDid,
      includedAt: 250,
      type: 'x25519',
      publicKeyHex:
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    },
  ])
})

it('has the right service endpoints', async () => {
  const didRecord = await DefaultResolver.resolveDoc(fullDid)
  expect(didRecord?.details?.getEndpoints()).toStrictEqual([
    {
      id: `${fullDid}#id-1`,
      types: ['type-id-1'],
      urls: ['url-id-1'],
    },
    {
      id: `${fullDid}#id-2`,
      types: ['type-id-2'],
      urls: ['url-id-2'],
    },
  ])
  expect(didRecord?.details?.getEndpointById(`${fullDid}#id-1`)).toStrictEqual({
    id: `${fullDid}#id-1`,
    types: ['type-id-1'],
    urls: ['url-id-1'],
  })
})

const mnemonic = 'testMnemonic'

describe('Light DID tests', () => {
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
    const resolutionResult = (await DefaultResolver.resolve(
      lightDID.did
    )) as IDidResolvedDetails
    const derivedAuthenticationPublicKey = resolutionResult.details?.getKey(
      `${lightDID.did}#authentication`
    )
    expect(derivedAuthenticationPublicKey).toBeDefined()
    expect(derivedAuthenticationPublicKey!.publicKeyHex).toEqual(
      u8aToHex(publicAuthKey.publicKey)
    )
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
    const resolutionResult = (await DefaultResolver.resolve(
      lightDID.did
    )) as IDidResolvedDetails
    const derivedAuthenticationPublicKey = resolutionResult.details?.getKey(
      `${lightDID.did}#authentication`
    )
    expect(derivedAuthenticationPublicKey).toBeDefined()
    expect(derivedAuthenticationPublicKey!.publicKeyHex).toEqual(
      u8aToHex(publicAuthKey.publicKey)
    )
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
    const resolutionResult = (await DefaultResolver.resolve(
      lightDID.did
    )) as IDidResolvedDetails

    const derivedAuthenticationPublicKey = resolutionResult.details?.getKey(
      `${lightDID.did}#authentication`
    )
    expect(derivedAuthenticationPublicKey).toBeDefined()
    expect(derivedAuthenticationPublicKey!.publicKeyHex).toEqual(
      u8aToHex(publicAuthKey.publicKey)
    )
    const derivedEncryptionPublicKey = resolutionResult.details?.getKey(
      `${lightDID.did}#encryption`
    )
    expect(derivedEncryptionPublicKey).toBeDefined()
    expect(derivedEncryptionPublicKey!.publicKeyHex).toEqual(
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    )
    const derivedServiceEndpoints = resolutionResult.details?.getEndpoints()
    expect(derivedServiceEndpoints).toStrictEqual([
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
  })
})
