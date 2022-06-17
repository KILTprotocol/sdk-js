/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  ICType,
  IClaim,
  CompressedCType,
  CompressedCTypeSchema,
  CTypeSchemaWithoutId,
} from '@kiltprotocol/types'
import { jsonabc, Crypto, SDKErrors, JsonSchema } from '@kiltprotocol/utils'
import { Utils as DidUtils } from '@kiltprotocol/did'
import type { HexString } from '@polkadot/util/types'
import { getOwner, isStored } from './CType.chain.js'
import { CTypeModel, CTypeWrapperModel } from './CTypeSchema.js'

/**
 * Verifies data against CType schema or CType schema against metaschema.
 *
 * @param object Data to be verified against schema.
 * @param schema Schema to verify against.
 * @param messages Optional empty array. If passed, this receives all verification errors.
 * @returns Whether or not verification was successful.
 */
export function verifySchemaWithErrors(
  object: Record<string, unknown>,
  schema: Record<string, unknown>,
  messages?: string[]
): boolean {
  const validator = new JsonSchema.Validator(schema, '7', false)
  if (schema.$id !== CTypeModel.$id) {
    validator.addSchema(CTypeModel)
  }
  const result = validator.validate(object)
  if (!result.valid && messages) {
    result.errors.forEach((error) => {
      messages.push(error.error)
    })
  }
  return result.valid
}

/**
 * Verifies data against CType schema or CType schema against metaschema.
 *
 * @param object Data to be verified against schema.
 * @param schema Schema to verify against.
 * @returns Whether or not verification was successful.
 */
export function verifySchema(
  object: Record<string, any>,
  schema: Record<string, any>
): boolean {
  return verifySchemaWithErrors(object, schema)
}

/**
 *  Verifies the structure of the provided IClaim['contents'] with ICType['schema'].
 *
 * @param claimContents IClaim['contents'] to be verified against the schema.
 * @param schema ICType['schema'] to be verified against the [CTypeModel].
 * @throws [[ERROR_OBJECT_MALFORMED]] when schema does not correspond to the CTypeModel.
 *
 * @returns Boolean whether both claimContents and schema could be verified.
 */
export function verifyClaimStructure(
  claimContents: IClaim['contents'],
  schema: ICType['schema']
): boolean {
  if (!verifySchema(schema, CTypeModel)) {
    throw new SDKErrors.ERROR_OBJECT_MALFORMED()
  }
  return verifySchema(claimContents, schema)
}

/**
 * Checks on the KILT blockchain whether a CType is registered.
 *
 * @param ctype CType data.
 * @returns Whether or not the CType is registered on-chain.
 */
export async function verifyStored(ctype: ICType): Promise<boolean> {
  return isStored(ctype.hash)
}

/**
 * Checks on the KILT blockchain whether a CType is registered to the owner listed in the CType record.
 *
 * @param ctype CType data.
 * @returns Whether or not the CType is registered on-chain to `ctype.owner`.
 */
export async function verifyOwner(ctype: ICType): Promise<boolean> {
  const owner = await getOwner(ctype.hash)
  return owner ? owner === ctype.owner : false
}

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

/**
 *  Checks whether the input meets all the required criteria of an ICType object.
 *  Throws on invalid input.
 *
 * @param input The potentially only partial ICType.
 * @throws [[ERROR_OBJECT_MALFORMED]] when input does not correspond to either it's schema, or the CTypeWrapperModel.
 * @throws [[ERROR_HASH_MALFORMED]] when the input's hash does not match the hash calculated from ICType's schema.
 * @throws [[ERROR_CTYPE_OWNER_TYPE]] when the input's owner is not of type string or null.
 *
 */
export function errorCheck(input: ICType): void {
  if (!verifySchema(input, CTypeWrapperModel)) {
    throw new SDKErrors.ERROR_OBJECT_MALFORMED()
  }
  if (!input.schema || getHashForSchema(input.schema) !== input.hash) {
    throw new SDKErrors.ERROR_HASH_MALFORMED(input.hash, 'CType')
  }
  if (getIdForSchema(input.schema) !== input.schema.$id) {
    throw new SDKErrors.ERROR_CTYPE_ID_NOT_MATCHING(
      getIdForSchema(input.schema),
      input.schema.$id
    )
  }
  if (!(input.owner === null || DidUtils.validateKiltDidUri(input.owner))) {
    throw new SDKErrors.ERROR_CTYPE_OWNER_TYPE()
  }
}

