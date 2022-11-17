/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * Credential context URL required by VC specifications.
 */
export const W3C_CREDENTIAL_CONTEXT_URL =
  'https://www.w3.org/2018/credentials/v1'
/**
 * Credential context URL required for Kilt credentials.
 */
export const KILT_CREDENTIAL_CONTEXT_URL =
  'https://www.kilt.io/contexts/credentials'
/**
 * Ordered set of credential contexts required on every Kilt VC.
 */
export const DEFAULT_CREDENTIAL_CONTEXTS: [
  typeof W3C_CREDENTIAL_CONTEXT_URL,
  typeof KILT_CREDENTIAL_CONTEXT_URL
] = [W3C_CREDENTIAL_CONTEXT_URL, KILT_CREDENTIAL_CONTEXT_URL]
/**
 * Credential type required by VC specifications.
 */
export const W3C_CREDENTIAL_TYPE = 'VerifiableCredential'
/**
 * Credential type required for Kilt credentials.
 */
export const KILT_CREDENTIAL_TYPE = 'KiltCredentialV1'
/**
 * Set of credential types required on every Kilt VC.
 */
export const DEFAULT_CREDENTIAL_TYPES: Array<
  typeof W3C_CREDENTIAL_TYPE | typeof KILT_CREDENTIAL_TYPE
> = [W3C_CREDENTIAL_TYPE, KILT_CREDENTIAL_TYPE]
/**
 * Constant for default presentation type.
 */
export const W3C_PRESENTATION_TYPE = 'VerifiablePresentation'
/**
 * Type for backwards-compatible Kilt proof suite.
 */
export const ATTESTATION_PROOF_V1_TYPE = 'KiltAttestationProofV1'

export const KILT_REVOCATION_STATUS_V1_TYPE = 'KiltRevocationStatusV1'

export const KILT_ATTESTER_LEGITIMATION_V1_TYPE = 'KiltAttesterLegitimationV1'

export const KILT_ATTESTER_DELEGATION_V1_TYPE = 'KiltAttesterDelegationV1'

export const JSON_SCHEMA_TYPE = 'JsonSchemaValidator2018'

export const KILT_CREDENTIAL_IRI_PREFIX = 'kilt:credential:'
