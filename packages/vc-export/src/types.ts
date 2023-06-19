/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-use-before-define */

import type {
  ConformingDidKey,
  DidUri,
  Caip2ChainId,
  IClaimContents,
  ICType,
} from '@kiltprotocol/types'

import type {
  ATTESTATION_PROOF_V1_TYPE,
  DEFAULT_CREDENTIAL_CONTEXTS,
  JSON_SCHEMA_TYPE,
  KILT_ATTESTER_DELEGATION_V1_TYPE,
  KILT_ATTESTER_LEGITIMATION_V1_TYPE,
  KILT_CREDENTIAL_IRI_PREFIX,
  KILT_CREDENTIAL_TYPE,
  KILT_REVOCATION_STATUS_V1_TYPE,
  W3C_CREDENTIAL_CONTEXT_URL,
  W3C_CREDENTIAL_TYPE,
  W3C_PRESENTATION_TYPE,
} from './constants.js'

export * from './vc-js/types.js'

export type IPublicKeyRecord = ConformingDidKey

export interface Proof {
  type: string
}

export interface UnsignedVc {
  /**
   * References to json-ld contexts defining the terms used.
   */
  '@context': [typeof W3C_CREDENTIAL_CONTEXT_URL, ...string[]]
  /**
   * Credential identifier.
   */
  id?: string
  /**
   * The credential types, which declare what data to expect in the credential.
   */
  type: typeof W3C_CREDENTIAL_TYPE | string[]
  /**
   * Claims about the subjects of the credential.
   */
  credentialSubject: { id?: string }
  /**
   * The entity that issued the credential.
   */
  issuer: string
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
  credentialSchema?: {
    id?: string
    type: string
  }
  /**
   * Contains credentials status method.
   */
  credentialStatus?: {
    id: string
    type: string
  }
}

export interface VerifiableCredential extends UnsignedVc {
  /**
   *  Cryptographic proof that makes the credential tamper-evident.
   */
  proof: Proof | Proof[]
}

export interface VerifiablePresentation {
  id?: string
  '@context': [typeof W3C_CREDENTIAL_CONTEXT_URL, ...string[]]
  type: [typeof W3C_PRESENTATION_TYPE, ...string[]]
  verifiableCredential: VerifiableCredential | VerifiableCredential[]
  holder: DidUri
  proof?: Proof | Proof[]
  expirationDate?: string
  issuanceDate?: string
  verifier?: string
}

export interface KiltAttestationProofV1 extends Proof {
  type: typeof ATTESTATION_PROOF_V1_TYPE
  block: string
  commitments: string[]
  salt: string[]
}

export interface JsonSchema2023 {
  id: string
  type: typeof JSON_SCHEMA_TYPE
}

export interface KiltRevocationStatusV1 {
  id: Caip2ChainId
  type: typeof KILT_REVOCATION_STATUS_V1_TYPE
}

interface IssuerBacking {
  id: string
  type: string
}

export interface KiltAttesterLegitimationV1 extends IssuerBacking {
  id: KiltCredentialV1['id']
  type: typeof KILT_ATTESTER_LEGITIMATION_V1_TYPE
  verifiableCredential?: KiltCredentialV1
}

export interface KiltAttesterDelegationV1 extends IssuerBacking {
  id: `kilt:delegation/${string}`
  type: typeof KILT_ATTESTER_DELEGATION_V1_TYPE
  delegators?: DidUri[]
}

export interface CredentialSubject extends IClaimContents {
  '@context': {
    '@vocab': string
  }
  id: DidUri
}

export interface KiltCredentialV1 extends VerifiableCredential {
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
  type: Array<
    typeof W3C_CREDENTIAL_TYPE | typeof KILT_CREDENTIAL_TYPE | ICType['$id']
  >
  /**
   * Claims about the subjects of the credential.
   */
  credentialSubject: CredentialSubject
  /**
   * The entity that issued the credential.
   */
  issuer: DidUri
  /**
   * If true, this credential can only be presented and used by its subject.
   */
  nonTransferable: true
  /**
   * Contains json schema for the validation of credentialSubject claims.
   */
  credentialSchema: JsonSchema2023
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
  proof: KiltAttestationProofV1
}
