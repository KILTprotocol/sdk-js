/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * IPFS URL identifying a JSON-LD context file describing terms used in DID documents of the KILT method that are not defined in the W3C DID core context.
 * Should be the second entry in the ordered set of contexts after [[W3C_DID_CONTEXT_URL]] in the JSON-LD representation of a KILT DID document.
 */
export const KILT_DID_CONTEXT_URL =
  'ipfs://bafybeicvyhf3mcmbc4gupvrip5iekntsyrl5326qxoedagzqbvlc4ktqp4'
/**
 * URL identifying the JSON-LD context file that is part of the W3C DID core specifications describing the terms defined by the core data model.
 * Must be the first entry in the ordered set of contexts in a JSON-LD representation of a DID document.
 * See https://www.w3.org/TR/did-core/#json-ld.
 */
export const W3C_DID_CONTEXT_URL = 'https://www.w3.org/ns/did/v1'
/**
 * URL identifying a JSON-LD context file proposed by the W3C Credentials Community Group defining a number of terms which are used in verification methods on KILT DID documents.
 * See https://w3c-ccg.github.io/security-vocab/.
 * This document is extended by the context file available under the [[KILT_DID_CONTEXT_URL]].
 */
export const W3C_SECURITY_CONTEXT_URI = 'https://w3id.org/security/v2'
/**
 * An object containing static copies of JSON-LD context files relevant to KILT DID documents, of the form <context URL> -> context.
 * These context definitions are not supposed to change; therefore, a cached version can (and should) be used to avoid unexpected changes in definitions.
 */
