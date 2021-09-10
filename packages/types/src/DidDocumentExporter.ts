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

import type { IDidDetails, IDidKeyDetails, IServiceDetails } from '.'

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

export type IDidPublicKeyDetails = Pick<IDidKeyDetails, 'id' | 'controller'> & {
  publicKeyBase58: string
  type: DidDocumentPublicKeyType
}

export type IDidPublicKeyId = Pick<IDidKeyDetails, 'id'>

export type IDidDocument = {
  id: IDidDetails['did']
  verificationMethod: IDidPublicKeyDetails[]
  authentication: IDidPublicKeyId[]
  assertionMethod?: IDidPublicKeyId[]
  keyAgreement?: IDidPublicKeyId[]
  capabilityDelegation?: IDidPublicKeyId[]
  service?: IServiceDetails[]
}

export type IJsonLDDidDocument = IDidDocument & { '@context': string[] }

export interface IDidDocumentExporter {
  exportToDidDocument: (details: IDidDetails, mimeType: string) => IDidDocument
}
