/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { ICType, CTypeSchemaWithoutId } from '@kiltprotocol/types'
import { Crypto } from '@kiltprotocol/utils'
import { HexString } from '@polkadot/util/types'

/**
 * Utility for (re)creating ctype hashes. For this, the $id property needs to be stripped from the CType schema.
 *
 * @param ctypeSchema The CType schema (with or without $id).
 * @returns CtypeSchema without the $id property.
 */
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

/**
 * Calculates the CType hash from a schema.
 *
 * @param schema The CType schema (with or without $id).
 * @returns Hash as hex string.
 */
export function getHashForSchema(
  schema: CTypeSchemaWithoutId | ICType['schema']
): HexString {
  const preparedSchema = getSchemaPropertiesForHash(schema)
  return Crypto.hashObjectAsStr(preparedSchema)
}

/**
 * Calculates the schema $id from a CType hash.
 *
 * @param hash CType hash as hex string.
 * @returns Schema id uri.
 */
export function getIdForCTypeHash(
  hash: ICType['hash']
): ICType['schema']['$id'] {
  return `kilt:ctype:${hash}`
}

/**
 * Calculates the schema $id for a CType schema by hashing it.
 *
 * @param schema CType schema for which to create schema id.
 * @returns Schema id uri.
 */
export function getIdForSchema(
  schema: CTypeSchemaWithoutId | ICType['schema']
): string {
  return getIdForCTypeHash(getHashForSchema(schema))
}