export const DID_CONTEXTS = {
  [KILT_DID_CONTEXT_URL]: {
    '@context': [
      W3C_SECURITY_CONTEXT_URI,
      {
        '@protected': true,
        KiltPublishedCredentialCollectionV1:
          'https://github.com/KILTprotocol/spec-KiltPublishedCredentialCollectionV1',
        Sr25519VerificationKey2020:
          'https://github.com/KILTprotocol/spec-kilt-did#sr25519',
      },
    ],
  },
  [W3C_DID_CONTEXT_URL]: {
    '@context': {
      '@protected': true,
      id: '@id',
      type: '@type',

      alsoKnownAs: {
        '@id': 'https://www.w3.org/ns/activitystreams#alsoKnownAs',
        '@type': '@id',
      },
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
      capabilityDelegation: {
        '@id': 'https://w3id.org/security#capabilityDelegationMethod',
        '@type': '@id',
        '@container': '@set',
      },
      capabilityInvocation: {
        '@id': 'https://w3id.org/security#capabilityInvocationMethod',
        '@type': '@id',
        '@container': '@set',
      },
      controller: {
        '@id': 'https://w3id.org/security#controller',
        '@type': '@id',
      },
      keyAgreement: {
        '@id': 'https://w3id.org/security#keyAgreementMethod',
        '@type': '@id',
        '@container': '@set',
      },
      service: {
        '@id': 'https://www.w3.org/ns/did#service',
        '@type': '@id',
        '@context': {
          '@protected': true,
          id: '@id',
          type: '@type',
          serviceEndpoint: {
            '@id': 'https://www.w3.org/ns/did#serviceEndpoint',
            '@type': '@id',
          },
        },
      },
      verificationMethod: {
        '@id': 'https://w3id.org/security#verificationMethod',
        '@type': '@id',
      },
    },
  },
  [W3C_SECURITY_CONTEXT_URI]: {
    '@context': [
      {
        '@version': 1.1,
      },
      'https://w3id.org/security/v1',
      {
        AesKeyWrappingKey2019: 'sec:AesKeyWrappingKey2019',
        DeleteKeyOperation: 'sec:DeleteKeyOperation',
        DeriveSecretOperation: 'sec:DeriveSecretOperation',
        EcdsaSecp256k1Signature2019: 'sec:EcdsaSecp256k1Signature2019',
        EcdsaSecp256r1Signature2019: 'sec:EcdsaSecp256r1Signature2019',
        EcdsaSecp256k1VerificationKey2019:
          'sec:EcdsaSecp256k1VerificationKey2019',
        EcdsaSecp256r1VerificationKey2019:
          'sec:EcdsaSecp256r1VerificationKey2019',
        Ed25519Signature2018: 'sec:Ed25519Signature2018',
        Ed25519VerificationKey2018: 'sec:Ed25519VerificationKey2018',
        EquihashProof2018: 'sec:EquihashProof2018',
        ExportKeyOperation: 'sec:ExportKeyOperation',
        GenerateKeyOperation: 'sec:GenerateKeyOperation',
        KmsOperation: 'sec:KmsOperation',
        RevokeKeyOperation: 'sec:RevokeKeyOperation',
        RsaSignature2018: 'sec:RsaSignature2018',
        RsaVerificationKey2018: 'sec:RsaVerificationKey2018',
        Sha256HmacKey2019: 'sec:Sha256HmacKey2019',
        SignOperation: 'sec:SignOperation',
        UnwrapKeyOperation: 'sec:UnwrapKeyOperation',
        VerifyOperation: 'sec:VerifyOperation',
        WrapKeyOperation: 'sec:WrapKeyOperation',
        X25519KeyAgreementKey2019: 'sec:X25519KeyAgreementKey2019',

        allowedAction: 'sec:allowedAction',
        assertionMethod: {
          '@id': 'sec:assertionMethod',
          '@type': '@id',
          '@container': '@set',
        },
        authentication: {
          '@id': 'sec:authenticationMethod',
          '@type': '@id',
          '@container': '@set',
        },
        capability: { '@id': 'sec:capability', '@type': '@id' },
        capabilityAction: 'sec:capabilityAction',
        capabilityChain: {
          '@id': 'sec:capabilityChain',
          '@type': '@id',
          '@container': '@list',
        },
        capabilityDelegation: {
          '@id': 'sec:capabilityDelegationMethod',
          '@type': '@id',
          '@container': '@set',
        },
        capabilityInvocation: {
          '@id': 'sec:capabilityInvocationMethod',
          '@type': '@id',
          '@container': '@set',
        },
        caveat: { '@id': 'sec:caveat', '@type': '@id', '@container': '@set' },
        challenge: 'sec:challenge',
        ciphertext: 'sec:ciphertext',
        controller: { '@id': 'sec:controller', '@type': '@id' },
        delegator: { '@id': 'sec:delegator', '@type': '@id' },
        equihashParameterK: {
          '@id': 'sec:equihashParameterK',
          '@type': 'xsd:integer',
        },
        equihashParameterN: {
          '@id': 'sec:equihashParameterN',
          '@type': 'xsd:integer',
        },
        invocationTarget: { '@id': 'sec:invocationTarget', '@type': '@id' },
        invoker: { '@id': 'sec:invoker', '@type': '@id' },
        jws: 'sec:jws',
        keyAgreement: {
          '@id': 'sec:keyAgreementMethod',
          '@type': '@id',
          '@container': '@set',
        },
        kmsModule: { '@id': 'sec:kmsModule' },
        parentCapability: { '@id': 'sec:parentCapability', '@type': '@id' },
        plaintext: 'sec:plaintext',
        proof: { '@id': 'sec:proof', '@type': '@id', '@container': '@graph' },
        proofPurpose: { '@id': 'sec:proofPurpose', '@type': '@vocab' },
        proofValue: 'sec:proofValue',
        referenceId: 'sec:referenceId',
        unwrappedKey: 'sec:unwrappedKey',
        verificationMethod: { '@id': 'sec:verificationMethod', '@type': '@id' },
        verifyData: 'sec:verifyData',
        wrappedKey: 'sec:wrappedKey',
      },
    ],
  },
}
