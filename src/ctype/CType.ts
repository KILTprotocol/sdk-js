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

import { CTypeWrapperModel } from './CTypeSchema'
import * as CTypeUtils from './CTypeUtils'
import ICType from '../types/CType'
import Identity from '../identity/Identity'
import { getOwner, store } from './CType.chain'
import TxStatus from '../blockchain/TxStatus'
import IClaim from '../types/Claim'

export function compressCTypeSchema(cTypeSchema: ICType['schema']): any[] {
  return [
    cTypeSchema.$id,
    cTypeSchema.$schema,
    cTypeSchema.properties,
    cTypeSchema.type,
  ]
}

export function compressCType(cType: ICType): any[] {
  return [compressCTypeSchema(cType.schema), cType.owner || null, cType.hash]
}

export function decompressCTypeSchema(cTypeSchema: any): ICType['schema'] {
  return {
    $id: cTypeSchema[0],
    $schema: cTypeSchema[1],
    properties: cTypeSchema[2],
    type: cTypeSchema[3],
  }
}

export function decompressCType(cType: any[]): ICType {
  return {
    schema: decompressCTypeSchema(cType[0]),
    owner: cType[1],
    hash: cType[2],
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

  public compress(): any[] {
    return compressCType(this)
  }

  public static decompress(cType: any[]): CType {
    const decompressedCType = decompressCType(cType)
    return CType.fromCType(decompressedCType)
  }
}
