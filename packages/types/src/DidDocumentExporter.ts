/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @packageDocumentation
 * @module IDidDocumentExporter
 */

import type { IDidDetails, DidServiceEndpoint } from './DidDetails'

export enum DidDocumentPublicKeyType {
  Ed25519VerificationKey = 'Ed25519VerificationKey2018',
  Sr25519VerificationKey = 'Sr25519VerificationKey2020',
  EcdsaVerificationKey = 'EcdsaSecp256k1VerificationKey2019',
  X25519EncryptionKey = 'X25519KeyAgreementKey2019',
}

export const VerificationKeyTypesMap = {
  // proposed and used by dock.io, e.g. https://github.com/w3c-ccg/security-vocab/issues/32, https://github.com/docknetwork/sdk/blob/9c818b03bfb4fdf144c20678169c7aad3935ad96/src/utils/vc/contexts/security_context.js
  sr25519: DidDocumentPublicKeyType.Sr25519VerificationKey,
  // these are part of current w3 security vocab, see e.g. https://www.w3.org/ns/did/v1
  ed25519: DidDocumentPublicKeyType.Ed25519VerificationKey,
  ecdsa: DidDocumentPublicKeyType.EcdsaVerificationKey,
}

export const EncryptionKeyTypesMap = {
  x25519: DidDocumentPublicKeyType.X25519EncryptionKey,
}

export type DidPublicKey = {
  id: string
  controller: IDidDetails['did']
  publicKeyBase58: string
  type: DidDocumentPublicKeyType
}

// Transform the internal IDidServiceEndpoint into something compliant with the DID spec.
export type DidPublicServiceEndpoint = {
  id: string
  type: DidServiceEndpoint['types']
  serviceEndpoint: DidServiceEndpoint['urls']
}

/**
 * A DID Document according to the [W3C DID Core specification](https://www.w3.org/TR/did-core/).
 */
export type DidDocument = {
  id: IDidDetails['did']
  verificationMethod: DidPublicKey[]
  authentication: DidPublicKey['id']
  assertionMethod?: DidPublicKey['id']
  keyAgreement?: DidPublicKey['id']
  capabilityDelegation?: DidPublicKey['id']
  service?: DidPublicServiceEndpoint[]
}

/**
 * A JSON+LD DID Document that extends a traditional DID Document with additional semantic informatiion.
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
