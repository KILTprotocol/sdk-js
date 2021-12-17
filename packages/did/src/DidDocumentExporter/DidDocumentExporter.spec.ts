/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @group unit/did
 */

import { IDidServiceEndpoint, KeyRelationship } from '@kiltprotocol/types'
import { BN, hexToU8a } from '@polkadot/util'
import type { IDidKeyDetails } from '@kiltprotocol/types'
import type {
  INewPublicKey,
  LightDidDetailsCreationOpts,
  FullDidDetailsCreationOpts,
} from '../types'
import { FullDidDetails } from '../DidDetails/FullDidDetails'
import { LightDidDetails } from '../DidDetails/LightDidDetails'
import { exportToDidDocument } from './DidDocumentExporter'

describe('Full DID Document exporting tests', () => {
  const identifier = '4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e'
  const did = `did:kilt:${identifier}`
  const keys: IDidKeyDetails[] = [
    {
      id: `${did}#1`,
      controller: did,
      includedAt: 100,
      type: 'ed25519',
      publicKeyHex:
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    },
    {
      id: `${did}#2`,
      controller: did,
      includedAt: 250,
      type: 'x25519',
      publicKeyHex:
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    },
    {
      id: `${did}#3`,
      controller: did,
      includedAt: 250,
      type: 'x25519',
      publicKeyHex:
        '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    },
    {
      id: `${did}#4`,
      controller: did,
      includedAt: 200,
      type: 'sr25519',
      publicKeyHex:
        '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
    },
  ]
  const serviceEndpoints: IDidServiceEndpoint[] = [
    {
      id: `${did}#id-1`,
      types: ['type-1'],
      urls: ['url-1'],
    },
    {
      id: `${did}#id-2`,
      types: ['type-2'],
      urls: ['url-2'],
    },
  ]
  const didDetails: FullDidDetailsCreationOpts = {
    did,
    keys,
    keyRelationships: {
      [KeyRelationship.authentication]: [keys[0].id],
      [KeyRelationship.keyAgreement]: [keys[1].id, keys[2].id],
      [KeyRelationship.assertionMethod]: [keys[3].id],
    },
    serviceEndpoints,
    lastTxIndex: new BN(10),
  }

  it('exports the expected application/json W3C DID Document with an Ed25519 authentication key, two x25519 encryption keys, an Sr25519 assertion key, an Ecdsa delegation key, and two service endpoints', () => {
    const ecdsaKey: IDidKeyDetails = {
      id: `${did}#5`,
      controller: did,
      includedAt: 200,
      type: 'ecdsa',
      publicKeyHex:
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    }
    const fullDidDetails = new FullDidDetails({
      ...didDetails,
      keyRelationships: {
        [KeyRelationship.authentication]: [keys[0].id],
        [KeyRelationship.keyAgreement]: [keys[1].id, keys[2].id],
        [KeyRelationship.assertionMethod]: [keys[3].id],
        [KeyRelationship.capabilityDelegation]: [ecdsaKey.id],
      },
      keys: keys.concat([ecdsaKey]),
    })

    const didDoc = exportToDidDocument(fullDidDetails, 'application/json')

    expect(didDoc).toStrictEqual({
      id: 'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e',
      verificationMethod: [
        {
          id: 'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e#1',
          controller:
            'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e',
          type: 'Ed25519VerificationKey2018',
          publicKeyBase58: 'CVDFLCAjXhVWiPXH9nTCTpCgVzmDVoiPzNJYuccr1dqB',
        },
        {
          id: 'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e#2',
          controller:
            'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e',
          type: 'X25519KeyAgreementKey2019',
          publicKeyBase58: 'DdqGmK5uamYN5vmuZrzpQhKeehLdwtPLVJdhu5P2iJKC',
        },
        {
          id: 'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e#3',
          controller:
            'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e',
          type: 'X25519KeyAgreementKey2019',
          publicKeyBase58: 'EnTJCS15dqbDTU2XywYSMaScoPv4Py4GzExrtY9DQxoD',
        },
        {
          id: 'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e#4',
          controller:
            'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e',
          type: 'Sr25519VerificationKey2020',
          publicKeyBase58: 'Fw5KdYvFgue4q1HAQ264JTZax6VUr3jDVBJ1szuQ7dHE',
        },
        {
          id: 'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e#5',
          controller:
            'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e',
          type: 'EcdsaSecp256k1VerificationKey2019',
          publicKeyBase58: '2pEER9q8Tu5XVwfBQeU2NE883JsUTX9jbbmVg3SL1g2fKCSd17',
        },
      ],
      authentication: [
        'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e#1',
      ],
      keyAgreement: [
        'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e#2',
        'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e#3',
      ],
      assertionMethod: [
        'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e#4',
      ],
      capabilityDelegation: [
        'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e#5',
      ],
      service: [
        {
          id: 'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e#id-1',
          type: ['type-1'],
          serviceEndpoint: ['url-1'],
        },
        {
          id: 'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e#id-2',
          type: ['type-2'],
          serviceEndpoint: ['url-2'],
        },
      ],
    })
  })

  it('exports the expected application/ld+json W3C DID Document with an Ed25519 authentication key, two x25519 encryption keys, an Sr25519 assertion key, an Ecdsa delegation key, and two service endpoints', () => {
    const ecdsaKey: IDidKeyDetails = {
      id: `${did}#5`,
      controller: did,
      includedAt: 200,
      type: 'ecdsa',
      publicKeyHex:
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    }
    const fullDidDetails = new FullDidDetails({
      ...didDetails,
      keyRelationships: {
        [KeyRelationship.authentication]: [keys[0].id],
        [KeyRelationship.keyAgreement]: [keys[1].id, keys[2].id],
        [KeyRelationship.assertionMethod]: [keys[3].id],
        [KeyRelationship.capabilityDelegation]: [ecdsaKey.id],
      },
      keys: keys.concat([ecdsaKey]),
    })

    const didDoc = exportToDidDocument(fullDidDetails, 'application/ld+json')

    expect(didDoc).toStrictEqual({
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: 'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e',
      verificationMethod: [
        {
          id: 'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e#1',
          controller:
            'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e',
          type: 'Ed25519VerificationKey2018',
          publicKeyBase58: 'CVDFLCAjXhVWiPXH9nTCTpCgVzmDVoiPzNJYuccr1dqB',
        },
        {
          id: 'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e#2',
          controller:
            'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e',
          type: 'X25519KeyAgreementKey2019',
          publicKeyBase58: 'DdqGmK5uamYN5vmuZrzpQhKeehLdwtPLVJdhu5P2iJKC',
        },
        {
          id: 'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e#3',
          controller:
            'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e',
          type: 'X25519KeyAgreementKey2019',
          publicKeyBase58: 'EnTJCS15dqbDTU2XywYSMaScoPv4Py4GzExrtY9DQxoD',
        },
        {
          id: 'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e#4',
          controller:
            'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e',
          type: 'Sr25519VerificationKey2020',
          publicKeyBase58: 'Fw5KdYvFgue4q1HAQ264JTZax6VUr3jDVBJ1szuQ7dHE',
        },
        {
          id: 'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e#5',
          controller:
            'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e',
          type: 'EcdsaSecp256k1VerificationKey2019',
          publicKeyBase58: '2pEER9q8Tu5XVwfBQeU2NE883JsUTX9jbbmVg3SL1g2fKCSd17',
        },
      ],
      authentication: [
        'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e#1',
      ],
      keyAgreement: [
        'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e#2',
        'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e#3',
      ],
      assertionMethod: [
        'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e#4',
      ],
      capabilityDelegation: [
        'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e#5',
      ],
      service: [
        {
          id: 'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e#id-1',
          type: ['type-1'],
          serviceEndpoint: ['url-1'],
        },
        {
          id: 'did:kilt:4rp4rcDHP71YrBNvDhcH5iRoM3YzVoQVnCZvQPwPom9bjo2e#id-2',
          type: ['type-2'],
          serviceEndpoint: ['url-2'],
        },
      ],
    })
  })
})

describe('Light DID Document exporting tests', () => {
  const authPublicKey = hexToU8a(
    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  )
  const encPublicKey = hexToU8a(
    '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
  )
  let authenticationDidKeyDetails: INewPublicKey = {
    publicKey: authPublicKey,
    type: 'ed25519',
  }
  let encryptionDidKeyDetails: INewPublicKey | undefined
  let serviceEndpoints: IDidServiceEndpoint[]

  it('exports the expected application/json W3C DID Document with an Ed25519 authentication key, an x25519 encryption key, and two service endpoints', () => {
    encryptionDidKeyDetails = {
      publicKey: encPublicKey,
      type: 'x25519',
    }
    serviceEndpoints = [
      {
        id: `id-1`,
        types: ['type-1'],
        urls: ['url-1'],
      },
      {
        id: `id-2`,
        types: ['type-2'],
        urls: ['url-2'],
      },
    ]

    const didCreationDetails: LightDidDetailsCreationOpts = {
      authenticationKey: authenticationDidKeyDetails,
      encryptionKey: encryptionDidKeyDetails,
      serviceEndpoints,
    }
    const didDetails = new LightDidDetails(didCreationDetails)
    const didDoc = exportToDidDocument(didDetails, 'application/json')

    expect(didDoc).toStrictEqual({
      id: 'did:kilt:light:014rmqfMwFrv9mhwJwMb1vGWcmKmCNTRM8J365TRsJuPzXDNGF:3nCdN4Pm2E11EsvuHFWcHY4c82dCFRxZP7MYtJD6ctPRrXzup7Cv8Wap18LHQaJYDnbvFdXQrpYjuXsoxKb2PhKXujiGAE5pFDyFGKjL8AJLGB2hXGSZyarmzeqjjYmEHSuHgCfH1cYPRHRCUaEAtehQvv6ZCpoPjChqcm7XaetboiWDisJ42smzR',
      verificationMethod: [
        {
          id: 'did:kilt:light:014rmqfMwFrv9mhwJwMb1vGWcmKmCNTRM8J365TRsJuPzXDNGF:3nCdN4Pm2E11EsvuHFWcHY4c82dCFRxZP7MYtJD6ctPRrXzup7Cv8Wap18LHQaJYDnbvFdXQrpYjuXsoxKb2PhKXujiGAE5pFDyFGKjL8AJLGB2hXGSZyarmzeqjjYmEHSuHgCfH1cYPRHRCUaEAtehQvv6ZCpoPjChqcm7XaetboiWDisJ42smzR#authentication',
          controller:
            'did:kilt:light:014rmqfMwFrv9mhwJwMb1vGWcmKmCNTRM8J365TRsJuPzXDNGF:3nCdN4Pm2E11EsvuHFWcHY4c82dCFRxZP7MYtJD6ctPRrXzup7Cv8Wap18LHQaJYDnbvFdXQrpYjuXsoxKb2PhKXujiGAE5pFDyFGKjL8AJLGB2hXGSZyarmzeqjjYmEHSuHgCfH1cYPRHRCUaEAtehQvv6ZCpoPjChqcm7XaetboiWDisJ42smzR',
          type: 'Ed25519VerificationKey2018',
          publicKeyBase58: 'CVDFLCAjXhVWiPXH9nTCTpCgVzmDVoiPzNJYuccr1dqB',
        },
        {
          id: 'did:kilt:light:014rmqfMwFrv9mhwJwMb1vGWcmKmCNTRM8J365TRsJuPzXDNGF:3nCdN4Pm2E11EsvuHFWcHY4c82dCFRxZP7MYtJD6ctPRrXzup7Cv8Wap18LHQaJYDnbvFdXQrpYjuXsoxKb2PhKXujiGAE5pFDyFGKjL8AJLGB2hXGSZyarmzeqjjYmEHSuHgCfH1cYPRHRCUaEAtehQvv6ZCpoPjChqcm7XaetboiWDisJ42smzR#encryption',
          controller:
            'did:kilt:light:014rmqfMwFrv9mhwJwMb1vGWcmKmCNTRM8J365TRsJuPzXDNGF:3nCdN4Pm2E11EsvuHFWcHY4c82dCFRxZP7MYtJD6ctPRrXzup7Cv8Wap18LHQaJYDnbvFdXQrpYjuXsoxKb2PhKXujiGAE5pFDyFGKjL8AJLGB2hXGSZyarmzeqjjYmEHSuHgCfH1cYPRHRCUaEAtehQvv6ZCpoPjChqcm7XaetboiWDisJ42smzR',
          type: 'X25519KeyAgreementKey2019',
          publicKeyBase58: 'DdqGmK5uamYN5vmuZrzpQhKeehLdwtPLVJdhu5P2iJKC',
        },
      ],
      authentication: [
        'did:kilt:light:014rmqfMwFrv9mhwJwMb1vGWcmKmCNTRM8J365TRsJuPzXDNGF:3nCdN4Pm2E11EsvuHFWcHY4c82dCFRxZP7MYtJD6ctPRrXzup7Cv8Wap18LHQaJYDnbvFdXQrpYjuXsoxKb2PhKXujiGAE5pFDyFGKjL8AJLGB2hXGSZyarmzeqjjYmEHSuHgCfH1cYPRHRCUaEAtehQvv6ZCpoPjChqcm7XaetboiWDisJ42smzR#authentication',
      ],
      keyAgreement: [
        'did:kilt:light:014rmqfMwFrv9mhwJwMb1vGWcmKmCNTRM8J365TRsJuPzXDNGF:3nCdN4Pm2E11EsvuHFWcHY4c82dCFRxZP7MYtJD6ctPRrXzup7Cv8Wap18LHQaJYDnbvFdXQrpYjuXsoxKb2PhKXujiGAE5pFDyFGKjL8AJLGB2hXGSZyarmzeqjjYmEHSuHgCfH1cYPRHRCUaEAtehQvv6ZCpoPjChqcm7XaetboiWDisJ42smzR#encryption',
      ],
      service: [
        {
          id: 'did:kilt:light:014rmqfMwFrv9mhwJwMb1vGWcmKmCNTRM8J365TRsJuPzXDNGF:3nCdN4Pm2E11EsvuHFWcHY4c82dCFRxZP7MYtJD6ctPRrXzup7Cv8Wap18LHQaJYDnbvFdXQrpYjuXsoxKb2PhKXujiGAE5pFDyFGKjL8AJLGB2hXGSZyarmzeqjjYmEHSuHgCfH1cYPRHRCUaEAtehQvv6ZCpoPjChqcm7XaetboiWDisJ42smzR#id-1',
          type: ['type-1'],
          serviceEndpoint: ['url-1'],
        },
        {
          id: 'did:kilt:light:014rmqfMwFrv9mhwJwMb1vGWcmKmCNTRM8J365TRsJuPzXDNGF:3nCdN4Pm2E11EsvuHFWcHY4c82dCFRxZP7MYtJD6ctPRrXzup7Cv8Wap18LHQaJYDnbvFdXQrpYjuXsoxKb2PhKXujiGAE5pFDyFGKjL8AJLGB2hXGSZyarmzeqjjYmEHSuHgCfH1cYPRHRCUaEAtehQvv6ZCpoPjChqcm7XaetboiWDisJ42smzR#id-2',
          type: ['type-2'],
          serviceEndpoint: ['url-2'],
        },
      ],
    })
  })

  it('exports the expected application/json W3C DID Document with an Sr25519 authentication key', () => {
    authenticationDidKeyDetails = {
      publicKey: authPublicKey,
      type: 'sr25519',
    }
    const didCreationDetails: LightDidDetailsCreationOpts = {
      authenticationKey: authenticationDidKeyDetails,
    }
    const didDetails = new LightDidDetails(didCreationDetails)
    const didDoc = exportToDidDocument(didDetails, 'application/json')

    expect(didDoc).toStrictEqual({
      id: 'did:kilt:light:004rmqfMwFrv9mhwJwMb1vGWcmKmCNTRM8J365TRsJuPzXDNGF',
      verificationMethod: [
        {
          id: 'did:kilt:light:004rmqfMwFrv9mhwJwMb1vGWcmKmCNTRM8J365TRsJuPzXDNGF#authentication',
          controller:
            'did:kilt:light:004rmqfMwFrv9mhwJwMb1vGWcmKmCNTRM8J365TRsJuPzXDNGF',
          type: 'Sr25519VerificationKey2020',
          publicKeyBase58: 'CVDFLCAjXhVWiPXH9nTCTpCgVzmDVoiPzNJYuccr1dqB',
        },
      ],
      authentication: [
        'did:kilt:light:004rmqfMwFrv9mhwJwMb1vGWcmKmCNTRM8J365TRsJuPzXDNGF#authentication',
      ],
    })
  })

  it('exports the expected application/ld+json W3C DID Document with only an authentication key', () => {
    authenticationDidKeyDetails = {
      publicKey: authPublicKey,
      type: 'sr25519',
    }
    const didCreationDetails: LightDidDetailsCreationOpts = {
      authenticationKey: authenticationDidKeyDetails,
    }
    const didDetails = new LightDidDetails(didCreationDetails)
    const didDoc = exportToDidDocument(didDetails, 'application/ld+json')

    expect(didDoc).toStrictEqual({
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: 'did:kilt:light:004rmqfMwFrv9mhwJwMb1vGWcmKmCNTRM8J365TRsJuPzXDNGF',
      verificationMethod: [
        {
          id: 'did:kilt:light:004rmqfMwFrv9mhwJwMb1vGWcmKmCNTRM8J365TRsJuPzXDNGF#authentication',
          controller:
            'did:kilt:light:004rmqfMwFrv9mhwJwMb1vGWcmKmCNTRM8J365TRsJuPzXDNGF',
          type: 'Sr25519VerificationKey2020',
          publicKeyBase58: 'CVDFLCAjXhVWiPXH9nTCTpCgVzmDVoiPzNJYuccr1dqB',
        },
      ],
      authentication: [
        'did:kilt:light:004rmqfMwFrv9mhwJwMb1vGWcmKmCNTRM8J365TRsJuPzXDNGF#authentication',
      ],
    })
  })

  it('does not export a DID Document with an unsupported format', () => {
    const didCreationDetails: LightDidDetailsCreationOpts = {
      authenticationKey: authenticationDidKeyDetails,
    }
    const didDetails = new LightDidDetails(didCreationDetails)
    expect(() => exportToDidDocument(didDetails, 'text/html')).toThrow()
  })
})
