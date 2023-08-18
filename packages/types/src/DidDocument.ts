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
 * The fragment part of the DID URI including the `#` character.
 */
export type RelativeDidUrl = `#${string}`

/**
 * A string containing a KILT DID URL according to the [DID URL syntax](https://www.w3.org/TR/did-core/#did-url-syntax).
 * In out case, this is just `DID#fragment`.
 */
export type DidUrl = `${Did}${RelativeDidUrl}`

/**
 * A string containing a URI according to [RFC3986](https://www.rfc-editor.org/rfc/rfc3986).
 */
export type Uri = string

/**
 * A KILT Web3name.
 */
export type Web3Name = `w3n:${string}`

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

export type DidVerificationMethodType =
  | 'Ed25519VerificationKey2018'
  | 'Sr25519VerificationKey2020'
  | 'EcdsaSecp256k1VerificationKey2019'
  | 'X25519KeyAgreementKey2019'

export const verificationKeyTypesMap: Record<
  VerificationKeyType,
  DidVerificationMethodType
> = {
  // proposed and used by dock.io, e.g. https://github.com/w3c-ccg/security-vocab/issues/32, https://github.com/docknetwork/sdk/blob/9c818b03bfb4fdf144c20678169c7aad3935ad96/src/utils/vc/contexts/security_context.js
  sr25519: 'Sr25519VerificationKey2020',
  // these are part of current w3 security vocab, see e.g. https://www.w3.org/ns/did/v1
  ed25519: 'Ed25519VerificationKey2018',
  ecdsa: 'EcdsaSecp256k1VerificationKey2019',
}

export const reverseVerificationKeyTypesMap: Record<
  DidVerificationMethodType,
  VerificationKeyType | EncryptionKeyType
> = {
  Sr25519VerificationKey2020: 'sr25519',
  Ed25519VerificationKey2018: 'ed25519',
  EcdsaSecp256k1VerificationKey2019: 'ecdsa',
  X25519KeyAgreementKey2019: 'x25519',
}

export type DidVerificationMethod = {
  id: DidUrl
  controller: Did
  type: DidVerificationMethodType
  publicKeyMultibase: string
}

export type DidService = {
  id: DidUrl
  type: string[]
  serviceEndpoint: Uri[]
}

export interface DidDocument {
  id: Did
  alsoKnownAs?: Uri[]
  verificationMethod?: DidVerificationMethod[]
  authentication?: RelativeDidUrl[]
  assertionMethod?: RelativeDidUrl[]
  keyAgreement?: RelativeDidUrl[]
  capabilityInvocation?: RelativeDidUrl[]
  capabilityDelegation?: RelativeDidUrl[]
  service?: DidService[]
}

/**
 * A JSON+LD DID Document that extends a traditional DID Document with additional semantic information.
 */
export interface JsonLDDidDocument extends DidDocument {
  '@context': string[]
}

/**
 * A signature issued with a DID associated key, indicating which key was used to sign.
 */
export type DidSignature = {
  verificationMethodUrl: DidVerificationMethod['id']
  signature: string
}
