/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { KiltAddress } from './Address'

type AuthenticationKeyType = '00' | '01'
type DidUriVersion = '' | `v${string}:`
type LightDidEncodedData = '' | `:${string}`

/**
 * A string containing a KILT DID Uri.
 */
export type DidUri =
  | `did:kilt:${DidUriVersion}${KiltAddress}`
  | `did:kilt:light:${DidUriVersion}${AuthenticationKeyType}${KiltAddress}${LightDidEncodedData}`

/**
 * The fragment part of the DID URI including the `#` character.
 */
export type UriFragment = `#${string}`

/**
 * URL for DID resources like keys or services.
 */
export type DidUrl = `${DidUri}${UriFragment}`

export type SignatureVerificationRelationship =
  | 'authentication'
  | 'capabilityDelegation'
  | 'assertionMethod'
export type EncryptionRelationship = 'keyAgreement'

export type VerificationRelationship =
  | SignatureVerificationRelationship
  | EncryptionRelationship

type Base58BtcMultibaseString = `z${string}`

/**
 * The verification method of a DID.
 */
export type VerificationMethod = {
  /**
   * The relative identifier (i.e., `#<id>`) of the verification method.
   */
  id: UriFragment
  /**
   * The type of the verification method. This is fixed for KILT DIDs.
   */
  type: 'MultiKey'
  /**
   * The controller of the verification method.
   */
  controller: DidUri
  /*
   * The multicodec-prefixed, multibase-encoded verification method's public key.
   */
  publicKeyMultibase: Base58BtcMultibaseString
}

/*
 * The service of a KILT DID.
 */
export type Service = {
  /*
   * The relative identifier (i.e., `#<id>`) of the verification method.
   */
  id: UriFragment
  /*
   * The set of service types.
   */
  type: string[]
  /*
   * A list of URIs the endpoint exposes its services at.
   */
  serviceEndpoint: string[]
}

export type DidDocument = {
  id: DidUri
  alsoKnownAs?: string[]
  verificationMethod?: VerificationMethod[]
  authentication?: UriFragment[]
  assertionMethod?: UriFragment[]
  keyAgreement?: UriFragment[]
  capabilityDelegation?: UriFragment[]
  service?: Service[]
}

export type JsonLd<T> = T & { '@context': string[] }
