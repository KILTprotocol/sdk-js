/**
 * @module CType
 */

import { CodecResult } from '@polkadot/api/promise/types'
import SubmittableExtrinsic from '@polkadot/api/SubmittableExtrinsic'
import { Codec } from '@polkadot/types/types'
import Identity from '../identity/Identity'
import { TxStatus } from '../blockchain/TxStatus'
import Blockchain from '../blockchain/Blockchain'
import { factory } from '../config/ConfigLog'
import Crypto from '../crypto'
import { CTypeInputModel, CTypeModel, CTypeWrapperModel } from './CTypeSchema'
import * as CTypeUtils from './CTypeUtils'

const log = factory.getLogger('CType')

export type CTypeSchema = {
  $id: any
  $schema: any
  properties: any
  type: 'object'
}

export type CtypeMetadata = {
  title: {
    default: string
  }
  description: {
    default: string
  }
  properties: any
}

export interface ICType {
  hash?: string
  schema: CTypeSchema
  metadata: CtypeMetadata
}

export default class CType implements ICType {
  /**
   * Create the CTYPE model from a CTYPE input model (used in CTYPE editing components).
   * This is necessary because component editors rely on editing arrays of properties instead of
   * arbitrary properties of an object. Additionally the default language translations are integrated
   * into the input model and need to be separated for the CTYPE model.
   * This is the reverse function of CType.getCTypeInputModel(...).
   * @returns The CTYPE for the input model.
   */
  public static fromInputModel(ctypeInput: any): CType {
    if (!CTypeUtils.verifySchema(ctypeInput, CTypeInputModel)) {
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
    } as ICType

    const properties = {}
    for (const p of ctypeInput.properties) {
      properties[p.$id] = { type: p.type }
      ctype.metadata.properties[p.$id] = {
        title: {
          default: p.title,
        },
      }
    }
    ctype.schema.properties = properties
    return new CType(ctype)
  }

  public static fromObject(obj: ICType): CType {
    const newObject = Object.create(CType.prototype)
    return Object.assign(newObject, obj)
  }
  public hash: string
  public schema: CTypeSchema
  public metadata: CtypeMetadata

  public constructor(ctype: ICType) {
    if (!CTypeUtils.verifySchema(ctype, CTypeWrapperModel)) {
      throw new Error('CType does not correspond to schema')
    }
    this.schema = ctype.schema
    this.metadata = ctype.metadata

    this.hash = Crypto.hashStr(JSON.stringify(this.schema))

    if (ctype.hash && this.hash !== ctype.hash) {
      throw Error('provided and generated cType hash are not the same')
    }
  }

  public verifyClaimStructure(claim: any): boolean {
    return CTypeUtils.verifySchema(claim, this.schema)
  }

  public getModel(): CType {
    return this
  }

  /**
   * This method creates an input model for a claim from a CTYPE.
   * It selects translations for a specific language from the localized part of the CTYPE meta data.
   * @param {string} lang the language to choose translations for
   * @returns {any} The claim input model
   */
  public getClaimInputModel(lang?: string): any {
    // create clone
    const result = JSON.parse(JSON.stringify(this.schema))
    result.title = this.getLocalized(this.metadata.title, lang)
    result.description = this.getLocalized(this.metadata.description, lang)
    result.required = []
    for (const x in this.metadata.properties) {
      if (this.metadata.properties.hasOwnProperty(x)) {
        result.properties[x].title = this.getLocalized(
          this.metadata.properties[x].title,
          lang
        )
        result.required.push(x)
      }
    }
    return result
  }

  /**
   * Create the CTYPE input model for a CTYPE editing component form the CTYPE model.
   * This is necessary because component editors rely on editing arrays of properties instead of
   * arbitrary properties of an object. Additionally the default language translations are integrated
   * into the input model. This is the reverse function of CType.fromInputModel(...).
   * @returns The CTYPE input model.
   */
  public getCTypeInputModel(): any {
    // create clone
    const result = JSON.parse(JSON.stringify(this.schema))
    result.$schema = CTypeInputModel.$id
    result.title = this.getLocalized(this.metadata.title)
    result.description = this.getLocalized(this.metadata.description)
    result.required = []
    result.properties = []
    for (const x in this.schema.properties) {
      if (this.schema.properties.hasOwnProperty(x)) {
        const p = this.schema.properties[x]
        result.properties.push({
          title: this.getLocalized(this.metadata.properties[x].title),
          $id: x,
          type: p.type,
        })
        result.required.push(x)
      }
    }
    return result
  }

  // --- Blockchain operations --------------------------------------------------------------------

  public async store(
    blockchain: Blockchain,
    identity: Identity
  ): Promise<TxStatus> {
    log.debug(() => `Create tx for 'ctype.add'`)
    const tx: SubmittableExtrinsic<
      CodecResult,
      any
    > = await blockchain.api.tx.ctype.add(this.hash)
    return blockchain.submitTx(identity, tx)
  }

  public async verifyStored(blockchain: Blockchain): Promise<boolean> {
    const encoded:
      | Codec
      | null
      | undefined = await blockchain.api.query.ctype.cTYPEs(this.hash)
    const queriedCTypeHash: ICType['hash'] | undefined = this.decode(encoded)
    return queriedCTypeHash !== undefined && queriedCTypeHash === this.hash
  }

  protected decode(
    encoded: Codec | null | undefined
  ): ICType['hash'] | undefined {
    const json = encoded && encoded.encodedLength ? encoded.toJSON() : null
    // just return the hash part of the ctype
    if (json instanceof Array) {
      return json[0]
    }
    return undefined
  }

  // ----------------------------------------------------------------------------------------------

  private getLocalized(o: any, lang?: string): any {
    if (lang == null || !o[lang]) {
      return o.default
    }
    return o[lang]
  }
}
