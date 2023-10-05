/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { DidDocumentV2 } from '@kiltprotocol/types'
import { didKeyToVerificationMethod } from '../Did2.utils.js'

/**
 * Possible types for a DID verification key.
 */
const verificationKeyTypesC = ['sr25519', 'ed25519', 'ecdsa'] as const
export const verificationKeyTypes = verificationKeyTypesC as unknown as string[]
export type DidVerificationKeyType = typeof verificationKeyTypesC[number]
// `as unknown as string[]` is a workaround for https://github.com/microsoft/TypeScript/issues/26255

/**
 * Possible types for a DID encryption key.
 */
const encryptionKeyTypesC = ['x25519'] as const
export const encryptionKeyTypes = encryptionKeyTypesC as unknown as string[]
export type DidEncryptionKeyType = typeof encryptionKeyTypesC[number]

export type DidKeyType = DidVerificationKeyType | DidEncryptionKeyType

export type NewVerificationMethod = Omit<
  DidDocumentV2.VerificationMethod,
  'controller'
>
export type NewService = DidDocumentV2.Service

/**
 * Type of a new key material to add under a DID.
 */
export type BaseNewDidKey = {
  publicKey: Uint8Array
  type: string
}

/**
 * Type of a new verification key to add under a DID.
 */
export type NewDidVerificationKey = BaseNewDidKey & {
  type: DidVerificationKeyType
}

/**
 * Type of a new encryption key to add under a DID.
 */
export type NewDidEncryptionKey = BaseNewDidKey & {
  type: DidEncryptionKeyType
}

function addVerificationMethod(
  didDocument: DidDocumentV2.DidDocument,
  verificationMethod: DidDocumentV2.VerificationMethod,
  relationship: DidDocumentV2.VerificationMethodRelationship
): void {
  const existingRelationship = didDocument[relationship] ?? []
  existingRelationship.push(verificationMethod.id)
  // eslint-disable-next-line no-param-reassign
  didDocument[relationship] = existingRelationship
  didDocument.verificationMethod.push(verificationMethod)
}

export function addKeypairAsVerificationMethod(
  didDocument: DidDocumentV2.DidDocument,
  {
    id,
    publicKey,
    type: keyType,
  }: BaseNewDidKey & { id: DidDocumentV2.UriFragment },
  relationship: DidDocumentV2.VerificationMethodRelationship
): void {
  const verificationMethod = didKeyToVerificationMethod(didDocument.id, id, {
    keyType: keyType as DidKeyType,
    publicKey,
  })
  addVerificationMethod(didDocument, verificationMethod, relationship)
}
