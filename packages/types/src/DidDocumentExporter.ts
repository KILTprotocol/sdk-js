/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import {
  IDidDetails,
  DidServiceEndpoint,
  VerificationKeyType,
  EncryptionKeyType,
  DidUri,
} from './DidDetails.js'

export enum DidDocumentPublicKeyType {
  Ed25519VerificationKey = 'Ed25519VerificationKey2018',
  Sr25519VerificationKey = 'Sr25519VerificationKey2020',
  EcdsaVerificationKey = 'EcdsaSecp256k1VerificationKey2019',
  X25519EncryptionKey = 'X25519KeyAgreementKey2019',
}

export const VerificationKeyTypesMap: Record<
  VerificationKeyType,
  DidDocumentPublicKeyType
> = {
  // proposed and used by dock.io, e.g. https://github.com/w3c-ccg/security-vocab/issues/32, https://github.com/docknetwork/sdk/blob/9c818b03bfb4fdf144c20678169c7aad3935ad96/src/utils/vc/contexts/security_context.js
  [VerificationKeyType.Sr25519]:
    DidDocumentPublicKeyType.Sr25519VerificationKey,
  // these are part of current w3 security vocab, see e.g. https://www.w3.org/ns/did/v1
  [VerificationKeyType.Ed25519]:
    DidDocumentPublicKeyType.Ed25519VerificationKey,
  [VerificationKeyType.Ecdsa]: DidDocumentPublicKeyType.EcdsaVerificationKey,
}

export const EncryptionKeyTypesMap: Record<
  EncryptionKeyType,
  DidDocumentPublicKeyType
> = {
  [EncryptionKeyType.X25519]: DidDocumentPublicKeyType.X25519EncryptionKey,
}

/**
 * URI for DID resources like public keys or service endpoints.
 */
export type DidResourceUri = `${DidUri}#${string}`

/**
 * A spec-compliant description of a DID key.
 */
export type DidPublicKey = {
  /**
   * The full key URI, in the form of <did_subject>#<key_identifier>.
   */
  uri: DidResourceUri
  /**
   * The key controller, in the form of <did_subject>.
   */
  controller: IDidDetails['uri']
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
export type DidPublicServiceEndpoint = {
  /**
   * The full service URI, in the form of <did_subject>#<service_identifier>.
   */
  uri: DidResourceUri
  /**
   * The set of types for this endpoint.
   */
  type: DidServiceEndpoint['types']
  /**
   * The set of services exposed by this endpoint.
   */
  serviceEndpoint: DidServiceEndpoint['urls']
}

/**
 * A DID Document according to the [W3C DID Core specification](https://www.w3.org/TR/did-core/).
 */
export type DidDocument = {
  id: IDidDetails['uri']
  verificationMethod: DidPublicKey[]
  authentication: DidPublicKey['uri']
  assertionMethod?: DidPublicKey['uri']
  keyAgreement?: DidPublicKey['uri']
  capabilityDelegation?: DidPublicKey['uri']
  service?: DidPublicServiceEndpoint[]
}

/**
 * A JSON+LD DID Document that extends a traditional DID Document with additional semantic information.
 */
export type JsonLDDidDocument = DidDocument & { '@context': string[] }

/**
 * An interface for any DID Document exporter to implement.
 *
 * It is purposefully general with regard to the mime types supported, so that multiple exporters might support different encoding types.
 */
export interface IDidDocumentExporter {
  exportToDidDocument: (details: IDidDetails, mimeType: string) => DidDocument
}
