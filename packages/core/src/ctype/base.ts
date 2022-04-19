/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * CTypes are the way the KILT protocol enables a Claimer or Attester or Verifier to create a [[Claim]] schema for creating specific credentials.
 *
 * * A CTYPE is a description of the [[Claim]] data structure, based on [JSON Schema](http://json-schema.org/).
 * * CTYPEs are published and stored by the creator and/or in an open storage registry.
 * * Anyone can use a CTYPE to create a new [[Claim]].
 *
 * @packageDocumentation
 * @module CType
 * @preferred
 */

import type { ICType, CTypeSchemaWithoutId } from '@kiltprotocol/types'
import { getHashForSchema, getIdForSchema } from './utils.js'
import { verifyDataStructure } from './verification.js'

export { getOwner, isStored, getStoreTx } from './chain.js'

/**
 *  [STATIC] Creates a new [[CType]] from an [[ICTypeSchema]].
 *  _Note_ that you can either supply the schema as [[ICTypeSchema]] with the id
 *  or without the id as [[CTypeSchemaWithoutId]] which will automatically generate it.
 *
 * @param schema The JSON schema from which the [[CType]] should be generated.
 * @param owner The public SS58 address of the owner of the [[CType]].
 *
 * @returns A ctype object with ctypehash, owner and the schema.
 */
export function fromSchema(
  schema: CTypeSchemaWithoutId | ICType['schema'],
  owner?: ICType['owner']
): ICType {
  const ctype = {
    hash: getHashForSchema(schema),
    owner: owner || null,
    schema: {
      ...schema,
      $id: getIdForSchema(schema),
    },
  }
  verifyDataStructure(ctype)
  return ctype
}

/**
 *  [STATIC] Custom Type Guard to determine input being of type ICType using the CTypeUtils errorCheck.
 *
 * @param input The potentially only partial ICType.
 *
 * @returns Boolean whether input is of type ICType.
 */
export function isICType(input: unknown): input is ICType {
  try {
    verifyDataStructure(input as ICType)
  } catch (error) {
    return false
  }
  return true
}
