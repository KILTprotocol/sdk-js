/**
 * @packageDocumentation
 * @module CTypeUtils
 * @preferred
 */

import Ajv from 'ajv'
import * as jsonabc from 'jsonabc'
import { checkAddress } from '@polkadot/util-crypto'
import { CTypeModel } from './CTypeSchema'
import ICType, { CompressedCTypeSchema, CompressedCType } from '../types/CType'
import Crypto from '../crypto'
import IClaim from '../types/Claim'

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

export function verifyClaimStructure(
  claimContents: IClaim['contents'],
  schema: ICType['schema']
): boolean {
  if (!verifySchema(schema, CTypeModel)) {
    throw new Error('CType does not correspond to schema')
  }
  return verifySchema(claimContents, schema)
}

export function getHashForSchema(schema: ICType['schema']): string {
  const hashVal = {
    $schema: schema.$schema,
    properties: schema.properties,
    title: schema.title,
    type: schema.type,
  }
  return Crypto.hashObjectAsStr(hashVal)
}

/**
 *  Compresses a [[CType]] schema for storage and/or messaging.
 *
 * @param cTypeSchema A [[CType]] schema object that will be sorted and stripped for messaging or storage.
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
    throw new Error(
      `Property Not Provided while building cTypeSchema: 
      ${JSON.stringify(cTypeSchema, null, 2)}`
    )
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
 * @param cTypeSchema A compressesd [[CType]] schema array that is reverted back into an object.
 *
 * @returns An object that has the same properties as a [[CType]] schema.
 */

export function decompressSchema(
  cTypeSchema: CompressedCTypeSchema
): ICType['schema'] {
  if (!Array.isArray(cTypeSchema) || cTypeSchema.length !== 5) {
    throw new Error(
      'Compressed cTypeSchema isnt an Array or has all the required data types'
    )
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
  if (
    !cType.hash ||
    (typeof cType.owner === 'string'
      ? !checkAddress(cType.owner, 42)[0]
      : !(cType.owner === null)) ||
    !cType.schema
  ) {
    throw new Error(
      `Property Not Provided while building cType: ${JSON.stringify(
        cType,
        null,
        2
      )}`
    )
  }
  return [cType.hash, cType.owner, compressSchema(cType.schema)]
}

/**
 *  Decompresses a [[CType]] from storage and/or message.
 *
 * @param cType A compressesd [[CType]] array that is reverted back into an object.
 *
 * @returns An object that has the same properties as a [[CType]].
 */

export function decompress(cType: CompressedCType): ICType {
  if (!Array.isArray(cType) || cType.length !== 3) {
    throw new Error(
      'Compressed cType isnt an Array or has all the required data types'
    )
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
 * @param messages
 *
 * @returns Whether the contents is valid.
 */

export function validateNestedSchemas(
  cType: ICType['schema'],
  nestedCTypes: Array<ICType['schema']>,
  claimContents: object,
  messages?: string[]
): boolean {
  const ajv = new Ajv()
  ajv.addMetaSchema(CTypeModel)
  const validate = ajv.addSchema(nestedCTypes).compile(cType)
  const result = validate(claimContents)
  if (!result && ajv.errors) {
    if (messages) {
      ajv.errors.forEach((error: any) => {
        messages.push(error.message)
      })
    }
  }
  return !!result
}

export default {
  verifySchema,
  compressSchema,
  decompressSchema,
  decompress,
  compress,
  verifySchemaWithErrors,
  verifyClaimStructure,
  getHashForSchema,
  validateNestedSchemas,
}
