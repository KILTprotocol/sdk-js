/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import {
  DidEncryptionKey,
  DidResourceUri,
  DidServiceEndpoint,
  DidUri,
  DidVerificationKey,
  EncryptionKeyType,
  VerificationKeyType,
} from './DidDocument.js'

export type ConformingDidDocumentKeyType =
  | 'Ed25519VerificationKey2018'
  | 'Sr25519VerificationKey2020'
  | 'EcdsaSecp256k1VerificationKey2019'
  | 'X25519KeyAgreementKey2019'

export const verificationKeyTypesMap: Record<
  VerificationKeyType,
  ConformingDidDocumentKeyType
> = {
  // proposed and used by dock.io, e.g. https://github.com/w3c-ccg/security-vocab/issues/32, https://github.com/docknetwork/sdk/blob/9c818b03bfb4fdf144c20678169c7aad3935ad96/src/utils/vc/contexts/security_context.js
  sr25519: 'Sr25519VerificationKey2020',
  // these are part of current w3 security vocab, see e.g. https://www.w3.org/ns/did/v1
  ed25519: 'Ed25519VerificationKey2018',
  ecdsa: 'EcdsaSecp256k1VerificationKey2019',
}

export const encryptionKeyTypesMap: Record<
  EncryptionKeyType,
  ConformingDidDocumentKeyType
> = {
  x25519: 'X25519KeyAgreementKey2019',
}

/**
 * A spec-compliant description of a DID key.
 */
export type ConformingDidKey = {
  /**
   * The full key URI, in the form of <did>#<key_id>.
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
  type: ConformingDidDocumentKeyType
}

/**
 * A spec-compliant description of a DID endpoint.
 */
export type ConformingDidServiceEndpoint = Omit<DidServiceEndpoint, 'id'> & {
  /**
   * The full service URI, in the form of <did>#<service_id>.
   */
  id: DidResourceUri
}

/**
 * A DID Document according to the [W3C DID Core specification](https://www.w3.org/TR/did-core/).
 */
export type ConformingDidDocument = {
  id: DidUri
  verificationMethod: ConformingDidKey[]
  authentication: [DidVerificationKey['id']]
  assertionMethod?: [DidVerificationKey['id']]
  keyAgreement?: [DidEncryptionKey['id']]
  capabilityDelegation?: [DidVerificationKey['id']]
  service?: ConformingDidServiceEndpoint[]
}

/**
 * A JSON+LD DID Document that extends a traditional DID Document with additional semantic information.
 */
export type JsonLDDidDocument = ConformingDidDocument & { '@context': string[] }
