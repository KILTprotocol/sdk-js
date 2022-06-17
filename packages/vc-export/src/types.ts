/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { AnyJson } from '@polkadot/types/types'
import type { ICType, DidPublicKey } from '@kiltprotocol/types'
import type {
  DEFAULT_VERIFIABLECREDENTIAL_CONTEXT,
  DEFAULT_VERIFIABLECREDENTIAL_TYPE,
  DEFAULT_VERIFIABLEPRESENTATION_TYPE,
  JSON_SCHEMA_TYPE,
  KILT_ATTESTED_PROOF_TYPE,
  KILT_CREDENTIAL_DIGEST_PROOF_TYPE,
  KILT_SELF_SIGNED_PROOF_TYPE,
} from './constants.js'

export interface Proof {
  type: string
  created?: string
  proofPurpose?: string
  [key: string]: any
}

export type IPublicKeyRecord = DidPublicKey

export interface SelfSignedProof extends Proof {
  type: typeof KILT_SELF_SIGNED_PROOF_TYPE
  verificationMethod: IPublicKeyRecord['uri'] | IPublicKeyRecord
  signature: string
  challenge?: string
}
export interface AttestedProof extends Proof {
  type: typeof KILT_ATTESTED_PROOF_TYPE
  attester: string
}
export interface CredentialDigestProof extends Proof {
  type: typeof KILT_CREDENTIAL_DIGEST_PROOF_TYPE
  // map of unsalted property digests and nonces
  nonces: Record<string, string>
  // salted hashes of statements in credentialSubject to allow selective disclosure.
  claimHashes: string[]
}

export interface CredentialSchema {
  '@id': string
  '@type': typeof JSON_SCHEMA_TYPE
  schema: ICType['schema']
  modelVersion?: string
  name?: string
  author?: string
  authored?: string
  proof?: Proof
}

export interface VerifiableCredential {
  '@context': [typeof DEFAULT_VERIFIABLECREDENTIAL_CONTEXT, ...string[]]
  // the credential types, which declare what data to expect in the credential
  type: [typeof DEFAULT_VERIFIABLECREDENTIAL_TYPE, ...string[]]
  id: string
  // claims about the subjects of the credential
  credentialSubject: Record<string, AnyJson>
  // the entity that issued the credential
  issuer: string
  // when the credential was issued
  issuanceDate: string
  // Ids / digests of claims that empower the issuer to provide judgment
  legitimationIds: string[]
  // Id / digest that represents a delegation of authority to the issuer
  delegationId?: string
  // digital proof that makes the credential tamper-evident
  proof: Proof | Proof[]
  nonTransferable?: boolean
  credentialSchema?: CredentialSchema
  expirationDate?: string
}

export interface VerifiablePresentation {
  '@context': [typeof DEFAULT_VERIFIABLECREDENTIAL_CONTEXT, ...string[]]
  type: [typeof DEFAULT_VERIFIABLEPRESENTATION_TYPE, ...string[]]
  verifiableCredential: VerifiableCredential | VerifiableCredential[]
  holder?: string
  proof: Proof | Proof[]
}
