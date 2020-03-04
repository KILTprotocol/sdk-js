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

import * as jsonabc from 'jsonabc'
import { CTypeWrapperModel } from './CTypeSchema'
import * as CTypeUtils from './CTypeUtils'
import ICType, { ICTypeSchema } from '../types/CType'
import Identity from '../identity/Identity'
import { getOwner, store } from './CType.chain'
import TxStatus from '../blockchain/TxStatus'

import IClaim from '../types/Claim'

type CompressedCTypeSchema = [
  ICTypeSchema['$id'],
  ICTypeSchema['$schema'],
  ICTypeSchema['properties'],
  ICTypeSchema['type']
]

export type CompressedCType = [
  CType['hash'],
  CType['owner'],
  CompressedCTypeSchema
]

/**
 *  Compresses a [[CType]] schema for storage and/or messaging.
 *
 * @param cTypeSchema A [[CType]] schema object that will be sorted and stripped for messaging or storage.
 *
 * @returns An ordered array of a [[CType]] schema.
 */

export function compressCTypeSchema(
  cTypeSchema: ICType['schema']
): CompressedCTypeSchema {
  const sortedCTypeSchema = jsonabc.sortObj(cTypeSchema)
  return [
    sortedCTypeSchema.$id,
    sortedCTypeSchema.$schema,
    sortedCTypeSchema.properties,
    sortedCTypeSchema.type,
  ]
}

/**
 *  Decompresses a schema of a [[CType]] from storage and/or message.
 *
 * @param cTypeSchema A compressesd [[CType]] schema array that is reverted back into an object.
 *
 * @returns An object that has the same properties as a [[CType]] schema.
 */

export function decompressCTypeSchema(
  cTypeSchema: CompressedCTypeSchema
): ICType['schema'] {
  return {
    $id: cTypeSchema[0],
    $schema: cTypeSchema[1],
    properties: cTypeSchema[2],
    type: cTypeSchema[3],
  }
}

/**
 *  Compresses a [[CType]] for storage and/or messaging.
 *
 * @param cType A [[CType]] object that will be sorted and stripped for messaging or storage.
 *
 * @returns An ordered array of a [[CType]].
 */

export function compressCType(cType: ICType): CompressedCType {
  return [cType.hash, cType.owner, compressCTypeSchema(cType.schema)]
}

/**
 *  Decompresses a [[CType]] from storage and/or message.
 *
 * @param cType A compressesd [[CType]] array that is reverted back into an object.
 *
 * @returns An object that has the same properties as a [[CType]].
 */

export function decompressCType(cType: CompressedCType): ICType {
  return {
    hash: cType[0],
    owner: cType[1],
    schema: decompressCTypeSchema(cType[2]),
  }
}

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
    } else {
      this.hash = cTypeInput.hash
    }
  }

  public async store(identity: Identity): Promise<TxStatus> {
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
   * Compresses an [[CType]] object from the [[compressCType]].
   *
   * @returns An array that contains the same properties of an [[CType]].
   */

  public compress(): CompressedCType {
    return compressCType(this)
  }

  /**
   * [STATIC] Builds an [[CType]] from the decompressed array.
   *
   * @returns A new [[CType]] object.
   */

  public static decompress(cType: CompressedCType): CType {
    const decompressedCType = decompressCType(cType)
    return CType.fromCType(decompressedCType)
  }
}
