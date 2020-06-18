/**
 * @packageDocumentation
 * @module CTypeUtils
 * @preferred
 */

import Ajv from 'ajv'
import * as jsonabc from 'jsonabc'
import { getOwner } from './CType.chain'
import { CTypeModel, CTypeWrapperModel } from './CTypeSchema'
import ICType, { CompressedCTypeSchema, CompressedCType } from '../types/CType'
import Crypto from '../crypto'
import IClaim from '../types/Claim'
import { validateAddress } from '../util/DataUtils'
import * as SDKErrors from '../errorhandling/SDKErrors'

export function verifySchemaWithErrors(
  object: object,
  schema: object,
  messages?: string[]
): boolean {
  const ajv = new Ajv()
  ajv.addMetaSchema(CTypeModel)
  const result = ajv.validate(schema, object)
  if (!result && ajv.errors) {
    if (messages) {
      ajv.errors.forEach((error: Ajv.ErrorObject) => {
        if (typeof error.message === 'string') {
          messages.push(error.message)
        }
      })
    }
  }
  return !!result
}

export function verifySchema(object: object, schema: object): boolean {
  return verifySchemaWithErrors(object, schema)
}

/**
 *  Verifies the Structure of the provided IClaim['contents'] with ICType['schema'].
 *
 * @param claimContents IClaim['contents'] to be verified against the schema.
 * @param schema ICType['schema'] to be verified against the [CTypeModel].
 * @throws When schema does not correspond to the CTypeModel.
 * @throws [[ERROR_OBJECT_MALFORMED]].
 *
 * @returns Boolean whether both claimContents and schema could be verified.
 */
export function verifyClaimStructure(
  claimContents: IClaim['contents'],
  schema: ICType['schema']
): boolean {
  if (!verifySchema(schema, CTypeModel)) {
    throw SDKErrors.ERROR_OBJECT_MALFORMED()
  }
  return verifySchema(claimContents, schema)
}

export async function verifyStored(ctype: ICType): Promise<boolean> {
  const actualOwner = await getOwner(ctype.hash)
  return ctype.owner ? actualOwner === ctype.owner : actualOwner !== null
}

export function getHashForSchema(schema: ICType['schema']): string {
  return Crypto.hashObjectAsStr(schema)
}

/**
 *  Checks whether the input meets all the required criteria of an ICType object.
 *  Throws on invalid input.
 *
 * @param input The potentially only partial ICType.
 * @throws When input does not correspond to either it's schema, or the CTypeWrapperModel.
 * @throws When the input's hash does not match the hash calculated from ICType's schema.
 * @throws When the input's owner is not of type string or null.
 * @throws [[ERROR_OBJECT_MALFORMED]], [[ERROR_HASH_MALFORMED]], [[ERROR_CTYPE_OWNER_TYPE]].
 *
 */
export function errorCheck(input: ICType): void {
  if (!verifySchema(input, CTypeWrapperModel)) {
    throw SDKErrors.ERROR_OBJECT_MALFORMED()
  }
  if (!input.schema || getHashForSchema(input.schema) !== input.hash) {
    throw SDKErrors.ERROR_HASH_MALFORMED(input.hash, 'CType')
  }
  if (
    typeof input.owner === 'string'
      ? !validateAddress(input.owner, 'CType owner')
      : !(input.owner === null)
  ) {
    throw SDKErrors.ERROR_CTYPE_OWNER_TYPE()
  }
}

/**
 *  Compresses a [[CType]] schema for storage and/or messaging.
 *
 * @param cTypeSchema A [[CType]] schema object that will be sorted and stripped for messaging or storage.
 * @throws When any of the four required properties of the cTypeSchema are missing.
 * @throws [[ERROR_COMPRESS_OBJECT]].
 *
 * @returns An ordered array of a [[CType]] schema.
 */

export function compressSchema(
  cTypeSchema: ICType['schema']
): CompressedCTypeSchema {
  if (
    !cTypeSchema.$id ||
    !cTypeSchema.$schema ||
    !cTypeSchema.properties ||
    !cTypeSchema.type
  ) {
    throw SDKErrors.ERROR_COMPRESS_OBJECT(cTypeSchema, 'cTypeSchema')
  }
  const sortedCTypeSchema = jsonabc.sortObj(cTypeSchema)
  return [
    sortedCTypeSchema.$id,
    sortedCTypeSchema.$schema,
    sortedCTypeSchema.properties,
    sortedCTypeSchema.type,
  ]
}

/**
 *  Decompresses a schema of a [[CType]] from storage and/or message.
 *
 * @param cTypeSchema A compressed [[CType]] schema array that is reverted back into an object.
 * @throws When either the cTypeSchema is not an Array or it's length is not equal to the defined length of 4.
 * @throws [[ERROR_DECOMPRESSION_ARRAY]].
 *
 * @returns An object that has the same properties as a [[CType]] schema.
 */

export function decompressSchema(
  cTypeSchema: CompressedCTypeSchema
): ICType['schema'] {
  if (!Array.isArray(cTypeSchema) || cTypeSchema.length !== 4) {
    throw SDKErrors.ERROR_DECOMPRESSION_ARRAY('cTypeSchema')
  }
  return {
    $id: cTypeSchema[0],
    $schema: cTypeSchema[1],
    properties: cTypeSchema[2],
    type: cTypeSchema[3],
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
 * @throws When either the cType is not an Array or it's length is not equal to the defined length of 3.
 * @throws [[ERROR_DECOMPRESSION_ARRAY]].
 *
 * @returns An object that has the same properties as a [[CType]].
 */

export function decompress(cType: CompressedCType): ICType {
  if (!Array.isArray(cType) || cType.length !== 3) {
    throw SDKErrors.ERROR_DECOMPRESSION_ARRAY('CType')
  }
  return {
    hash: cType[0],
    owner: cType[1],
    schema: decompressSchema(cType[2]),
  }
}

export default {
  compress,
  compressSchema,
  decompressSchema,
  decompress,
  errorCheck,
  verifyClaimStructure,
  verifySchema,
  verifySchemaWithErrors,
  verifyStored,
  getHashForSchema,
}
