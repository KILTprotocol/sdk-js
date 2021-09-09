/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * Constant for default context.
 */
export const DEFAULT_VERIFIABLECREDENTIAL_CONTEXT =
  'https://www.w3.org/2018/credentials/v1'

export const KILT_CREDENTIAL_CONTEXT_URL =
  'https://www.kilt.io/contexts/credentials'
/**
 * Constant for default type.
 */
export const DEFAULT_VERIFIABLECREDENTIAL_TYPE = 'VerifiableCredential'
/**
 * Constant for default presentation type.
 */
export const DEFAULT_VERIFIABLEPRESENTATION_TYPE = 'VerifiablePresentation'

export const KILT_VERIFIABLECREDENTIAL_TYPE = 'KiltCredential2020'

export const KILT_SELF_SIGNED_PROOF_TYPE = 'KILTSelfSigned2020'
export const KILT_ATTESTED_PROOF_TYPE = 'KILTAttestation2020'
export const KILT_CREDENTIAL_DIGEST_PROOF_TYPE = 'KILTCredentialDigest2020'

export const JSON_SCHEMA_TYPE = 'JsonSchemaValidator2018'

export const KILT_CREDENTIAL_IRI_PREFIX = 'kilt:cred:'

export const KeyTypesMap = {
  // proposed and used by dock.io, e.g. https://github.com/w3c-ccg/security-vocab/issues/32, https://github.com/docknetwork/sdk/blob/9c818b03bfb4fdf144c20678169c7aad3935ad96/src/utils/vc/contexts/security_context.js
  sr25519: 'Sr25519VerificationKey2020',
  // these are part of current w3 security vocab, see e.g. https://www.w3.org/ns/did/v1
  ed25519: 'Ed25519VerificationKey2018',
  ecdsa: 'EcdsaSecp256k1VerificationKey2019',
  x25519: 'X25519KeyAgreementKey2019',
}
