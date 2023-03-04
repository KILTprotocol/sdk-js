/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { KILT_CREDENTIAL_CONTEXT_URL } from '../../constants.js'

export const context = {
  '@context': {
    '@version': 1.1,
    '@protected': true,

    kilt: `${KILT_CREDENTIAL_CONTEXT_URL}#`,
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
  },
}
