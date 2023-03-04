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
    verificationMethod: {
      '@id': 'sec:verificationMethod',
      '@type': '@id',
    },
    proofPurpose: {
      '@id': 'sec:proofPurpose',
      '@type': '@vocab',
      '@context': {
        '@vocab': 'sec',
      },
    },
    KiltCredentialV1: {
      '@id': 'kilt:KiltCredential',
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
        revealProof: { '@id': 'kilt:salt', '@container': '@list' },
      },
    },
  },
}
