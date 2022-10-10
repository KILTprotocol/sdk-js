/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
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
 */

import type {
  ICType,
  IClaim,
  ICTypeMetadata,
  CTypeHash,
} from '@kiltprotocol/types'
import { Crypto, SDKErrors, JsonSchema, jsonabc } from '@kiltprotocol/utils'
import { ConfigService } from '@kiltprotocol/config'
import { CTypeModel, MetadataModel } from './CType.schemas.js'

/**
 * Utility for (re)creating ctype hashes. For this, the $id property needs to be stripped from the CType schema.
 *
 * @param ctypeSchema The CType schema (with or without $id).
 * @returns CtypeSchema without the $id property.
 */
export function serializeForHash(
  ctypeSchema: ICType | Omit<ICType, '$id'>
): string {
  // We need to remove the CType ID from the CType before storing it on the blockchain
  // otherwise the resulting hash will be different, as the hash on chain would contain the CType ID,
  // which is itself a hash of the CType schema.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { $id: _, ...schemaWithoutId } = ctypeSchema as ICType
  return Crypto.encodeObjectAsStr(schemaWithoutId)
}

/**
 * Calculates the CType hash from a schema.
 *
 * @param schema The CType schema (with or without $id).
 * @returns Hash as hex string.
 */
export function getHashForSchema(
  schema: ICType | Omit<ICType, '$id'>
): CTypeHash {
  const serializedSchema = serializeForHash(schema)
  return Crypto.hashStr(serializedSchema)
}

/**
 * Calculates the schema $id from a CType hash.
 *
 * @param hash CType hash as hex string.
 * @returns Schema id uri.
 */
export function getIdForCTypeHash(hash: CTypeHash): ICType['$id'] {
  return `kilt:ctype:${hash}`
}

/**
 * Extracts the CType hash from a CType $id.
 *
 * @param id A CType id of the form 'kilt:ctype:0x[0-9a-f]'.
 * @returns The CType hash as a zero-prefixed string of hex digits.
 */
export function getCTypeHashFromId(id: ICType['$id']): CTypeHash {
  const result = id.match(/kilt:ctype:(0x[0-9a-f]+)/i)
  if (!result)
    throw new SDKErrors.CTypeHashMissingError(
      `The string ${id} is not a valid CType id`
    )
  return result[1] as CTypeHash
}

/**
 * Calculates the schema $id for a CType schema by hashing it.
 *
 * @param schema CType schema for which to create schema id.
 * @returns Schema id uri.
 */
export function getIdForSchema(
  schema: ICType | Omit<ICType, '$id'>
): ICType['$id'] {
  return getIdForCTypeHash(getHashForSchema(schema))
}

/**
 * Verifies data against CType schema or CType schema against meta-schema.
 *
 * @param object Data to be verified against schema.
 * @param schema Schema to verify against.
 * @param messages Optional empty array. If passed, this receives all verification errors.
 */
export function verifyObjectAgainstSchema(
  object: Record<string, any>,
  schema: Record<string, any>,
  messages?: string[]
): void {
  const validator = new JsonSchema.Validator(schema, '7', false)
  if (schema.$id !== CTypeModel.$id) {
    validator.addSchema(CTypeModel)
  }
  const { valid, errors } = validator.validate(object)
  if (valid === true) return
  if (messages) {
    errors.forEach((error) => {
      messages.push(error.error)
    })
  }
  throw new SDKErrors.ObjectUnverifiableError(
    'JSON schema verification failed for object',
    { cause: errors }
  )
}

/**
 * Verifies the structure of the provided IClaim['contents'] with [[ICType]].
 *
 * @param claimContents IClaim['contents'] to be verified against the schema.
 * @param schema ICType to be verified against the [[CTypeModel]].
 * @param messages An array, which will be filled by schema errors.
 */
export function verifyClaimAgainstSchema(
  claimContents: IClaim['contents'],
  schema: ICType,
  messages?: string[]
): void {
  verifyObjectAgainstSchema(schema, CTypeModel)
  verifyObjectAgainstSchema(claimContents, schema, messages)
}

/**
 * Checks on the KILT blockchain whether a CType is registered.
 *
 * @param ctype CType data.
 */
export async function verifyStored(ctype: ICType): Promise<void> {
  const api = ConfigService.get('api')
  const hash = getCTypeHashFromId(ctype.$id)
  const encoded = await api.query.ctype.ctypes(hash)
  if (encoded.isNone)
    throw new SDKErrors.CTypeHashMissingError(
      `CType with hash ${hash} is not registered on chain`
    )
}

/**
 * Checks whether the input meets all the required criteria of an ICType object.
 * Throws on invalid input.
 *
 * @param input The ICType object.
 */
export function verifyDataStructure(input: ICType): void {
  verifyObjectAgainstSchema(input, CTypeModel)
  const idFromSchema = getIdForSchema(input)
  if (idFromSchema !== input.$id) {
    throw new SDKErrors.CTypeIdMismatchError(idFromSchema, input.$id)
  }
}

/**
 * Validates an array of [[CType]]s against a [[Claim]].
 *
 * @param cType - A [[CType]] that has nested [[CType]]s inside.
 * @param nestedCTypes - An array of [[CType]] schemas.
 * @param claimContents - The contents of a [[Claim]] to be validated.
 * @param messages - Optional empty array. If passed, this receives all verification errors.
 */
export function verifyClaimAgainstNestedSchemas(
  cType: ICType,
  nestedCTypes: ICType[],
  claimContents: Record<string, any>,
  messages?: string[]
): void {
  const validator = new JsonSchema.Validator(cType, '7', false)
  nestedCTypes.forEach((ctype) => {
    validator.addSchema(ctype)
  })
  validator.addSchema(CTypeModel)
  const { valid, errors } = validator.validate(claimContents)
  if (valid === true) return
  if (messages) {
    errors.forEach((error) => {
      messages.push(error.error)
    })
  }
  throw new SDKErrors.NestedClaimUnverifiableError(undefined, {
    cause: errors,
  })
}

/**
 * Checks a CTypeMetadata object.
 *
 * @param metadata [[ICTypeMetadata]] that is to be instantiated.
 */
export function verifyCTypeMetadata(metadata: ICTypeMetadata): void {
  verifyObjectAgainstSchema(metadata, MetadataModel)
}

/**
 * Creates a new [[ICType]] object from a set of atomic claims and a title.
 * The CType id will be automatically generated.
 *
 * @param title The new CType's title as a string.
 * @param properties Key-value pairs describing the admissible atomic claims for a credential with this CType. The value of each property is a json-schema (for example `{ "type": "number" }`) used to validate that property.
 * @returns A ctype object, including cTypeId, $schema, and type.
 */
export function fromProperties(
  title: ICType['title'],
  properties: ICType['properties']
): ICType {
  const schema: Omit<ICType, '$id'> = {
    properties,
    title,
    $schema: 'http://kilt-protocol.org/draft-01/ctype#',
    type: 'object',
  }
  const ctype = jsonabc.sortObj({ ...schema, $id: getIdForSchema(schema) })
  verifyDataStructure(ctype)
  return ctype
}

/**
 * Custom Type Guard to determine input being of type ICType.
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
