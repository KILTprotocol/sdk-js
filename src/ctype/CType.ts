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
  public static fromCType(cTypeInput: ICType): CType {
    if (!CTypeUtils.verifySchema(cTypeInput, CTypeWrapperModel)) {
      throw new Error('CType does not correspond to schema')
    }
    if (cTypeInput.hash) {
      if (CTypeUtils.getHashForSchema(cTypeInput.schema) !== cTypeInput.hash) {
        throw Error('provided and generated cType hash are not matching')
      }
    }
    return new CType(cTypeInput)
  }

  public hash: ICType['hash']
  public owner: ICType['owner'] | null
  public schema: ICType['schema']
  public metadata: ICType['metadata']

  public constructor(cTypeInput: ICType) {
    this.schema = cTypeInput.schema
    if (!cTypeInput.metadata) {
      throw new Error(`No metadata provided:${cTypeInput.metadata}`)
    }
    this.metadata = cTypeInput.metadata
    this.owner = cTypeInput.owner
    if (!cTypeInput.hash) {
      this.hash = CTypeUtils.getHashForSchema(this.schema)
    } else {
      this.hash = cTypeInput.hash
    }
  }

  public async store(identity: Identity): Promise<TxStatus> {
    return store(this, identity)
  }

  public verifyClaimStructure(claim: any): boolean {
    return CTypeUtils.verifySchema(claim, this.schema)
  }

  public async verifyStored(): Promise<boolean> {
    return (await getOwner(this.hash)) === this.owner
  }
}
