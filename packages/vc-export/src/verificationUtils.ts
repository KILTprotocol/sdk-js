/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable max-classes-per-file */

import { CType } from '@kiltprotocol/core'
import { JsonSchema, SDKErrors } from '@kiltprotocol/utils'
import type { VerifiableCredential } from './types.js'

export interface VerificationResult {
  verified: boolean
  errors: Error[]
}

export type AttestationStatus = 'valid' | 'invalid' | 'revoked' | 'unknown'

export interface AttestationVerificationResult extends VerificationResult {
  status: AttestationStatus
}

export class CredentialMalformedError extends SDKErrors.SDKError {}

export class ProofMalformedError extends SDKErrors.SDKError {}

/**
 * Validates the claims in the VC's `credentialSubject` against a CType definition on the `credentialSchema` property.
 *
 * @param credential A verifiable credential where `credentialSchema.schema` is an [[ICType]].
 * @returns The [[VerificationResult]].
 */
export function validateSchema(
  credential: VerifiableCredential
): VerificationResult {
  const { schema } = credential.credentialSchema ?? {}
  // if present, perform schema validation
  if (schema) {
    // there's no rule against additional properties, so we can just validate the ones that are there
    const validator = new JsonSchema.Validator(schema)
    validator.addSchema(CType.Schemas.CTypeModel)
    const { errors, valid } = validator.validate(credential.credentialSubject)
    return {
      verified: valid,
      errors: errors.length > 0 ? errors.map((e) => new Error(e.error)) : [],
    }
  }
  return { verified: false, errors: [] }
}
