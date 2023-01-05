/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/* eslint-disable max-classes-per-file */

import { CType } from '@kiltprotocol/core'
import { SDKErrors } from '@kiltprotocol/utils'
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
 */
export function validateSchema(credential: VerifiableCredential): void {
  const { schema } = credential.credentialSchema ?? {}
  // if present, perform schema validation
  if (!schema)
    throw new Error(
      'Schema validation can only be performed if schema is present in credentialSchema'
    )
  // there's no rule against additional properties, so we can just validate the ones that are there
  const claims = Object.entries(credential.credentialSubject).reduce(
    (obj, [key, value]) => {
      if (key.startsWith('#')) {
        return { ...obj, [key.substring(1)]: value }
      }
      return obj
    },
    {}
  )
  CType.verifyClaimAgainstSchema(claims, schema)
}
