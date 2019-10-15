/**
 * @module CType
 */

/**
 * Dummy comment needed for correct doc display, do not remove.
 */
import Ajv from 'ajv'
import { CTypeModel } from './CTypeSchema'
import ICType from '../types/CType'
import Crypto from '../crypto'

export function verifySchemaWithErrors(
  model: any,
  metaModel: any,
  messages?: string[]
): boolean {
  const ajv = new Ajv()
  ajv.addMetaSchema(CTypeModel)
  const result = ajv.validate(metaModel, model)
  if (!result && ajv.errors) {
    if (messages) {
      ajv.errors.forEach((error: any) => {
        messages.push(error.message)
      })
    }
  }
  return !!result
}

export function verifySchema(model: any, metaModel: any): boolean {
  return verifySchemaWithErrors(model, metaModel)
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
