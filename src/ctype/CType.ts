/**
 * CTypes are the way the KILT protocol enables a Claimer or Attester or Verifier to create a [[Claim]] schema for creating specific credentials.
 *
 * * A CTYPE is a description of the [[Claim]] data structure, based on [JSON Schema](http://json-schema.org/).
 * * CTYPEs are published and stored by the creator and/or in an open storage registry.
 * * Anyone can use a CTYPE to create a new [[Claim]].
 *
 * @packageDocumentation
 * @module CType
 * @preferred
 */

import { SubmittableResult } from '@polkadot/api'
import { CTypeWrapperModel } from './CTypeSchema'
import CTypeUtils from './CType.utils'
import ICType, { CompressedCType } from '../types/CType'
import Identity from '../identity/Identity'
import { getOwner, store } from './CType.chain'
import IClaim from '../types/Claim'

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

  public constructor(cTypeInput: ICType) {
    this.schema = cTypeInput.schema
    this.owner = cTypeInput.owner

    if (!cTypeInput.hash) {
      this.hash = CTypeUtils.getHashForSchema(this.schema)
      this.schema.$id = `kilt:ctype:${CTypeUtils.getHashForSchema(this.schema)}`
    } else {
      if (CTypeUtils.getHashForSchema(cTypeInput.schema) !== cTypeInput.hash) {
        throw Error('provided and generated cType hash are not matching')
      }
      this.hash = cTypeInput.hash
      if (
        cTypeInput.schema.$id !==
        `kilt:ctype:${CTypeUtils.getHashForSchema(this.schema)}`
      ) {
        throw Error('Provided and generated $id are not matching')
      }
      this.schema.$id = `kilt:ctype:${cTypeInput.hash}`
    }
  }

  public async store(identity: Identity): Promise<SubmittableResult> {
    return store(this, identity)
  }

  public verifyClaimStructure(claim: IClaim): boolean {
    return CTypeUtils.verifySchema(claim.contents, this.schema)
  }

  public async verifyStored(): Promise<boolean> {
    const actualOwner = await getOwner(this.hash)
    return this.owner ? actualOwner === this.owner : actualOwner !== null
  }

  /**
   * Compresses an [[CType]] object.
   *
   * @returns An array that contains the same properties of an [[CType]].
   */

  public compress(): CompressedCType {
    return CTypeUtils.compress(this)
  }

  /**
   * [STATIC] Builds an [[CType]] from the decompressed array.
   *
   * @param cType The [[CompressedCType]] that should get decompressed.
   * @returns A new [[CType]] object.
   */
  public static decompress(cType: CompressedCType): CType {
    const decompressedCType = CTypeUtils.decompress(cType)
    return CType.fromCType(decompressedCType)
  }
}
