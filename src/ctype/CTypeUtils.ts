import Ajv from 'ajv'
import { CTypeModel } from './CTypeSchema'

export function verifyClaimStructure(claim: any, schema: any): boolean {
  if (!verifySchema(schema, CTypeModel)) {
    throw new Error('CType does not correspond to schema')
  }
  return verifySchema(claim, schema)
}

export function verifySchema(model: any, metaModel: any): boolean {
  return verifySchemaWithErrors(model, metaModel)
}

export function verifySchemaWithErrors(
  model: any,
  metaModel: any,
  messages?: [string]
): boolean {
  const ajv = new Ajv({
    meta: false,
  })
  ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-07.json'))
  ajv.addMetaSchema(CTypeModel)
  const result = ajv.validate(metaModel, model)
  if (!result && ajv.errors) {
    ajv.errors.map((error: any) => {
      if (messages) {
        messages.push(error.message)
      }
    })
  }
  return result ? true : false
}
