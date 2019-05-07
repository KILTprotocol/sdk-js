/**
 * @module CType
 */

import { CodecResult } from '@polkadot/api/promise/types'
import { SubmittableExtrinsic } from '@polkadot/api/SubmittableExtrinsic'
import Blockchain, { QueryResult } from '../blockchain/Blockchain'
import { TxStatus } from '../blockchain/TxStatus'
import { factory } from '../config/ConfigLog'
import Crypto from '../crypto'
import Identity from '../identity/Identity'
import { CTypeInputModel, CTypeModel, CTypeWrapperModel } from './CTypeSchema'
import * as CTypeUtils from './CTypeUtils'
import IPublicIdentity from '../types/PublicIdentity'
import ICType from '../types/CType'

const log = factory.getLogger('CType')

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
      const { title, $id, ...rest } = p
      properties[$id] = rest
      ctype.metadata.properties[$id] = {
        title: {
          default: title,
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
  public hash: ICType['hash']
  public owner?: ICType['owner']
  public schema: ICType['schema']
  public metadata: ICType['metadata']

  public constructor(ctype: ICType) {
    if (!CTypeUtils.verifySchema(ctype, CTypeWrapperModel)) {
      throw new Error('CType does not correspond to schema')
    }
    this.schema = ctype.schema
    this.metadata = ctype.metadata
    this.owner = ctype.owner

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
    result.title = CType.getLocalized(this.metadata.title, lang)
    result.description = CType.getLocalized(this.metadata.description, lang)
    result.required = []
    for (const x in this.metadata.properties) {
      if (this.metadata.properties.hasOwnProperty(x)) {
        result.properties[x].title = CType.getLocalized(
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
    result.title = CType.getLocalized(this.metadata.title)
    result.description = CType.getLocalized(this.metadata.description)
    result.required = []
    result.properties = []
    for (const x in this.schema.properties) {
      if (this.schema.properties.hasOwnProperty(x)) {
        const p = this.schema.properties[x]
        result.properties.push({
          title: CType.getLocalized(this.metadata.properties[x].title),
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
    const txStatus: TxStatus = await blockchain.submitTx(identity, tx)
    if (txStatus.type === 'Finalised') {
      this.owner = identity.address
    }
    return txStatus
  }

  public async verifyStored(blockchain: Blockchain): Promise<boolean> {
    return (await this.getOwnerOfCType(blockchain)) === this.owner
  }

  public async getOwnerOfCType(
    blockchain: Blockchain
  ): Promise<IPublicIdentity['address'] | undefined> {
    const encoded: QueryResult = await blockchain.api.query.ctype.cTYPEs(
      this.hash
    )
    const queriedCTypeAccount:
      | IPublicIdentity['address']
      | undefined = this.decode(encoded)
    return queriedCTypeAccount
  }

  protected decode(
    encoded: QueryResult
  ): IPublicIdentity['address'] | undefined {
    return encoded && encoded.encodedLength ? encoded.toString() : undefined
  }

  // ----------------------------------------------------------------------------------------------

  private static getLocalized(o: any, lang?: string): any {
    if (lang == null || !o[lang]) {
      return o.default
    }
    return o[lang]
  }
}
