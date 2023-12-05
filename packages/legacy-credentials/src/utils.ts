/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { CType } from '@kiltprotocol/core'
import { SDKErrors } from '@kiltprotocol/utils'
import type { PartialClaim, IClaimContents, IClaim } from '@kiltprotocol/types'

/**
 * Produces JSON-LD readable representations of a Claim's {@link IClaimContents | contents}. This is done by implicitly or explicitly transforming property keys to globally unique predicates.
 * Where possible these predicates are taken directly from the Verifiable Credentials vocabulary. Properties that are unique to a {@link ICType} are transformed into predicates by prepending the {@link ICType.$id}.
 *
 * @param claim A (partial) {@link IClaim} from to build a JSON-LD representation from. The `cTypeHash` property is required.
 * @param expanded Return an expanded instead of a compacted representation. While property transformation is done explicitly in the expanded format, it is otherwise done implicitly via adding JSON-LD's reserved `@context` properties while leaving {@link IClaim.contents} property keys untouched.
 * @returns An object which can be serialized into valid JSON-LD representing the {@link IClaimContents | claim contents}.
 */
export function jsonLDcontents(
  claim: PartialClaim,
  expanded = true
): Record<string, unknown> {
  const { cTypeHash, contents, owner } = claim
  if (!cTypeHash) {
    throw new SDKErrors.CTypeHashMissingError()
  }
  const vocabulary = `${CType.hashToId(cTypeHash)}#`
  const result: Record<string, unknown> = {}
  if (owner) {
    result['@id'] = owner
  }
  if (!expanded) {
    if (contents && ('@context' in contents || '@id' in contents)) {
      throw new Error(
        'This claim contains @-prefixed restricted properties and thus cannot be properly expressed as JSON-LD'
      )
    }
    return {
      ...contents,
      ...result,
      '@context': { '@vocab': vocabulary },
    }
  }
  Object.entries(contents || {}).forEach(([key, value]) => {
    result[vocabulary + key] = value
  })
  return result
}

/**
 * Produces canonical statements for selective disclosure based on a JSON-LD expanded representation of the claims.
 *
 * @param claim A (partial) {@link IClaim} from to build a JSON-LD representation from. The `cTypeHash` property is required.
 * @returns An array of stringified statements.
 */
export function makeStatementsJsonLD(claim: PartialClaim): string[] {
  const normalized = jsonLDcontents(claim, true)
  return Object.entries(normalized).map(([key, value]) =>
    JSON.stringify({ [key]: value })
  )
}
