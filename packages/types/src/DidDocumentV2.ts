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
 * URI for DID resources like keys or service endpoints.
 */
export type DidResourceUri = `${DidUri}${UriFragment}`

export type SignatureVerificationMethodRelationship =
  | 'authentication'
  | 'capabilityDelegation'
  | 'assertionMethod'
export type EncryptionMethodRelationship = 'keyAgreementKey'

export type VerificationMethodRelationship =
  | SignatureVerificationMethodRelationship
  | EncryptionMethodRelationship

type Base58BtcMultibaseString = `z${string}`

/*
 * The verification method map MUST include the id, type, controller, and specific verification material properties that are determined by the value of type and are defined in 5.2.1 Verification Material. A verification method MAY include additional properties. Verification methods SHOULD be registered in the DID Specification Registries [DID-SPEC-REGISTRIES].
 */
export type VerificationMethod = {
  /*
   * The value of the id property for a verification method MUST be a string that conforms to the rules in Section 3.2 DID URL Syntax.
   */
  id: UriFragment
  /*
   * The value of the type property MUST be a string that references exactly one verification method type. In order to maximize global interoperability, the verification method type SHOULD be registered in the DID Specification Registries [DID-SPEC-REGISTRIES].
   */
  type: 'MultiKey'
  /*
   * The value of the controller property MUST be a string that conforms to the rules in 3.1 DID Syntax.
   */
  controller: DidUri
  /*
   * The publicKeyMultibase property is OPTIONAL. This feature is non-normative. If present, the value MUST be a string representation of a [MULTIBASE] encoded public key.
   */
  publicKeyMultibase: Base58BtcMultibaseString
}

/*
 * Each service map MUST contain id, type, and serviceEndpoint properties. Each service extension MAY include additional properties and MAY further restrict the properties associated with the extension.
 */
export type Service = {
  /*
   * The value of the id property MUST be a URI conforming to [RFC3986]. A conforming producer MUST NOT produce multiple service entries with the same id. A conforming consumer MUST produce an error if it detects multiple service entries with the same id.
   */
  id: UriFragment
  /*
   * The value of the type property MUST be a string or a set of strings. In order to maximize interoperability, the service type and its associated properties SHOULD be registered in the DID Specification Registries [DID-SPEC-REGISTRIES].
   */
  type: string[]
  /*
   * The value of the serviceEndpoint property MUST be a string, a map, or a set composed of one or more strings and/or maps. All string values MUST be valid URIs conforming to [RFC3986] and normalized according to the Normalization and Comparison rules in RFC3986 and to any normalization rules in its applicable URI scheme specification.
   */
  serviceEndpoint: string[]
}

export type DidDocument = {
  /*
   * The value of id MUST be a string that conforms to the rules in 3.1 DID Syntax and MUST exist in the root map of the data model for the DID document.
   */
  id: DidUri
  /*
   * The alsoKnownAs property is OPTIONAL. If present, the value MUST be a set where each item in the set is a URI conforming to [RFC3986].
   */
  alsoKnownAs?: string[]
  /*
   * The verificationMethod property is OPTIONAL. If present, the value MUST be a set of verification methods, where each verification method is expressed using a map.
   */
  verificationMethod: VerificationMethod[]
  /*
   * The authentication property is OPTIONAL. If present, the associated value MUST be a set of one or more verification methods. Each verification method MAY be embedded or referenced.
   */
  authentication: UriFragment[]
  /*
   * The assertionMethod property is OPTIONAL. If present, the associated value MUST be a set of one or more verification methods. Each verification method MAY be embedded or referenced.
   */
  assertionMethod?: UriFragment[]
  /*
   * The keyAgreement property is OPTIONAL. If present, the associated value MUST be a set of one or more verification methods. Each verification method MAY be embedded or referenced.
   */
  keyAgreement?: UriFragment[]
  /*
   * The capabilityDelegation property is OPTIONAL. If present, the associated value MUST be a set of one or more verification methods. Each verification method MAY be embedded or referenced.
   */
  capabilityDelegation?: UriFragment[]
  /*
   * The service property is OPTIONAL. If present, the associated value MUST be a set of services, where each service is described by a map.
   */
  service?: Service[]
}

export type JsonLdDidDocument = DidDocument & { '@context': string[] }