/**
 *  Compresses a [[CType]] schema for storage and/or messaging.
 *
 * @param cTypeSchema A [[CType]] schema object that will be sorted and stripped for messaging or storage.
 * @throws [[ERROR_COMPRESS_OBJECT]] when any of the four required properties of the cTypeSchema are missing.
 *
 * @returns An ordered array of a [[CType]] schema.
 */
export function compressSchema(
  cTypeSchema: ICType['schema']
): CompressedCTypeSchema {
  if (
    !cTypeSchema.$id ||
    !cTypeSchema.$schema ||
    !cTypeSchema.title ||
    !cTypeSchema.properties ||
    !cTypeSchema.type
  ) {
    throw new SDKErrors.ERROR_COMPRESS_OBJECT(cTypeSchema, 'cTypeSchema')
  }
  const sortedCTypeSchema = jsonabc.sortObj(cTypeSchema)
  return [
    sortedCTypeSchema.$id,
    sortedCTypeSchema.$schema,
    sortedCTypeSchema.title,
    sortedCTypeSchema.properties,
    sortedCTypeSchema.type,
  ]
}

/**
 *  Decompresses a schema of a [[CType]] from storage and/or message.
 *
 * @param cTypeSchema A compressed [[CType]] schema array that is reverted back into an object.
 * @throws [[ERROR_DECOMPRESSION_ARRAY]] when either the cTypeSchema is not an Array or it's length is not equal to the defined length of 4.
 *
 * @returns An object that has the same properties as a [[CType]] schema.
 */
export function decompressSchema(
  cTypeSchema: CompressedCTypeSchema
): ICType['schema'] {
  if (!Array.isArray(cTypeSchema) || cTypeSchema.length !== 5) {
    throw new SDKErrors.ERROR_DECOMPRESSION_ARRAY('cTypeSchema')
  }
  return {
    $id: cTypeSchema[0],
    $schema: cTypeSchema[1],
    title: cTypeSchema[2],
    properties: cTypeSchema[3],
    type: cTypeSchema[4],
  }
}

/**
 *  Compresses a [[CType]] for storage and/or messaging.
 *
 * @param cType A [[CType]] object that will be sorted and stripped for messaging or storage.
 *
 * @returns An ordered array of a [[CType]].
 */
export function compress(cType: ICType): CompressedCType {
  errorCheck(cType)
  return [cType.hash, cType.owner, compressSchema(cType.schema)]
}

/**
 *  Decompresses a [[CType]] from storage and/or message.
 *
 * @param cType A compressed [[CType]] array that is reverted back into an object.
 * @throws [[ERROR_DECOMPRESSION_ARRAY]] when either the cType is not an Array or it's length is not equal to the defined length of 3.
 *
 * @returns An object that has the same properties as a [[CType]].
 */
export function decompress(cType: CompressedCType): ICType {
  if (!Array.isArray(cType) || cType.length !== 3) {
    throw new SDKErrors.ERROR_DECOMPRESSION_ARRAY('CType')
  }
  return {
    hash: cType[0],
    owner: cType[1],
    schema: decompressSchema(cType[2]),
  }
}

/**
 * Validates an array of [[CType]]s against a [[Claim]].
 *
 * @param cType - A [[CType]] that has nested [[CType]]s inside.
 * @param nestedCTypes - An array of [[CType]] schemas.
 * @param claimContents - The contents of a [[Claim]] to be validated.
 * @param messages Optional empty array. If passed, this receives all verification errors.
 *
 * @returns Whether the contents is valid.
 */
export function validateNestedSchemas(
  cType: ICType['schema'],
  nestedCTypes: Array<ICType['schema']>,
  claimContents: Record<string, any>,
  messages?: string[]
): boolean {
  const validator = new JsonSchema.Validator(cType, '7', false)
  nestedCTypes.forEach((ctype) => {
    validator.addSchema(ctype)
  })
  validator.addSchema(CTypeModel)
  const result = validator.validate(claimContents)
  if (!result.valid && messages) {
    result.errors.forEach((error) => {
      messages.push(error.error)
    })
  }
  return result.valid
}
