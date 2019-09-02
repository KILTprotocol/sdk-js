/**
 *  ### Overview
 *
 *  The KILT protocol places claim standardisation at the centre of the protocol by enabling Attesters to use a certain claim schema for creating specific credentials
 *
 *  CTYPE metadata contains additional information about the fields of a CTYPE
 *
 *  ### Usage
 *
 *  * CTYPE's in KILT is the JSON-description of a data structure. It contains a list of key-value pairs.
 *  * CTYPEs are published and stored by the creator and/or in an open storage registry
 *  * Anyone can use a CTYPE to create a new claim.
 *
 * @module CType
 * @preferred
 */

/**
 * Dummy comment, so that typedoc ignores this file
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
  public metadata: ICType['metadata']

  public constructor(ctype: ICType) {
    if (!CTypeUtils.verifySchema(ctype, CTypeWrapperModel)) {
      throw new Error('CType does not correspond to schema')
    }
    this.schema = ctype.schema
    this.metadata = ctype.metadata
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
