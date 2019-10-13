/**
 * @module CType
 */

/**
 * Dummy comment needed for correct doc display, do not remove.
 */
import Ajv from 'ajv'

import { CTypeModel, CTypeInputModel } from './CTypeSchema'
import CType from './CType'
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

/**
 * Create the CTYPE model from a CTYPE input model (used in CTYPE editing components).
 * This is necessary because component editors rely on editing arrays of properties instead of
 * arbitrary properties of an object. Additionally the default language translations are integrated
 * into the input model and need to be separated for the CTYPE model.
 * This is the reverse function of CType.getCTypeInputModel(...).
 * @returns The CTYPE for the input model.
 */
export function fromInputModel(ctypeInput: any): CType {
  if (!verifySchema(ctypeInput, CTypeInputModel)) {
    throw new Error('CType input does not correspond to input model schema')
  }
  const ctype = {
    schema: {
      $id: ctypeInput.$id,
      $schema: CTypeModel.properties.$schema.default,
      properties: {},
      type: 'object',
    },
    metadata: {
      title: {
        default: ctypeInput.title,
      },
      description: {
        default: ctypeInput.description,
      },
      properties: {},
    },
  }

  const properties = {}
  ctypeInput.properties.forEach((p: any) => {
    const { title, $id, ...rest } = p
    properties[$id] = rest
    ctype.metadata.properties[$id] = {
      title: {
        default: title,
      },
    }
  })
  ctype.schema.properties = properties
  return CType.fromObject(ctype as ICType)
}

function getLocalized(o: any, lang?: string): any {
  if (lang == null || !o[lang]) {
    return o.default
  }
  return o[lang]
}

/**
 * Create the CTYPE input model for a CTYPE editing component form the CTYPE model.
 * This is necessary because component editors rely on editing arrays of properties instead of
 * arbitrary properties of an object. Additionally the default language translations are integrated
 * into the input model. This is the reverse function of CType.fromInputModel(...).
 * @returns The CTYPE input model.
 */
export function getCTypeInputModel(ctype: CType): any {
  // create clone
  const result = JSON.parse(JSON.stringify(ctype.schema))
  result.$schema = CTypeInputModel.$id
  result.title = getLocalized(ctype.metadata.title)
  result.description = getLocalized(ctype.metadata.description)
  result.required = []
  result.properties = []

  Object.entries(ctype.schema.properties as object).forEach(([key, value]) => {
    result.properties.push({
      title: getLocalized(ctype.metadata.properties[key].title),
      $id: key,
      type: value.type,
    })
    result.required.push(key)
  })

  return result
}

/**
 * This method creates an input model for a claim from a CTYPE.
 * It selects translations for a specific language from the localized part of the CTYPE meta data.
 * @param {string} lang the language to choose translations for
 * @returns {any} The claim input model
 */
export function getClaimInputModel(ctype: ICType, lang?: string): any {
  // create clone
  const result = JSON.parse(JSON.stringify(ctype.schema))
  result.title = getLocalized(ctype.metadata.title, lang)
  result.description = getLocalized(ctype.metadata.description, lang)
  result.required = []
  Object.entries(ctype.metadata.properties as object).forEach(
    ([key, value]) => {
      result.properties[key].title = getLocalized(value.title, lang)
      result.required.push(key)
    }
  )
  return result
}
