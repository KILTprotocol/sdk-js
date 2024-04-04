/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { KiltAddress } from './Address'

type AuthenticationKeyType = '00' | '01'
type DidVersion = '' | `v${string}:`
type LightDidDocumentEncodedData = '' | `:${string}`

/**
 * A string containing a KILT DID.
 */
export type Did =
  | `did:kilt:${DidVersion}${KiltAddress}`
  | `did:kilt:light:${DidVersion}${AuthenticationKeyType}${KiltAddress}${LightDidDocumentEncodedData}`

/**
 * The fragment part of the DID including the `#` character.
 */
export type UriFragment = `#${string}`

/**
 * URL for DID resources like keys or services.
 */
export type DidUrl =
  | `${Did}${UriFragment}`
  // Very broad type definition, mostly for the compiler. Actual regex matching for query params is done where needed.
  | `${Did}?{string}${UriFragment}`

export type SignatureVerificationRelationship =
  | 'authentication'
  | 'capabilityDelegation'
  | 'assertionMethod'
export type EncryptionRelationship = 'keyAgreement'

export type VerificationRelationship =
  | SignatureVerificationRelationship
  | EncryptionRelationship

export type DidSignature = {
  // Name `keyUri` kept for retro-compatibility
  keyUri: DidUrl
  signature: string
}

type Base58BtcMultibaseString = `z${string}`

/**
 * The verification method of a DID.
 */
export type VerificationMethod<IdType extends string = DidUrl> = {
  /**
   * The identifier (DID + fragment, `#<id>`) of the verification method.
   */
  id: IdType
  /**
   * The type of the verification method. This is fixed for KILT DIDs.
   */
  type: 'Multikey'
  /**
   * The controller of the verification method.
   */
  controller: Did
  /*
   * The multicodec-prefixed, multibase-encoded verification method's public key.
   */
  publicKeyMultibase: Base58BtcMultibaseString
}

/*
 * The service of a KILT DID.
 */
export type Service<IdType extends string = DidUrl> = {
  /*
   * The identifier (DID + fragment, i.e., `#<id>`) of the verification method.
   */
  id: IdType
  /*
   * The set of service types.
   */
  type: string[]
  /*
   * A list of URIs the endpoint exposes its services at.
   */
  serviceEndpoint: string[]
}

export type DidDocument<IdType extends string = DidUrl> = {
  id: Did
  alsoKnownAs?: string[]
  verificationMethod?: Array<VerificationMethod<IdType>>
  authentication?: IdType[]
  assertionMethod?: IdType[]
  keyAgreement?: IdType[]
  capabilityDelegation?: IdType[]
  service?: Array<Service<IdType>>
}

export type JsonLd<T> = T & { '@context': string[] }
