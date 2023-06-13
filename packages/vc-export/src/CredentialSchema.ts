/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { CType } from '@kiltprotocol/core'
import type { ICType } from '@kiltprotocol/types'

import { jsonLdExpandCredentialSubject } from './common.js'
import type { KiltCredentialV1 } from './types.js'

/**
 * Validates the claims in the VC's `credentialSubject` against a CType definition.
 *
 * @param credential A [[KiltCredentialV1]] type verifiable credential.
 * @param credential.credentialSubject The credentialSubject to be validated.
 * @param cType The CType definition to be used.
 */
export function validateSubject(
  { credentialSubject }: KiltCredentialV1,
  cType: ICType
): void {
  // check that we have access to the right schema
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!cType) {
    throw new Error(
      'CType validation can only be performed if cType argument is present'
    )
  }
  // normalize credential subject to form expected by CType schema
  const expandedClaims: Record<string, unknown> =
    jsonLdExpandCredentialSubject(credentialSubject)
  delete expandedClaims['@id']
  const vocab = `${cType.$id}#`
  const claims = Object.entries(expandedClaims).reduce((obj, [key, value]) => {
    if (!key.startsWith(vocab)) {
      throw new Error(
        `The credential contains claims which do not follow the expected CType: ${key}`
      )
    }
    return {
      ...obj,
      [key.substring(vocab.length)]: value,
    }
  }, {})
  // validates against CType (also validates CType schema itself)
  CType.verifyClaimAgainstSchema(claims, cType)
}
