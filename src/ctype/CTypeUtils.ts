/**
 * @packageDocumentation
 * @module CTypeUtils
 * @preferred
 */

import Ajv from 'ajv'
import { CTypeModel } from './CTypeSchema'
import ICType from '../types/CType'
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
  return Crypto.hashObjectAsStr(schema)
}

export default {
  verifySchema,
  verifySchemaWithErrors,
  verifyClaimStructure,
  getHashForSchema,
}
