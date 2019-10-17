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
import IClaim from '../types/Claim'

export function verifySchemaWithErrors(
  model: object,
  metaModel: object,
  messages?: string[]
): boolean {
  // would like to change these to something more meaningful other then object
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

export function verifySchema(model: object, metaModel: object): boolean {
  // would like to change these to something more meaningful other then object
  return verifySchemaWithErrors(model, metaModel)
}

export function verifyClaimStructure(
  claimContents: IClaim['contents'], // Checking the SDK and demo-client I feel this should be named claimContents
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
