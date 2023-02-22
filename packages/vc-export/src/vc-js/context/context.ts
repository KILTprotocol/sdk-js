/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

export const context = {
  '@context': {
    '@version': 1.1,
    '@protected': true,
    cred: 'https://www.w3.org/2018/credentials#',
    kiltCred: 'https://www.kilt.io/contexts/credentials#',
    sec: 'https://w3id.org/security#',
    xsd: 'http://www.w3.org/2001/XMLSchema#',
    verificationMethod: {
      '@id': 'sec:verificationMethod',
      '@type': '@id',
    },
    publicKeyHex: {
      '@id': 'sec:publicKeyHex',
    },
    proofPurpose: {
      '@id': 'sec:proofPurpose',
      '@type': '@vocab',
      '@context': {
        '@vocab': 'sec',
      },
    },
    KiltCredential2020: {
      '@id': 'kiltCred:KiltCredential',
      '@context': {
        '@version': 1.1,
        '@protected': true,
        delegationId: {
          '@id': 'kiltCred:delegationId',
        },
        legitimationIds: {
          '@id': 'kiltCred:legitimationIds',
          '@type': '@id',
          '@container': '@set',
        },
        nonTransferable: {
          '@id': 'cred:nonTransferable',
          '@type': 'xsd:boolean',
        },
      },
    },
    KILTSelfSigned2020: {
      '@id': 'kiltCred:KILTSelfSigned2020',
      '@context': {
        '@version': 1.1,
        '@protected': true,
        signature: 'sec:proofValue',
      },
    },
    Ed25519VerificationKey2018: 'sec:Ed25519VerificationKey2018',
    KILTAttestation2020: {
      '@id': 'kiltCred:KILTAttestation2020',
      '@context': {
        '@version': 1.1,
        '@protected': true,
        attester: 'cred:issuer',
      },
    },
    KILTCredentialDigest2020: {
      '@id': 'kiltCred:KILTCredentialDigest2020',
      '@context': {
        '@version': 1.1,
        '@protected': true,
        claimHashes: {
          '@id': 'kiltCred:KILTCredentialDigest2020#claimHashes',
          '@container': '@set',
        },
        nonces: {
          '@id': 'kiltCred:KILTCredentialDigest2020#nonces',
          '@container': '@index',
        },
      },
    },
  },
}
