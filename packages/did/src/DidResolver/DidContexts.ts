/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

// @ts-expect-error not a TS package
import securityContexts from '@digitalbazaar/security-context'

const securityContextsMap: Map<
  string,
  Record<string, unknown>
> = securityContexts.contexts

/**
 * IPFS URL identifying a JSON-LD context file describing terms used in DID documents of the KILT method that are not defined in the W3C DID core context.
 * Should be the second entry in the ordered set of contexts after [[W3C_DID_CONTEXT_URL]] in the JSON-LD representation of a KILT DID document.
 */
export const KILT_DID_CONTEXT_URL =
  'ipfs://QmU7QkuTCPz7NmD5bD7Z7mQVz2UsSPaEK58B5sYnjnPRNW'
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
export const W3C_SECURITY_CONTEXT_URL = securityContexts.SECURITY_CONTEXT_V2_URL
/**
 * An object containing static copies of JSON-LD context files relevant to KILT DID documents, of the form <context URL> -> context.
 * These context definitions are not supposed to change; therefore, a cached version can (and should) be used to avoid unexpected changes in definitions.
 */
export const DID_CONTEXTS = {
  [KILT_DID_CONTEXT_URL]: {
    '@context': [
      W3C_SECURITY_CONTEXT_URL,
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
  ...Object.fromEntries(securityContextsMap),
}
