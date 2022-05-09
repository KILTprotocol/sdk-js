/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  IClaim,
  ICType,
  CompressedCType,
  CTypeSchemaWithoutId,
  SubmittableExtrinsic,
} from '@kiltprotocol/types'
import { getStoreTx } from './CType.chain.js'
import * as CTypeUtils from './CType.utils.js'

/**
 * CTypes are the way the KILT protocol enables a Claimer or Attester or Verifier to create a [[Claim]] schema for creating specific credentials.
 *
 * * A CTYPE is a description of the [[Claim]] data structure, based on [JSON Schema](http://json-schema.org/).
 * * CTYPEs are published and stored by the creator and/or in an open storage registry.
 * * Anyone can use a CTYPE to create a new [[Claim]].
 */
export class CType implements ICType {
  /**
   * [STATIC] Clones an already existing [[CType]]
   * or initializes from an [[ICType]] like object
   * which is non-initialized and non-verified CType data.
   *
   * @param cTypeInput The [[CType]] which shall be cloned.
   *
   * @returns A copy of the given [[CType]].
   */
  public static fromCType(cTypeInput: ICType): CType {
    return new CType(cTypeInput)
  }

  /**
   *  [STATIC] Creates a new [[CType]] from an [[ICTypeSchema]].
   *  _Note_ that you can either supply the schema as [[ICTypeSchema]] with the id
   *  or without the id as [[CTypeSchemaWithoutId]] which will automatically generate it.
   *
   * @param schema The JSON schema from which the [[CType]] should be generated.
   * @param owner The public SS58 address of the owner of the [[CType]].
   *
   * @returns An instance of [[CType]].
   */
  public static fromSchema(
    schema: CTypeSchemaWithoutId | ICType['schema'],
    owner?: ICType['owner']
  ): CType {
    return new CType({
      hash: CTypeUtils.getHashForSchema(schema),
      owner: owner || null,
      schema: {
        ...schema,
        $id: CTypeUtils.getIdForSchema(schema),
      },
    })
  }

  /**
   *  [STATIC] Custom Type Guard to determine input being of type ICType using the CTypeUtils errorCheck.
   *
   * @param input The potentially only partial ICType.
   *
   * @returns Boolean whether input is of type ICType.
   */
  static isICType(input: unknown): input is ICType {
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
    this.hash = cTypeInput.hash
  }

  /**
   * [ASYNC] Stores the [[CType]] on the blockchain.
   *
   * @returns A promise of a unsigned SubmittableExtrinsic.
   */
  public async getStoreTx(): Promise<SubmittableExtrinsic> {
    return getStoreTx(this)
  }

  /**
   *  Verifies whether a [[Claim]] follows this [[CType]]'s schema.
   *
   * @param claim The [[Claim]] we want to check against.
   * @returns Whether the [[Claim]] and the schema align.
   */
  public verifyClaimStructure(claim: IClaim): boolean {
    return CTypeUtils.verifySchema(claim.contents, this.schema)
  }

  /**
   * [ASYNC] Check whether the [[CType]]'s hash has been registered to the blockchain.
   *
   * @returns Whether the [[CType]] hash is registered to the blockchain.
   */
  public async verifyStored(): Promise<boolean> {
    return CTypeUtils.verifyStored(this)
  }

  /**
   * [ASYNC] Check whether the current owner of [[CType]] matches the one stored on the blockchain. Returns true iff:
   * - The [[CType]] is registered on-chain
   * - The owner property of the [[CType]] matches the registered owner
   * If the owner property is not set this method will always return false because the blockchain always stores the
   * submitter as owner.
   *
   * @returns Whether the owner of this [[CType]] matches the one stored on the blockchain.
   */
  public async verifyOwner(): Promise<boolean> {
    return CTypeUtils.verifyOwner(this)
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
