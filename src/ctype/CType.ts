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
import { validateAddress } from '../util/DataUtils'
import { CTypeWrapperModel } from './CTypeSchema'
import CTypeUtils from './CType.utils'
import ICType, { CompressedCType } from '../types/CType'
import Identity from '../identity/Identity'
import { getOwner, store } from './CType.chain'
import IClaim from '../types/Claim'

export default class CType implements ICType {
  public static fromCType(cTypeInput: ICType): CType {
    return new CType(cTypeInput)
  }

  public static fromSchema(
    schema: ICType['schema'],
    owner?: ICType['owner']
  ): CType {
    return new CType({
      hash: CTypeUtils.getHashForSchema(schema),
      owner: owner || null,
      schema,
    })
  }

  static isICType(input: ICType): input is ICType {
    if (!CTypeUtils.verifySchema(input, CTypeWrapperModel)) {
      throw new Error('CType does not correspond to schema')
    }
    if (CTypeUtils.getHashForSchema(input.schema) !== input.hash) {
      throw new Error('provided CType hash not matching calculated hash')
    }
    if (
      typeof input.owner === 'string'
        ? !validateAddress(input.owner, 'CType Owner')
        : !(input.owner === null)
    ) {
      throw new Error('CType owner unknown data')
    }
    return true
  }

  public hash: ICType['hash']
  public owner: ICType['owner'] | null
  public schema: ICType['schema']

  public constructor(cTypeInput: ICType) {
    CType.isICType(cTypeInput)
    this.schema = cTypeInput.schema
    this.owner = cTypeInput.owner
    this.hash = cTypeInput.hash
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
