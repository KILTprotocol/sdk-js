/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * CTypes are the way the KILT protocol enables a Claimer or Attester or Verifier to create a [[Claim]] schema for creating specific credentials.
 *
 * * A CTYPE is a description of the [[Claim]] data structure, based on [JSON Schema](http://json-schema.org/).
 * * CTYPEs are published and stored by the creator and/or in an open storage registry.
 * * Anyone can use a CTYPE to create a new [[Claim]].
 *
 * @packageDocumentation
 */

import type {
  ICType,
  CTypeSchemaWithoutId,
  IClaim,
  ICTypeMetadata,
} from '@kiltprotocol/types'
import { Crypto, SDKErrors, JsonSchema } from '@kiltprotocol/utils'
import { Utils as DidUtils } from '@kiltprotocol/did'
import { ConfigService } from '@kiltprotocol/config'
import type { HexString } from '@polkadot/util/types'
import { fromChain } from './CType.chain.js'
import {
  CTypeModel,
  CTypeWrapperModel,
  MetadataModel,
} from './CType.schemas.js'

/**
 * Utility for (re)creating ctype hashes. For this, the $id property needs to be stripped from the CType schema.
 *
 * @param ctypeSchema The CType schema (with or without $id).
 * @returns CtypeSchema without the $id property.
 */
export function getSchemaPropertiesForHash(
  ctypeSchema: CTypeSchemaWithoutId | ICType['schema']
): Partial<ICType['schema']> {
  // We need to remove the CType ID from the CType before storing it on the blockchain
  // otherwise the resulting hash will be different, as the hash on chain would contain the CType ID,
  // which is itself a hash of the CType schema.
  const schemaWithoutId: Partial<ICType['schema']> =
    '$id' in ctypeSchema
      ? (ctypeSchema as ICType['schema'])
      : (ctypeSchema as CTypeSchemaWithoutId)
  const shallowCopy = { ...schemaWithoutId }
  delete shallowCopy.$id
  return shallowCopy
}

/**
 * Calculates the CType hash from a schema.
 *
 * @param schema The CType schema (with or without $id).
 * @returns Hash as hex string.
 */
export function getHashForSchema(
  schema: CTypeSchemaWithoutId | ICType['schema']
): HexString {
  const preparedSchema = getSchemaPropertiesForHash(schema)
  return Crypto.hashObjectAsStr(preparedSchema)
}

/**
 * Calculates the schema $id from a CType hash.
 *
 * @param hash CType hash as hex string.
 * @returns Schema id uri.
 */
export function getIdForCTypeHash(
  hash: ICType['hash']
): ICType['schema']['$id'] {
  return `kilt:ctype:${hash}`
}

/**
 * Calculates the schema $id for a CType schema by hashing it.
 *
 * @param schema CType schema for which to create schema id.
 * @returns Schema id uri.
 */
export function getIdForSchema(
  schema: CTypeSchemaWithoutId | ICType['schema']
): string {
  return getIdForCTypeHash(getHashForSchema(schema))
}

/**
 * Verifies data against CType schema or CType schema against meta-schema.
 *
 * @param object Data to be verified against schema.
 * @param schema Schema to verify against.
 * @param messages Optional empty array. If passed, this receives all verification errors.
 * @returns Whether or not verification was successful.
 */
export function verifyObjectAgainstSchema(
  object: Record<string, any>,
  schema: Record<string, any>,
  messages?: string[]
): boolean {
  const validator = new JsonSchema.Validator(schema, '7', false)
  if (schema.$id !== CTypeModel.$id) {
    validator.addSchema(CTypeModel)
  }
  const result = validator.validate(object)
  if (!result.valid && messages) {
    result.errors.forEach((error) => {
      messages.push(error.error)
    })
  }
  return result.valid
}

/**
 * Verifies the structure of the provided IClaim['contents'] with ICType['schema'].
 *
 * @param claimContents IClaim['contents'] to be verified against the schema.
 * @param schema ICType['schema'] to be verified against the [CTypeModel].
 * @param messages An array, which will be filled by schema errors.
 * @returns Boolean whether both claimContents and schema could be verified.
 */
export function verifyClaimAgainstSchema(
  claimContents: IClaim['contents'],
  schema: ICType['schema'],
  messages?: string[]
): boolean {
  if (!verifyObjectAgainstSchema(schema, CTypeModel)) {
    throw new SDKErrors.ObjectUnverifiableError()
  }
  return verifyObjectAgainstSchema(claimContents, schema, messages)
}

/**
 * Checks on the KILT blockchain whether a CType is registered.
 *
 * @param ctype CType data.
 * @returns Whether or not the CType is registered on-chain.
 */
export async function verifyStored(ctype: ICType): Promise<boolean> {
  const api = ConfigService.get('api')
  const encoded = await api.query.ctype.ctypes(ctype.hash)
  return encoded.isSome
}

/**
 * Checks on the KILT blockchain whether a CType is registered to the owner listed in the CType record.
 *
 * @param ctype CType data.
 * @returns Whether or not the CType is registered on-chain to `ctype.owner`.
 */
export async function verifyOwner(ctype: ICType): Promise<boolean> {
  const api = ConfigService.get('api')
  const encoded = await api.query.ctype.ctypes(ctype.hash)
  return encoded.isSome ? fromChain(encoded) === ctype.owner : false
}

/**
 * Checks whether the input meets all the required criteria of an ICType object.
 * Throws on invalid input.
 *
 * @param input The potentially only partial ICType.
 */
export function verifyDataStructure(input: ICType): void {
  if (!verifyObjectAgainstSchema(input, CTypeWrapperModel)) {
    throw new SDKErrors.ObjectUnverifiableError()
  }
  if (!('schema' in input) || getHashForSchema(input.schema) !== input.hash) {
    throw new SDKErrors.HashMalformedError(input.hash, 'CType')
  }
  if (getIdForSchema(input.schema) !== input.schema.$id) {
    throw new SDKErrors.CTypeIdMismatchError(
      getIdForSchema(input.schema),
      input.schema.$id
    )
  }
  if (!(input.owner === null || DidUtils.validateKiltDidUri(input.owner))) {
    throw new SDKErrors.CTypeOwnerTypeError()
  }
}

/**
 * Validates an array of [[CType]]s against a [[Claim]].
 *
 * @param cType - A [[CType]] that has nested [[CType]]s inside.
 * @param nestedCTypes - An array of [[CType]] schemas.
 * @param claimContents - The contents of a [[Claim]] to be validated.
 * @param messages - Optional empty array. If passed, this receives all verification errors.
 *
 * @returns Whether the contents is valid.
 */
export function verifyClaimAgainstNestedSchemas(
  cType: ICType['schema'],
  nestedCTypes: Array<ICType['schema']>,
  claimContents: Record<string, any>,
  messages?: string[]
): boolean {
  const validator = new JsonSchema.Validator(cType, '7', false)
  nestedCTypes.forEach((ctype) => {
    validator.addSchema(ctype)
  })
  validator.addSchema(CTypeModel)
  const result = validator.validate(claimContents)
  if (!result.valid && messages) {
    result.errors.forEach((error) => {
      messages.push(error.error)
    })
  }
  return result.valid
}

/**
 * Checks a CTypeMetadata object.
 *
 * @param metadata [[ICTypeMetadata]] that is to be instantiated.
 */
export function verifyCTypeMetadata(metadata: ICTypeMetadata): void {
  if (!verifyObjectAgainstSchema(metadata, MetadataModel)) {
    throw new SDKErrors.ObjectUnverifiableError()
  }
}

/**
 * Creates a new [[CType]] from an [[ICTypeSchema]].
 * _Note_ that you can either supply the schema as [[ICTypeSchema]] with the id
 * or without the id as [[CTypeSchemaWithoutId]] which will automatically generate it.
 *
 * @param schema The JSON schema from which the [[CType]] should be generated.
 * @param owner The public SS58 address of the owner of the [[CType]].
 *
 * @returns A ctype object with cTypeHash, owner and the schema.
 */
export function fromSchema(
  schema: CTypeSchemaWithoutId | ICType['schema'],
  owner?: ICType['owner']
): ICType {
  const ctype = {
    hash: getHashForSchema(schema),
    owner: owner || null,
    schema: {
      ...schema,
      $id: getIdForSchema(schema),
    },
  }
  verifyDataStructure(ctype)
  return ctype
}

/**
 * Custom Type Guard to determine input being of type ICType.
 *
 * @param input The potentially only partial ICType.
 *
 * @returns Boolean whether input is of type ICType.
 */
export function isICType(input: unknown): input is ICType {
  try {
    verifyDataStructure(input as ICType)
  } catch (error) {
    return false
  }
  return true
}
