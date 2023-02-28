/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-use-before-define */

import type {
  ICType,
  ConformingDidKey,
  DidUri,
  Caip2ChainId,
} from '@kiltprotocol/types'
import { Proof } from 'jsonld-signatures'
import type {
  ATTESTATION_PROOF_V1_TYPE,
  DEFAULT_CREDENTIAL_CONTEXTS,
  DEFAULT_CREDENTIAL_TYPES,
  JSON_SCHEMA_TYPE,
  KILT_ATTESTER_DELEGATION_V1_TYPE,
  KILT_ATTESTER_LEGITIMATION_V1_TYPE,
  KILT_CREDENTIAL_IRI_PREFIX,
  KILT_REVOCATION_STATUS_V1_TYPE,
  W3C_CREDENTIAL_CONTEXT_URL,
  W3C_PRESENTATION_TYPE,
} from './constants.js'

export type IPublicKeyRecord = ConformingDidKey

export interface KiltAttestationProofV1 extends Proof {
  type: typeof ATTESTATION_PROOF_V1_TYPE
  block: string
  commitments: string[]
  salt: string[]
}

export interface JsonSchemaValidator2018 {
  id: string
  type: typeof JSON_SCHEMA_TYPE
  schema?: ICType
  modelVersion?: string
  name?: string
  author?: string
  authored?: string
  // proof?: Proof
}

export interface KiltRevocationStatusV1 {
  id: Caip2ChainId
  type: typeof KILT_REVOCATION_STATUS_V1_TYPE
}

export interface CredentialSubject {
  '@context': {
    '@vocab': string
  }
  id: DidUri
  [k: string]: Record<string, unknown> | string | number | boolean
}

interface IssuerBacking {
  id: string
  type: string
}

export interface KiltAttesterLegitimationV1 extends IssuerBacking {
  id: VerifiableCredential['id']
  type: typeof KILT_ATTESTER_LEGITIMATION_V1_TYPE
  verifiableCredential?: VerifiableCredential
}

export interface KiltAttesterDelegationV1 extends IssuerBacking {
  id: `kilt:delegation/${string}`
  type: typeof KILT_ATTESTER_DELEGATION_V1_TYPE
  delegators?: DidUri[]
}

export interface VerifiableCredential {
  /**
   * References to json-ld contexts defining the terms used.
   */
  '@context': typeof DEFAULT_CREDENTIAL_CONTEXTS
  /**
   * Credential identifier.
   */
  id: `${typeof KILT_CREDENTIAL_IRI_PREFIX}${string}`
  /**
   * The credential types, which declare what data to expect in the credential.
   */
  type: typeof DEFAULT_CREDENTIAL_TYPES
  /**
   * Claims about the subjects of the credential.
   */
  credentialSubject: CredentialSubject
  /**
   * The entity that issued the credential.
   */
  issuer: DidUri
  /**
   * When the credential was issued.
   */
  issuanceDate: string
  /**
   * If true, this credential can only be presented and used by its subject.
   */
  nonTransferable?: boolean
  /**
   * Contains json schema for the validation of credentialSubject claims.
   */
  credentialSchema: JsonSchemaValidator2018
  /**
   * Contains credentials status method.
   */
  credentialStatus: KiltRevocationStatusV1
  /**
   * Contains information that can help to corroborate trust in the issuer.
   */
  federatedTrustModel?: Array<
    KiltAttesterDelegationV1 | KiltAttesterLegitimationV1
  >
  /**
   *  Cryptographic proof that makes the credential tamper-evident.
   */
  proof?: KiltAttestationProofV1
}

export interface VerifiablePresentation {
  '@context': [typeof W3C_CREDENTIAL_CONTEXT_URL, ...string[]]
  type: [typeof W3C_PRESENTATION_TYPE, ...string[]]
  verifiableCredential: VerifiableCredential | VerifiableCredential[]
  holder?: string
  proof: Record<string, unknown> | Array<Record<string, unknown>>
}
