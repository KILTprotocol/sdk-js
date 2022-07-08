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
  CompressedCType,
  CompressedCTypeSchema,
} from '@kiltprotocol/types'
import { Crypto, SDKErrors, JsonSchema, jsonabc } from '@kiltprotocol/utils'
import { Utils as DidUtils } from '@kiltprotocol/did'
import { HexString } from '@polkadot/util/types'
import { getOwner, isStored } from './CType.chain.js'
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
 * @throws [[ObjectUnverifiableError]] when schema does not correspond to the CTypeModel.
 *
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
  return isStored(ctype.hash)
}

/**
 * Checks on the KILT blockchain whether a CType is registered to the owner listed in the CType record.
 *
 * @param ctype CType data.
 * @returns Whether or not the CType is registered on-chain to `ctype.owner`.
 */
export async function verifyOwner(ctype: ICType): Promise<boolean> {
  const owner = await getOwner(ctype.hash)
  return owner ? owner === ctype.owner : false
}

/**
 * Checks whether the input meets all the required criteria of an ICType object.
 * Throws on invalid input.
 *
 * @param input The potentially only partial ICType.
 * @throws [[ObjectUnverifiableError]] when input does not correspond to either it's schema, or the CTypeWrapperModel.
 * @throws [[HashMalformedError]] when the input's hash does not match the hash calculated from ICType's schema.
 * @throws [[CTypeOwnerTypeError]] when the input's owner is not a DID or null.
 *
 */
export function verifyDataStructure(input: ICType): void {
  if (!verifyObjectAgainstSchema(input, CTypeWrapperModel)) {
    throw new SDKErrors.ObjectUnverifiableError()
  }
  if (!input.schema || getHashForSchema(input.schema) !== input.hash) {
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
 * @throws [[ObjectUnverifiableError]] when metadata is not verifiable with the MetadataModel.
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

/**
 * Compresses a [[CType]] schema for storage and/or messaging.
 *
 * @param cTypeSchema A [[CType]] schema object that will be sorted and stripped for messaging or storage.
 * @throws [[CompressObjectError]] when any of the four required properties of the cTypeSchema are missing.
 *
 * @returns An ordered array of a [[CType]] schema.
 */
export function compressSchema(
  cTypeSchema: ICType['schema']
): CompressedCTypeSchema {
  if (
    !cTypeSchema.$id ||
    !cTypeSchema.$schema ||
    !cTypeSchema.title ||
    !cTypeSchema.properties ||
    !cTypeSchema.type
  ) {
    throw new SDKErrors.CompressObjectError(cTypeSchema, 'cTypeSchema')
  }
  const sortedCTypeSchema = jsonabc.sortObj(cTypeSchema)
  return [
    sortedCTypeSchema.$id,
    sortedCTypeSchema.$schema,
    sortedCTypeSchema.title,
    sortedCTypeSchema.properties,
    sortedCTypeSchema.type,
  ]
}

/**
 * Decompresses a schema of a [[CType]] from storage and/or message.
 *
 * @param cTypeSchema A compressed [[CType]] schema array that is reverted back into an object.
 * @throws [[DecompressionArrayError]] when either the cTypeSchema is not an Array or it's length is not equal to the defined length of 4.
 *
 * @returns An object that has the same properties as a [[CType]] schema.
 */
export function decompressSchema(
  cTypeSchema: CompressedCTypeSchema
): ICType['schema'] {
  if (!Array.isArray(cTypeSchema) || cTypeSchema.length !== 5) {
    throw new SDKErrors.DecompressionArrayError('cTypeSchema')
  }
  return {
    $id: cTypeSchema[0],
    $schema: cTypeSchema[1],
    title: cTypeSchema[2],
    properties: cTypeSchema[3],
    type: cTypeSchema[4],
  }
}

/**
 * Compresses a [[CType]] for storage and/or messaging.
 *
 * @param cType A [[CType]] object that will be sorted and stripped for messaging or storage.
 *
 * @returns An ordered array of a [[CType]].
 */
export function compress(cType: ICType): CompressedCType {
  verifyDataStructure(cType)
  return [cType.hash, cType.owner, compressSchema(cType.schema)]
}

/**
 * Decompresses a [[CType]] from storage and/or message.
 *
 * @param cType A compressed [[CType]] array that is reverted back into an object.
 * @throws [[DecompressionArrayError]] when either the cType is not an Array or it's length is not equal to the defined length of 3.
 *
 * @returns An object that has the same properties as a [[CType]].
 */
export function decompress(cType: CompressedCType): ICType {
  if (!Array.isArray(cType) || cType.length !== 3) {
    throw new SDKErrors.DecompressionArrayError('CType')
  }
  const decompressedCType = {
    hash: cType[0],
    owner: cType[1],
    schema: decompressSchema(cType[2]),
  }
  verifyDataStructure(decompressedCType)
  return decompressedCType
}
