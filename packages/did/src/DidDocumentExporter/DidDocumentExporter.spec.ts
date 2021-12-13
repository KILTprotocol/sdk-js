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
} from '@kiltprotocol/types'

import type { IDidChainRecordJSON } from '../Did.chain'
import { exportToDidDocument } from './DidDocumentExporter'
import { FullDidDetails, LightDidDetails } from '..'

/**
 * @group unit/did
 */

const identifier = '4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs'

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
    publicKey: new Uint8Array(32).fill(0),
    includedAt: new BN(15),
  }
}

function generateAttestationKeyDetails(): DidKey {
  return {
    id: 'att',
    type: 'sr25519',
    publicKey: new Uint8Array(32).fill(0),
    includedAt: new BN(20),
  }
}

function generateDelegationKeyDetails(): DidKey {
  return {
    id: 'del',
    type: 'ecdsa',
    publicKey: new Uint8Array(32).fill(0),
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      didIdentifier: IDidIdentifier
    ): Promise<IDidChainRecordJSON | null> => {
      const authKey = generateAuthenticationKeyDetails()
      const encKey = generateEncryptionKeyDetails()
      const attKey = generateAttestationKeyDetails()
      const delKey = generateDelegationKeyDetails()

      return {
        authenticationKey: authKey.id,
        keyAgreementKeys: [encKey.id],
        assertionMethodKey: attKey.id,
        capabilityDelegationKey: delKey.id,
        publicKeys: [authKey, encKey, attKey, delKey],
        lastTxCounter: new BN(0),
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
    ): Promise<DidServiceEndpoint | null> =>
      generateServiceEndpointDetails(serviceId)
  )
  const queryServiceEndpoints = jest.fn(
    async (didIdentifier: IDidIdentifier): Promise<DidServiceEndpoint[]> => {
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
    }
  )
  return {
    queryDetails,
    queryKey,
    queryServiceEndpoint,
    queryServiceEndpoints,
  }
})

describe('When exporting a DID Document from a full DID', () => {
  it('exports the expected application/json W3C DID Document with an Ed25519 authentication key, one x25519 encryption key, an Sr25519 assertion key, an Ecdsa delegation key, and two service endpoints', async () => {
    const fullDidDetails = (await FullDidDetails.fromChainInfo(
      identifier
    )) as FullDidDetails

    const didDoc = exportToDidDocument(fullDidDetails, 'application/json')

    expect(didDoc).toStrictEqual({
      id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
      verificationMethod: [
        {
          id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#auth',
          controller:
            'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
          type: 'Ed25519VerificationKey2018',
          publicKeyBase58: '11111111111111111111111111111111',
        },
        {
          id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#enc',
          controller:
            'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
          type: 'X25519KeyAgreementKey2019',
          publicKeyBase58: '11111111111111111111111111111111',
        },
        {
          id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#att',
          controller:
            'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
          type: 'Sr25519VerificationKey2020',
          publicKeyBase58: '11111111111111111111111111111111',
        },
        {
          id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#del',
          controller:
            'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
          type: 'EcdsaSecp256k1VerificationKey2019',
          publicKeyBase58: '11111111111111111111111111111111',
        },
      ],
      authentication: [
        'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#auth',
      ],
      keyAgreement: [
        'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#enc',
      ],
      assertionMethod: [
        'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#att',
      ],
      capabilityDelegation: [
        'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#del',
      ],
      service: [
        {
          id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#id-1',
          type: ['type-id-1'],
          serviceEndpoint: ['url-id-1'],
        },
        {
          id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#id-2',
          type: ['type-id-2'],
          serviceEndpoint: ['url-id-2'],
        },
      ],
    })
  })

  it('exports the expected application/ld+json W3C DID Document with an Ed25519 authentication key, two x25519 encryption keys, an Sr25519 assertion key, an Ecdsa delegation key, and two service endpoints', async () => {
    const fullDidDetails = (await FullDidDetails.fromChainInfo(
      identifier
    )) as FullDidDetails

    const didDoc = exportToDidDocument(fullDidDetails, 'application/ld+json')

    expect(didDoc).toStrictEqual({
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
      verificationMethod: [
        {
          id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#auth',
          controller:
            'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
          type: 'Ed25519VerificationKey2018',
          publicKeyBase58: '11111111111111111111111111111111',
        },
        {
          id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#enc',
          controller:
            'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
          type: 'X25519KeyAgreementKey2019',
          publicKeyBase58: '11111111111111111111111111111111',
        },
        {
          id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#att',
          controller:
            'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
          type: 'Sr25519VerificationKey2020',
          publicKeyBase58: '11111111111111111111111111111111',
        },
        {
          id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#del',
          controller:
            'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs',
          type: 'EcdsaSecp256k1VerificationKey2019',
          publicKeyBase58: '11111111111111111111111111111111',
        },
      ],
      authentication: [
        'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#auth',
      ],
      keyAgreement: [
        'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#enc',
      ],
      assertionMethod: [
        'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#att',
      ],
      capabilityDelegation: [
        'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#del',
      ],
      service: [
        {
          id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#id-1',
          type: ['type-id-1'],
          serviceEndpoint: ['url-id-1'],
        },
        {
          id: 'did:kilt:4r1WkS3t8rbCb11H8t3tJvGVCynwDXSUBiuGB6sLRHzCLCjs#id-2',
          type: ['type-id-2'],
          serviceEndpoint: ['url-id-2'],
        },
      ],
    })
  })

  it('fails to export to an unsupported mimetype', async () => {
    const fullDidDetails = (await FullDidDetails.fromChainInfo(
      identifier
    )) as FullDidDetails

    expect(() =>
      exportToDidDocument(fullDidDetails, 'random-mime-type')
    ).toThrow()
  })
})

