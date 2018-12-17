import Ajv from 'ajv'
import { CTypeModel, CTypeInputModel, CTypeWrapperModel } from './CTypeSchema'
import { Error } from 'tslint/lib/error'
import Crypto from '../crypto/Crypto'

export default class CType {
  ctype: any

  public constructor(ctype: any) {
    if (!CType.verifySchema(ctype, CTypeWrapperModel)) {
      throw new Error('CType not correspond to schema')
    }
    this.ctype = ctype

    if (!this.ctype.hash) {
      this.ctype.hash = Crypto.hash(JSON.stringify(this.ctype.schema))
    }
  }

  public verifyClaimStructure(claim: any): boolean {
    return CType.verifySchema(claim, this.ctype.schema)
  }

  public getModel(): any {
    return this.ctype
  }

  private getLocalized(o: any, lang?: string): any {
    if (lang == null || !o[lang]) return o.default
    return o[lang]
  }

  /**
   * This method creates an input model for a claim from a CTYPE.
   * It selects translations for a specific language from the localized part of the CTYPE meta data.
   * @param {string} lang the language to choose translations for
   * @returns {any} The claim input model
   */
  public getClaimInputModel(lang?: string): any {
    // create clone
    let result = JSON.parse(JSON.stringify(this.ctype.schema))
    result.title = this.getLocalized(this.ctype.metadata.title, lang)
    result.description = this.getLocalized(
      this.ctype.metadata.description,
      lang
    )
    result.required = []
    for (let x in this.ctype.metadata.properties) {
      result.properties[x].title = this.getLocalized(
        this.ctype.metadata.properties[x].title,
        lang
      )
      result.required.push(x)
    }
    return result
  }

  /**
   * Create the CTYPE input model for a CTYPE editing component form the CTYPE model.
   * This is necessary because component editors rely on editing arrays of properties instead of
   * arbitrary properties of an object. Additionally the default language translations are integrated
   * into the input model. This is the reverse function of CType.fromInputModel(...).
   * @returns {any} The CTYPE input model.
   */
  public getCTypeInputModel(): any {
    // create clone
    let result = JSON.parse(JSON.stringify(this.ctype.schema))
    result['$schema'] = CTypeInputModel.$id
    result.title = this.getLocalized(this.ctype.metadata.title)
    result.description = this.getLocalized(this.ctype.metadata.description)
    result.required = []
    result.properties = []
    for (let x in this.ctype.schema.properties) {
      let p = this.ctype.schema.properties[x]
      result.properties.push({
        title: this.getLocalized(this.ctype.metadata.properties[x].title),
        $id: x,
        type: p['type'],
      })
      result.required.push(x)
    }
    return result
  }

  private static verifySchema(model: any, metaModel: any): boolean {
    return CType.verifySchemaWithErrors(model, metaModel)
  }

  private static verifySchemaWithErrors(
    model: any,
    metaModel: any,
    messages?: [string]
  ): boolean {
    const ajv = new Ajv({
      meta: false,
    })
    ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-07.json'))
    ajv.addMetaSchema(CTypeModel)
    let result = ajv.validate(metaModel, model)
    if (!result && ajv.errors) {
      ajv.errors.map((error: any) => {
        if (messages) messages.push(error.message)
      })
    }
    return result ? true : false
  }

  /**
   * Create the CTYPE model from a CTYPE input model (used in CTYPE editing components).
   * This is necessary because component editors rely on editing arrays of properties instead of
   * arbitrary properties of an object. Additionally the default language translations are integrated
   * into the input model and need to be separated for the CTYPE model.
   * This is the reverse function of CType.getCTypeInputModel(...).
   * @returns {any} The CTYPE for the input model.
   */
  public static fromInputModel(ctypeInput: any): any {
    if (!CType.verifySchema(ctypeInput, CTypeInputModel)) {
      throw new Error('CType input does not correspond to schema')
    }
    let ctype = {
      schema: {
        $id: ctypeInput.$id,
        $schema: CTypeModel.$id,
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

    let properties = {}
    for (let i = 0; i < ctypeInput.properties.length; i++) {
      let p = ctypeInput.properties[i]
      properties[p['$id']] = { type: p.type }
      ctype.metadata.properties[p['$id']] = {
        title: {
          default: p.title,
        },
      }
    }
    ctype.schema.properties = properties
    return new CType(ctype)
  }

  public static verifyClaimStructure(claim: any, schema: any): boolean {
    if (!CType.verifySchema(schema, CTypeModel)) {
      throw new Error('CType does not correspond to schema')
    }
    return CType.verifySchema(claim, schema)
  }
}
