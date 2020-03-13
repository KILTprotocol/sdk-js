/**
 * @packageDocumentation
 * @module CTypeUtils
 * @preferred
 */

import Ajv from 'ajv'
import * as jsonabc from 'jsonabc'
import { CTypeModel } from './CTypeSchema'
import ICType, { CompressedCTypeSchema, CompressedCType } from '../types/CType'
import Crypto from '../crypto'

export function verifySchemaWithErrors(
  object: any,
  schema: any,
  messages?: string[]
): boolean {
  const ajv = new Ajv()
  ajv.addMetaSchema(CTypeModel)
  const result = ajv.validate(schema, object)
  if (!result && ajv.errors) {
    if (messages) {
      ajv.errors.forEach((error: any) => {
        messages.push(error.message)
      })
    }
  }
  return !!result
}

export function verifySchema(object: any, schema: any): boolean {
  return verifySchemaWithErrors(object, schema)
}

export function verifyClaimStructure(claim: any, schema: any): boolean {
  if (!verifySchema(schema, CTypeModel)) {
    throw new Error('CType does not correspond to schema')
  }
  return verifySchema(claim, schema)
}

export function getHashForSchema(schema: ICType['schema']): string {
  return Crypto.hashObjectAsStr(schema)
}

/**
 *  Compresses a [[CType]] schema for storage and/or messaging.
 *
 * @param cTypeSchema A [[CType]] schema object that will be sorted and stripped for messaging or storage.
 *
 * @returns An ordered array of a [[CType]] schema.
 */

export function compressCTypeSchema(
  cTypeSchema: ICType['schema']
): CompressedCTypeSchema {
  if (
    !cTypeSchema.$id ||
    !cTypeSchema.$schema ||
    !cTypeSchema.properties ||
    !cTypeSchema.type
  ) {
    throw new Error(
      `Property Not Provided while building cTypeSchema: 
      ${JSON.stringify(cTypeSchema, null, 2)}`
    )
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
 * @param cTypeSchema A compressesd [[CType]] schema array that is reverted back into an object.
 *
 * @returns An object that has the same properties as a [[CType]] schema.
 */

export function decompressCTypeSchema(
  cTypeSchema: CompressedCTypeSchema
): ICType['schema'] {
  if (!Array.isArray(cTypeSchema) || cTypeSchema.length !== 4) {
    throw new Error(
      'Compressed cTypeSchema isnt an Array or has all the required data types'
    )
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

export function compressCType(cType: ICType): CompressedCType {
  if (!cType.hash || !cType.owner || !cType.schema) {
    throw new Error(
      `Property Not Provided while building cType: ${JSON.stringify(
        cType,
        null,
        2
      )}`
    )
  }
  return [cType.hash, cType.owner, compressCTypeSchema(cType.schema)]
}

/**
 *  Decompresses a [[CType]] from storage and/or message.
 *
 * @param cType A compressesd [[CType]] array that is reverted back into an object.
 *
 * @returns An object that has the same properties as a [[CType]].
 */

export function decompressCType(cType: CompressedCType): ICType {
  if (!Array.isArray(cType) || cType.length !== 3) {
    throw new Error(
      'Compressed cType isnt an Array or has all the required data types'
    )
  }
  return {
    hash: cType[0],
    owner: cType[1],
    schema: decompressCTypeSchema(cType[2]),
  }
}

export default {
  verifySchema,
  compressCTypeSchema,
  decompressCTypeSchema,
  decompressCType,
  compressCType,
  verifySchemaWithErrors,
  verifyClaimStructure,
  getHashForSchema,
}
