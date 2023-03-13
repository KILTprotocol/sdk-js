/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { CType } from '@kiltprotocol/core'
import type { ICType } from '@kiltprotocol/types'

import { jsonLdExpandCredentialSubject } from './common.js'
import type { VerifiableCredential } from './types.js'

/**
 * Validates the claims in the VC's `credentialSubject` against a CType definition on the `credentialSchema` property.
 *
 * @param credential A verifiable credential where `credentialSchema.schema` is an [[ICType]].
 * @param credential.credentialSubject The credentialSubject to be validated.
 * @param credential.credentialSchema The credentialSchema to be applied.
 * @param cType Optionally pass the CType definition to be used if it is not embedded in the credentialSchema.
 */
export function validateSchema(
  { credentialSubject, credentialSchema }: VerifiableCredential,
  cType?: ICType
): void {
  const { schema = cType } = credentialSchema ?? {}
  // check that we have access to the right schema
  if (!schema) {
    throw new Error(
      'Schema validation can only be performed if schema is present in credentialSchema or passed as the cType argument'
    )
  }
  if (schema.$id !== credentialSchema.id) {
    throw new Error('CType[$id] must be equal to the credentialSchema[id]')
  }
  // normalize credential subject to form expected by CType schema
  const expandedClaims: Record<string, unknown> =
    jsonLdExpandCredentialSubject(credentialSubject)
  delete expandedClaims['@id']
  const vocab = `${schema.$id}#`
  const claims = Object.entries(expandedClaims).reduce((obj, [key, value]) => {
    return {
      ...obj,
      [key.startsWith(vocab) ? key.substring(vocab.length) : key]: value,
    }
  }, {})
  // validates against CType (also validates CType schema itself)
  CType.verifyClaimAgainstSchema(claims, schema)
}
