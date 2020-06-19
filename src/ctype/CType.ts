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
import CTypeUtils from './CType.utils'
import ICType, { CompressedCType } from '../types/CType'
import Identity from '../identity/Identity'
import { store } from './CType.chain'
import IClaim from '../types/Claim'

export default class CType implements ICType {
  public static fromCType(cTypeInput: ICType): CType {
    return new CType(cTypeInput)
  }

  public static fromSchema(
    schema: ICType['schema'],
    owner?: ICType['owner']
  ): CType {
    // eslint-disable-next-line no-param-reassign
    schema.$id = `kilt:ctype:${CTypeUtils.getHashForSchema(schema)}`
    return new CType({
      hash: CTypeUtils.getHashForSchema(schema),
      owner: owner || null,
      schema,
    })
  }

  /**
   *  [STATIC] Custom Type Guard to determine input being of type ICType using the CTypeUtils errorCheck.
   *
   * @param input The potentially only partial ICType.
   *
   * @returns Boolean whether input is of type ICType.
   */
  static isICType(input: object): input is ICType {
    try {
      CTypeUtils.errorCheck(input as ICType)
    } catch (error) {
      return false
    }
    return true
  }

  public hash: ICType['hash']
  public owner: ICType['owner'] | null
  public schema: ICType['schema']

  public constructor(cTypeInput: ICType) {
    CTypeUtils.errorCheck(cTypeInput)
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
    return CTypeUtils.verifyStored(this)
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
