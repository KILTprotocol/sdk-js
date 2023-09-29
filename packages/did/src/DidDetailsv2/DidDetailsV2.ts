/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { BN, DidDocumentV2, KeyRelationship } from '@kiltprotocol/types'

export type SignatureVerificationMethodRelationship =
  | 'authentication'
  | 'capabilityDelegation'
  | 'assertionMethod'
export type EncryptionMethodRelationship = 'keyAgreementKey'

export type VerificationMethodRelationship =
  SignatureVerificationMethodRelationship & EncryptionMethodRelationship

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

// /**
//  * The SDK-specific base details of a DID key.
//  */
// export type BaseDidKey = {
//   /**
//    * Relative key URI: `#` sign followed by fragment part of URI.
//    */
//   id: DidDocumentV2.UriFragment
//   /**
//    * The public key material.
//    */
//   publicKey: Uint8Array
//   /**
//    * The inclusion block of the key, if stored on chain.
//    */
//   includedAt?: BN
//   /**
//    * The type of the key.
//    */
//   type: string
// }

// /**
//  * Type of a new key material to add under a DID.
//  */
// export type BaseNewDidKey = {
//   publicKey: Uint8Array
//   type: string
// }

// /**
//  * Type of a new verification key to add under a DID.
//  */
// export type NewDidVerificationKey = BaseNewDidKey & {
//   type: VerificationKeyType
// }
// /**
//  * A new public key specified when creating a new light DID.
//  */
// export type NewLightDidVerificationKey = NewDidVerificationKey & {
//   type: LightDidSupportedVerificationKeyType
// }
// /**
//  * Type of a new encryption key to add under a DID.
//  */
// export type NewDidEncryptionKey = BaseNewDidKey & { type: EncryptionKeyType }
// /**
//  * The SDK-specific details of a DID verification key.
//  */
// export type DidVerificationKey = BaseDidKey & { type: VerificationKeyType }
// /**
//  * The SDK-specific details of a DID encryption key.
//  */
// export type DidEncryptionKey = BaseDidKey & { type: EncryptionKeyType }
// /**
//  * The SDK-specific details of a DID key.
//  */
// export type DidKey = DidVerificationKey | DidEncryptionKey

export type NewVerificationMethod = Omit<
  DidDocumentV2.VerificationMethod,
  'controller'
> & {
  id: DidDocumentV2.UriFragment
}

export type NewServiceEndpoint = DidDocumentV2.Service & {
  id: DidDocumentV2.UriFragment
}
