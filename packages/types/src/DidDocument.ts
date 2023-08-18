/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { KiltAddress } from './Address'

type AuthenticationKeyType = '00' | '01'
type DidVersion = '' | `v${string}:`
type LightDidEncodedData = '' | `:${string}`

// NOTICE: The following string pattern types must be kept in sync with regex patterns @kiltprotocol/did/Utils

/**
 * A string containing a KILT DID according to the [DID syntax](https://www.w3.org/TR/did-core/#did-syntax).
 */
export type Did =
  | `did:kilt:${DidVersion}${KiltAddress}`
  | `did:kilt:light:${DidVersion}${AuthenticationKeyType}${KiltAddress}${LightDidEncodedData}`

/**
 * A string containing a KILT DID URL according to the [DID URL syntax](https://www.w3.org/TR/did-core/#did-url-syntax).
 */
export type DidUrl = string

/**
 * A string containing a URI according to [RFC3986](https://www.rfc-editor.org/rfc/rfc3986).
 */
export type Uri = string

/**
 * The fragment part of the DID URI including the `#` character.
 */
export type UriFragment = `#${string}`
/**
 * URI for DID resources like keys or service endpoints.
 */
export type DidResourceUri = `${Did}${UriFragment}`

/**
 * A KILT Web3name.
 */
export type Web3Name = `w3n:${string}`

export type DidVerificationMethod = {
  id: DidUrl
  controller: Did
  type: string
  publicKeyMultibase: string
}

export type DidService = {
  id: Uri
  type: string[]
  serviceEndpoint: Uri[]
}

export interface DidDocument {
  id: Did
  alsoKnownAs?: Uri[]
  controller?: Did[]
  verificationMethod?: DidVerificationMethod[]
  authentication?: DidResourceUri[]
  assertionMethod?: DidResourceUri[]
  keyAgreement?: DidResourceUri[]
  capabilityInvocation?: DidResourceUri[]
  capabilityDelegation?: DidResourceUri[]
  service?: DidService[]
}

/**
 * DID keys are purpose-bound. Their role or purpose is indicated by the verification or key relationship type.
 */
const keyRelationshipsC = [
  'authentication',
  'capabilityDelegation',
  'capabilityInvocation',
  'assertionMethod',
  'keyAgreement',
] as const
export const keyRelationships = keyRelationshipsC as unknown as string[]
export type KeyRelationship = typeof keyRelationshipsC[number]

/**
 * Subset of key relationships which pertain to signing/verification keys.
 */
export type VerificationKeyRelationship = Extract<
  KeyRelationship,
  | 'authentication'
  | 'capabilityDelegation'
  | 'assertionMethod'
  | 'capabilityInvocation'
>

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
 * Possible types for a DID encryption key.
 */
const encryptionKeyTypesC = ['x25519'] as const
export const encryptionKeyTypes = encryptionKeyTypesC as unknown as string[]
export type EncryptionKeyType = typeof encryptionKeyTypesC[number]

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
  type: VerificationKeyType
}
/**
 * A new public key specified when creating a new light DID.
 */
export type NewLightDidVerificationKey = NewDidVerificationKey & {
  type: LightDidSupportedVerificationKeyType
}
/**
 * Type of a new encryption key to add under a DID.
 */
export type NewDidEncryptionKey = BaseNewDidKey & { type: EncryptionKeyType }

/**
 * A signature issued with a DID associated key, indicating which key was used to sign.
 */
export type DidSignature = {
  verificationMethodUrl: DidVerificationMethod['id']
  signature: string
}
