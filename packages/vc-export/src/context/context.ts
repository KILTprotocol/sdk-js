/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { KiltCredentialV1 } from '@kiltprotocol/core'

export const context = {
  '@context': {
    '@version': 1.1,
    '@protected': true,

    kilt: `${KiltCredentialV1.CONTEXT_URL}#`,
    cred: 'https://www.w3.org/2018/credentials#',
    sec: 'https://w3id.org/security#',
    xsd: 'http://www.w3.org/2001/XMLSchema#',
    KiltCredentialV1: {
      '@id': 'kilt:KiltCredentialV1',
      '@context': {
        '@version': 1.1,
        '@protected': true,
        nonTransferable: {
          '@id': 'cred:nonTransferable',
          '@type': 'xsd:boolean',
        },
      },
    },
    KiltAttestationProofV1: {
      '@id': 'kilt:KiltAttestationProofV1',
      '@context': {
        '@version': 1.1,
        '@protected': true,

        id: '@id',
        type: '@type',

        block: { '@id': 'kilt:blockHash' },
        commitments: { '@id': 'kilt:commitments', '@container': '@set' },
        salt: { '@id': 'kilt:salt', '@container': '@list' },
      },
    },
    KiltRevocationStatusV1: {
      '@id': 'kilt:KiltRevocationStatusV1',
      '@context': {
        '@version': 1.1,
        '@protected': true,

        id: '@id',
        type: '@type',
      },
    },
    federatedTrustModel: {
      '@id': 'kilt:federatedTrustModel',
      '@type': '@id',
      '@container': '@set',
    },
    KiltAttesterLegitimationV1: {
      '@id': 'kilt:KiltAttesterLegitimationV1',
      '@context': {
        '@version': 1.1,
        '@protected': true,

        id: '@id',
        type: '@type',

        verifiableCredential: {
          '@id': 'cred:verifiableCredential',
          '@type': '@id',
          '@container': '@graph',
        },
      },
    },
    KiltAttesterDelegationV1: {
      '@id': 'kilt:KiltAttesterDelegationV1',
      '@context': {
        '@version': 1.1,
        '@protected': true,

        id: '@id',
        type: '@type',

        delegators: {
          '@id': 'kilt:delegators',
          '@type': '@id',
          '@container': '@list',
        },
      },
    },
    Sr25519Signature2020: {
      '@id': 'kilt:Sr25519Signature2020',
      '@context': {
        '@protected': true,
        id: '@id',
        type: '@type',
        challenge: 'https://w3id.org/security#challenge',
        created: {
          '@id': 'http://purl.org/dc/terms/created',
          '@type': 'http://www.w3.org/2001/XMLSchema#dateTime',
        },
        domain: 'https://w3id.org/security#domain',
        expires: {
          '@id': 'https://w3id.org/security#expiration',
          '@type': 'http://www.w3.org/2001/XMLSchema#dateTime',
        },
        nonce: 'https://w3id.org/security#nonce',
        proofPurpose: {
          '@id': 'https://w3id.org/security#proofPurpose',
          '@type': '@vocab',
          '@context': {
            '@protected': true,
            id: '@id',
            type: '@type',
            assertionMethod: {
              '@id': 'https://w3id.org/security#assertionMethod',
              '@type': '@id',
              '@container': '@set',
            },
            authentication: {
              '@id': 'https://w3id.org/security#authenticationMethod',
              '@type': '@id',
              '@container': '@set',
            },
            capabilityInvocation: {
              '@id': 'https://w3id.org/security#capabilityInvocationMethod',
              '@type': '@id',
              '@container': '@set',
            },
            capabilityDelegation: {
              '@id': 'https://w3id.org/security#capabilityDelegationMethod',
              '@type': '@id',
              '@container': '@set',
            },
            keyAgreement: {
              '@id': 'https://w3id.org/security#keyAgreementMethod',
              '@type': '@id',
              '@container': '@set',
            },
          },
        },
        jws: {
          '@id': 'https://w3id.org/security#jws',
        },
        verificationMethod: {
          '@id': 'https://w3id.org/security#verificationMethod',
          '@type': '@id',
        },
      },
    },
    JsonSchema2023: {
      '@id': 'https://www.w3.org/ns/credentials#JsonSchema2023',
      '@context': {
        '@version': 1.1,
        '@protected': true,

        id: '@id',
      },
    },
  },
}
