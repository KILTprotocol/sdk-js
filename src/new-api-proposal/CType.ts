import { Codec } from '@polkadot/types/types'
import { Identity } from 'src'
import Crypto from 'src/crypto'
import { CtypeMetadata, CTypeSchema } from 'src/ctype/CType'
import { CTypeInputModel, CTypeWrapperModel } from 'src/ctype/CTypeSchema'
import * as CTypeUtils from 'src/ctype/CTypeUtils'
import { BlockchainApiConnection } from './BlockchainApiConnection'
import { TxStatus } from './TxStatus'
import { IBlockchainApi } from './BlockchainApi'

interface ICType {
  hash?: string
  schema: CTypeSchema
  metadata: CtypeMetadata

  verifyClaimStructure(claim: any): boolean
  getClaimInputModel(lang?: string): any
  getCTypeInputModel(): any

  store(identity: Identity): Promise<TxStatus>
  verifyStored(): Promise<boolean>
}

class CType implements ICType {
  public hash?: string
  public schema: CTypeSchema
  public metadata: CtypeMetadata

  constructor(schema: CTypeSchema, metadata: CtypeMetadata, hash?: string) {
    this.schema = schema
    this.metadata = metadata

    this.hash = Crypto.hashStr(JSON.stringify(this.schema))

    if (hash && this.hash !== hash) {
      throw Error('provided and generated cType hash are not the same')
    }

    if (!CTypeUtils.verifySchema(this, CTypeWrapperModel)) {
      throw new Error('CType does not correspond to schema')
    }
  }

  public verifyClaimStructure(claim: any): boolean {
    return CTypeUtils.verifySchema(claim, this.schema)
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

  public async store(identity: Identity): Promise<TxStatus> {
    const blockchain: IBlockchainApi = await BlockchainApiConnection.get()
    const tx: any = await blockchain.api.tx.ctype.add(this.hash)
    return await blockchain.submitTx(identity, tx)
  }

  public async verifyStored(): Promise<boolean> {
    const blockchain: IBlockchainApi = await BlockchainApiConnection.get()
    const encoded:
      | Codec
      | null
      | undefined = await blockchain.api.query.ctype.cTYPEs(this.hash)
    return (encoded && encoded.encodedLength > 0) || false
  }

  private getLocalized(o: any, lang?: string): any {
    if (lang == null || !o[lang]) {
      return o.default
    }
    return o[lang]
  }
}

export { ICType, CType }
