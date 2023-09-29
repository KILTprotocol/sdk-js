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
type DidUri =
  | `did:kilt:${DidUriVersion}${KiltAddress}`
  | `did:kilt:light:${DidUriVersion}${AuthenticationKeyType}${KiltAddress}${LightDidEncodedData}`

/**
 * The fragment part of the DID URI including the `#` character.
 */
type UriFragment = `#${string}`
/**
 * URI for DID resources like keys or service endpoints.
 */
type DidResourceUri = `${DidUri}${UriFragment}`

type Base58BtcMultibaseString = `z${string}`

interface VerificationMethod {
  id: DidResourceUri
  controller: DidUri
  type: 'MultiKey'
  publicKeyMultibase: Base58BtcMultibaseString
}

interface Service {
  id: DidResourceUri
  type: string
  serviceEndpoint: string[]
}

interface DidDocument {
  id: DidUri
  alsoKnownAs?: string[]
  verificationMethod: VerificationMethod[]
  authentication: DidResourceUri[]
  keyAgreement?: DidResourceUri[]
  capabilityInvocation?: DidResourceUri[]
  capabilityDelegation?: DidResourceUri[]
  service?: Service[]
}