describe('When exporting a DID Document from a light DID', () => {
  const authKey: DidKey = generateAuthenticationKeyDetails()
  const encKey: DidKey = generateEncryptionKeyDetails()
  const serviceEndpoints: DidServiceEndpoint[] = [
    generateServiceEndpointDetails('id-1'),
    generateServiceEndpointDetails('id-2'),
  ]
  const lightDidDetails = LightDidDetails.fromDetails({
    authenticationKey: {
      publicKey: authKey.publicKey,
      type: authKey.type,
    },
    encryptionKey: {
      publicKey: encKey.publicKey,
      type: 'x25519',
    },
    serviceEndpoints,
  })

  it('exports the expected application/json W3C DID Document with an Ed25519 authentication key, one x25519 encryption key, and two service endpoints', async () => {
    const didDoc = exportToDidDocument(lightDidDetails, 'application/json')

    expect(didDoc).toStrictEqual({
      id: 'did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:omFlomlwdWJsaWNLZXnYQFggAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABkdHlwZWZ4MjU1MTlhc4KjYmlkZGlkLTFldHlwZXOBaXR5cGUtaWQtMWR1cmxzgWh1cmwtaWQtMaNiaWRkaWQtMmV0eXBlc4FpdHlwZS1pZC0yZHVybHOBaHVybC1pZC0y',
      verificationMethod: [
        {
          id: 'did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:omFlomlwdWJsaWNLZXnYQFggAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABkdHlwZWZ4MjU1MTlhc4KjYmlkZGlkLTFldHlwZXOBaXR5cGUtaWQtMWR1cmxzgWh1cmwtaWQtMaNiaWRkaWQtMmV0eXBlc4FpdHlwZS1pZC0yZHVybHOBaHVybC1pZC0y#authentication',
          controller:
            'did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:omFlomlwdWJsaWNLZXnYQFggAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABkdHlwZWZ4MjU1MTlhc4KjYmlkZGlkLTFldHlwZXOBaXR5cGUtaWQtMWR1cmxzgWh1cmwtaWQtMaNiaWRkaWQtMmV0eXBlc4FpdHlwZS1pZC0yZHVybHOBaHVybC1pZC0y',
          type: 'Ed25519VerificationKey2018',
          publicKeyBase58: '11111111111111111111111111111111',
        },
        {
          id: 'did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:omFlomlwdWJsaWNLZXnYQFggAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABkdHlwZWZ4MjU1MTlhc4KjYmlkZGlkLTFldHlwZXOBaXR5cGUtaWQtMWR1cmxzgWh1cmwtaWQtMaNiaWRkaWQtMmV0eXBlc4FpdHlwZS1pZC0yZHVybHOBaHVybC1pZC0y#encryption',
          controller:
            'did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:omFlomlwdWJsaWNLZXnYQFggAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABkdHlwZWZ4MjU1MTlhc4KjYmlkZGlkLTFldHlwZXOBaXR5cGUtaWQtMWR1cmxzgWh1cmwtaWQtMaNiaWRkaWQtMmV0eXBlc4FpdHlwZS1pZC0yZHVybHOBaHVybC1pZC0y',
          type: 'X25519KeyAgreementKey2019',
          publicKeyBase58: '11111111111111111111111111111111',
        },
      ],
      authentication: [
        'did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:omFlomlwdWJsaWNLZXnYQFggAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABkdHlwZWZ4MjU1MTlhc4KjYmlkZGlkLTFldHlwZXOBaXR5cGUtaWQtMWR1cmxzgWh1cmwtaWQtMaNiaWRkaWQtMmV0eXBlc4FpdHlwZS1pZC0yZHVybHOBaHVybC1pZC0y#authentication',
      ],
      keyAgreement: [
        'did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:omFlomlwdWJsaWNLZXnYQFggAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABkdHlwZWZ4MjU1MTlhc4KjYmlkZGlkLTFldHlwZXOBaXR5cGUtaWQtMWR1cmxzgWh1cmwtaWQtMaNiaWRkaWQtMmV0eXBlc4FpdHlwZS1pZC0yZHVybHOBaHVybC1pZC0y#encryption',
      ],
      service: [
        {
          id: 'did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:omFlomlwdWJsaWNLZXnYQFggAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABkdHlwZWZ4MjU1MTlhc4KjYmlkZGlkLTFldHlwZXOBaXR5cGUtaWQtMWR1cmxzgWh1cmwtaWQtMaNiaWRkaWQtMmV0eXBlc4FpdHlwZS1pZC0yZHVybHOBaHVybC1pZC0y#id-1',
          type: ['type-id-1'],
          serviceEndpoint: ['url-id-1'],
        },
        {
          id: 'did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:omFlomlwdWJsaWNLZXnYQFggAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABkdHlwZWZ4MjU1MTlhc4KjYmlkZGlkLTFldHlwZXOBaXR5cGUtaWQtMWR1cmxzgWh1cmwtaWQtMaNiaWRkaWQtMmV0eXBlc4FpdHlwZS1pZC0yZHVybHOBaHVybC1pZC0y#id-2',
          type: ['type-id-2'],
          serviceEndpoint: ['url-id-2'],
        },
      ],
    })
  })

  it('exports the expected application/json+ld W3C DID Document with an Ed25519 authentication key, one x25519 encryption key, and two service endpoints', async () => {
    const didDoc = exportToDidDocument(lightDidDetails, 'application/ld+json')

    expect(didDoc).toStrictEqual({
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: 'did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:omFlomlwdWJsaWNLZXnYQFggAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABkdHlwZWZ4MjU1MTlhc4KjYmlkZGlkLTFldHlwZXOBaXR5cGUtaWQtMWR1cmxzgWh1cmwtaWQtMaNiaWRkaWQtMmV0eXBlc4FpdHlwZS1pZC0yZHVybHOBaHVybC1pZC0y',
      verificationMethod: [
        {
          id: 'did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:omFlomlwdWJsaWNLZXnYQFggAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABkdHlwZWZ4MjU1MTlhc4KjYmlkZGlkLTFldHlwZXOBaXR5cGUtaWQtMWR1cmxzgWh1cmwtaWQtMaNiaWRkaWQtMmV0eXBlc4FpdHlwZS1pZC0yZHVybHOBaHVybC1pZC0y#authentication',
          controller:
            'did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:omFlomlwdWJsaWNLZXnYQFggAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABkdHlwZWZ4MjU1MTlhc4KjYmlkZGlkLTFldHlwZXOBaXR5cGUtaWQtMWR1cmxzgWh1cmwtaWQtMaNiaWRkaWQtMmV0eXBlc4FpdHlwZS1pZC0yZHVybHOBaHVybC1pZC0y',
          type: 'Ed25519VerificationKey2018',
          publicKeyBase58: '11111111111111111111111111111111',
        },
        {
          id: 'did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:omFlomlwdWJsaWNLZXnYQFggAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABkdHlwZWZ4MjU1MTlhc4KjYmlkZGlkLTFldHlwZXOBaXR5cGUtaWQtMWR1cmxzgWh1cmwtaWQtMaNiaWRkaWQtMmV0eXBlc4FpdHlwZS1pZC0yZHVybHOBaHVybC1pZC0y#encryption',
          controller:
            'did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:omFlomlwdWJsaWNLZXnYQFggAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABkdHlwZWZ4MjU1MTlhc4KjYmlkZGlkLTFldHlwZXOBaXR5cGUtaWQtMWR1cmxzgWh1cmwtaWQtMaNiaWRkaWQtMmV0eXBlc4FpdHlwZS1pZC0yZHVybHOBaHVybC1pZC0y',
          type: 'X25519KeyAgreementKey2019',
          publicKeyBase58: '11111111111111111111111111111111',
        },
      ],
      authentication: [
        'did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:omFlomlwdWJsaWNLZXnYQFggAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABkdHlwZWZ4MjU1MTlhc4KjYmlkZGlkLTFldHlwZXOBaXR5cGUtaWQtMWR1cmxzgWh1cmwtaWQtMaNiaWRkaWQtMmV0eXBlc4FpdHlwZS1pZC0yZHVybHOBaHVybC1pZC0y#authentication',
      ],
      keyAgreement: [
        'did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:omFlomlwdWJsaWNLZXnYQFggAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABkdHlwZWZ4MjU1MTlhc4KjYmlkZGlkLTFldHlwZXOBaXR5cGUtaWQtMWR1cmxzgWh1cmwtaWQtMaNiaWRkaWQtMmV0eXBlc4FpdHlwZS1pZC0yZHVybHOBaHVybC1pZC0y#encryption',
      ],
      service: [
        {
          id: 'did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:omFlomlwdWJsaWNLZXnYQFggAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABkdHlwZWZ4MjU1MTlhc4KjYmlkZGlkLTFldHlwZXOBaXR5cGUtaWQtMWR1cmxzgWh1cmwtaWQtMaNiaWRkaWQtMmV0eXBlc4FpdHlwZS1pZC0yZHVybHOBaHVybC1pZC0y#id-1',
          type: ['type-id-1'],
          serviceEndpoint: ['url-id-1'],
        },
        {
          id: 'did:kilt:light:014nv4phaKc4EcwENdRERuMF79ZSSB5xvnAk3zNySSbVbXhSwS:omFlomlwdWJsaWNLZXnYQFggAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABkdHlwZWZ4MjU1MTlhc4KjYmlkZGlkLTFldHlwZXOBaXR5cGUtaWQtMWR1cmxzgWh1cmwtaWQtMaNiaWRkaWQtMmV0eXBlc4FpdHlwZS1pZC0yZHVybHOBaHVybC1pZC0y#id-2',
          type: ['type-id-2'],
          serviceEndpoint: ['url-id-2'],
        },
      ],
    })
  })

  it('fails to export to an unsupported mimetype', async () => {
    expect(() =>
      exportToDidDocument(lightDidDetails, 'random-mime-type')
    ).toThrow()
  })
})
