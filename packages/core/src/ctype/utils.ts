/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @packageDocumentation
 * @module CTypeUtils
 */

import type { ICType, CTypeSchemaWithoutId } from '@kiltprotocol/types'
import { Crypto } from '@kiltprotocol/utils'

export function getSchemaPropertiesForHash(
  ctypeSchema: CTypeSchemaWithoutId | ICType['schema']
): Partial<ICType['schema']> {
  // We need to remove the CType ID from the CType before storing it on the blockchain
  // otherwise the resulting hash will be different, as the hash on chain would contain the CType ID,
  // which is itself a hash of the CType schema.
  const schemaWithoutId: Partial<ICType['schema']> =
    '$id' in ctypeSchema
      ? (ctypeSchema as ICType['schema'])
      : (ctypeSchema as CTypeSchemaWithoutId)
  const shallowCopy = { ...schemaWithoutId }
  delete shallowCopy.$id
  return shallowCopy
}

export function getHashForSchema(
  schema: CTypeSchemaWithoutId | ICType['schema']
): string {
  const preparedSchema = getSchemaPropertiesForHash(schema)
  return Crypto.hashObjectAsStr(preparedSchema)
}

export function getIdForCTypeHash(hash: string): string {
  return `kilt:ctype:${hash}`
}

export function getIdForSchema(
  schema: CTypeSchemaWithoutId | ICType['schema']
): string {
  return getIdForCTypeHash(getHashForSchema(schema))
}
