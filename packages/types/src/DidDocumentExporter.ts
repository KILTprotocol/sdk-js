/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import {
  DidServiceEndpoint,
  VerificationKeyType,
  EncryptionKeyType,
  DidUri,
  DidVerificationKey,
  DidEncryptionKey,
} from './DidDetails.js'

export type DidDocumentPublicKeyType =
  | 'Ed25519VerificationKey2018'
  | 'Sr25519VerificationKey2020'
  | 'EcdsaSecp256k1VerificationKey2019'
  | 'X25519KeyAgreementKey2019'

export const VerificationKeyTypesMap: Record<
  VerificationKeyType,
  DidDocumentPublicKeyType
> = {
  // proposed and used by dock.io, e.g. https://github.com/w3c-ccg/security-vocab/issues/32, https://github.com/docknetwork/sdk/blob/9c818b03bfb4fdf144c20678169c7aad3935ad96/src/utils/vc/contexts/security_context.js
  sr25519: 'Sr25519VerificationKey2020',
  // these are part of current w3 security vocab, see e.g. https://www.w3.org/ns/did/v1
  ed25519: 'Ed25519VerificationKey2018',
  ecdsa: 'EcdsaSecp256k1VerificationKey2019',
}

export const EncryptionKeyTypesMap: Record<
  EncryptionKeyType,
  DidDocumentPublicKeyType
> = {
  x25519: 'X25519KeyAgreementKey2019',
}

/**
 * The fragment part of the DID URI including the `#` character.
 */
export type UriFragment = `#${string}`

/**
 * URI for DID resources like public keys or service endpoints.
 */
export type DidResourceUri = `${DidUri}${UriFragment}`

/**
 * A spec-compliant description of a DID key.
 */
export type DidPublicKey = {
  /**
   * The full key URI, in the form of <did_subject>#<key_identifier>.
   */
  id: DidResourceUri
  /**
   * The key controller, in the form of <did_subject>.
   */
  controller: DidUri
  /**
   * The base58-encoded public component of the key.
   */
  publicKeyBase58: string
  /**
   * The signing/encryption algorithm type where the key can be used.
   */
  type: DidDocumentPublicKeyType
}

/**
 * A spec-compliant description of a DID endpoint.
 */
export type DidPublicServiceEndpoint = Omit<DidServiceEndpoint, 'id'> & {
  /**
   * The full service URI, in the form of <did_subject>#<service_identifier>.
   */
  id: DidResourceUri
}

/**
 * A DID Document according to the [W3C DID Core specification](https://www.w3.org/TR/did-core/).
 */
export type DidDocument = {
  id: DidUri
  verificationMethod: DidPublicKey[]
  authentication: [DidVerificationKey['id']]
  assertionMethod?: [DidVerificationKey['id']]
  keyAgreement?: [DidEncryptionKey['id']]
  capabilityDelegation?: [DidVerificationKey['id']]
  service?: DidPublicServiceEndpoint[]
}

/**
 * A JSON+LD DID Document that extends a traditional DID Document with additional semantic information.
 */
export type JsonLDDidDocument = DidDocument & { '@context': string[] }
