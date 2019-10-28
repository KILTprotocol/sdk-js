/**
 * CTypes are the way the KILT protocol enables a Claimer or Attester or Verifier to create a [[Claim]] schema for creating specific credentials.
 *  ***
 * * A CTYPE is a description of the [[Claim]] data structure, based on [JSON Schema](http://json-schema.org/).
 * * CTYPEs are published and stored by the creator and/or in an open storage registry.
 * * Anyone can use a CTYPE to create a new [[Claim]].
 * @module CType
 * @preferred
 */

/**
 * Dummy comment needed for correct doc display, do not remove
 */
import { CTypeWrapperModel } from './CTypeSchema'
import * as CTypeUtils from './CTypeUtils'
import ICType from '../types/CType'
import Identity from '../identity/Identity'
import { getOwner, store } from './CType.chain'
import TxStatus from '../blockchain/TxStatus'

export default class CType implements ICType {
  public static fromObject(obj: ICType): CType {
    const newObject = Object.create(CType.prototype)
    return Object.assign(newObject, obj)
  }

  public hash: ICType['hash']
  public owner?: ICType['owner']
  public schema: ICType['schema']

  public constructor(ctype: ICType) {
    if (!CTypeUtils.verifySchema(ctype, CTypeWrapperModel)) {
      throw new Error('CType does not correspond to schema')
    }
    this.schema = ctype.schema
    this.owner = ctype.owner
    this.hash = CTypeUtils.getHashForSchema(this.schema)

    if (ctype.hash && this.hash !== ctype.hash) {
      throw Error('provided and generated cType hash are not the same')
    }
  }

  public async store(identity: Identity): Promise<TxStatus> {
    return store(this, identity)
  }

  public verifyClaimStructure(claim: any): boolean {
    return CTypeUtils.verifySchema(claim, this.schema)
  }

  public getModel(): CType {
    return this
  }

  public async verifyStored(): Promise<boolean> {
    return (await getOwner(this.hash)) === this.owner
  }
}
