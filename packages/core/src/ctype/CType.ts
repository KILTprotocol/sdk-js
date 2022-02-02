/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ICType, CTypeSchemaWithoutId } from '@kiltprotocol/types'
import { getHashForSchema, getIdForSchema, errorCheck } from './CType.utils.js'

/**
 * [STATIC] Clones an already existing [[CType]]
 * or initializes from an [[ICType]] like object
 * which is non-initialized and non-verified CType data.
 *
 * @param cTypeInput The [[CType]] which shall be cloned.
 *
 * @returns A copy of the given [[CType]].
 */
export function fromCType(cTypeInput: ICType): ICType {
  errorCheck(cTypeInput)
  return JSON.parse(JSON.stringify(cTypeInput))
}

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
  errorCheck(ctype)
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
    errorCheck(input as ICType)
  } catch (error) {
    return false
  }
  return true
}
