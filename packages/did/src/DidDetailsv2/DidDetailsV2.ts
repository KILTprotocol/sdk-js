/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { DidDocumentV2, KeyRelationship } from '@kiltprotocol/types'

/**
 * Possible types for a DID verification key.
 */
const verificationKeyTypesC = ['sr25519', 'ed25519', 'ecdsa'] as const
export const verificationKeyTypes = verificationKeyTypesC as unknown as string[]
export type VerificationKeyType = typeof verificationKeyTypesC[number]
// `as unknown as string[]` is a workaround for https://github.com/microsoft/TypeScript/issues/26255

/**
 * Currently, a light DID does not support the use of an ECDSA key as its authentication key.
 */
export type LightDidSupportedVerificationKeyType = Extract<
  VerificationKeyType,
  'ed25519' | 'sr25519'
>

/**
 * Subset of key relationships which pertain to key agreement/encryption keys.
 */
export type EncryptionKeyRelationship = Extract<KeyRelationship, 'keyAgreement'>

/**
 * Possible types for a DID encryption key.
 */
const encryptionKeyTypesC = ['x25519'] as const
export const encryptionKeyTypes = encryptionKeyTypesC as unknown as string[]
export type EncryptionKeyType = typeof encryptionKeyTypesC[number]

export type DidKeyType = VerificationKeyType | EncryptionKeyType

export type NewVerificationMethod = Omit<
  DidDocumentV2.VerificationMethod,
  'controller'
> & {
  id: DidDocumentV2.UriFragment
}

export type NewServiceEndpoint = DidDocumentV2.Service
