/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @packageDocumentation
 * @module CType
 */

import type { ICType, IClaim, ICTypeMetadata } from '@kiltprotocol/types'
import { SDKErrors, JsonSchema } from '@kiltprotocol/utils'
import { DidUtils } from '@kiltprotocol/did'
import { getOwner, isStored } from './chain.js'
import { CTypeModel, CTypeWrapperModel, MetadataModel } from './schemas.js'
import { getHashForSchema, getIdForSchema } from './utils.js'

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
 *  Verifies the structure of the provided IClaim['contents'] with ICType['schema'].
 *
 * @param claimContents IClaim['contents'] to be verified against the schema.
 * @param schema ICType['schema'] to be verified against the [CTypeModel].
 * @param messages An array, which will be filled by schema errors.
 * @throws [[ERROR_OBJECT_MALFORMED]] when schema does not correspond to the CTypeModel.
 *
 * @returns Boolean whether both claimContents and schema could be verified.
 */
export function verifyClaimAgainstSchema(
  claimContents: IClaim['contents'],
  schema: ICType['schema'],
  messages?: string[]
): boolean {
  if (!verifyObjectAgainstSchema(schema, CTypeModel)) {
    throw SDKErrors.ERROR_OBJECT_MALFORMED()
  }
  return verifyObjectAgainstSchema(claimContents, schema, messages)
}

export async function verifyStored(ctype: ICType): Promise<boolean> {
  return isStored(ctype.hash)
}

export async function verifyOwner(ctype: ICType): Promise<boolean> {
  const owner = await getOwner(ctype.hash)
  return owner ? owner === ctype.owner : false
}

/**
 *  Checks whether the input meets all the required criteria of an ICType object.
 *  Throws on invalid input.
 *
 * @param input The potentially only partial ICType.
 * @throws [[ERROR_OBJECT_MALFORMED]] when input does not correspond to either it's schema, or the CTypeWrapperModel.
 * @throws [[ERROR_HASH_MALFORMED]] when the input's hash does not match the hash calculated from ICType's schema.
 * @throws [[ERROR_CTYPE_OWNER_TYPE]] when the input's owner is not of type string or null.
 *
 */
export function verifyDataStructure(input: ICType): void {
  if (!verifyObjectAgainstSchema(input, CTypeWrapperModel)) {
    throw SDKErrors.ERROR_OBJECT_MALFORMED()
  }
  if (!input.schema || getHashForSchema(input.schema) !== input.hash) {
    throw SDKErrors.ERROR_HASH_MALFORMED(input.hash, 'CType')
  }
  if (getIdForSchema(input.schema) !== input.schema.$id) {
    throw SDKErrors.ERROR_CTYPE_ID_NOT_MATCHING(
      getIdForSchema(input.schema),
      input.schema.$id
    )
  }
  if (!(input.owner === null || DidUtils.validateKiltDid(input.owner))) {
    throw SDKErrors.ERROR_CTYPE_OWNER_TYPE()
  }
}

/**
 * Validates an array of [[CType]]s against a [[Claim]].
 *
 * @param cType - A [[CType]] that has nested [[CType]]s inside.
 * @param nestedCTypes - An array of [[CType]] schemas.
 * @param claimContents - The contents of a [[Claim]] to be validated.
 * @param messages
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
 *  Checks a CTypeMetadata object.
 *
 * @param metadata [[ICTypeMetadata]] that is to be instantiated.
 * @throws [[ERROR_OBJECT_MALFORMED]] when metadata is not verifiable with the MetadataModel.
 */
export function verifyCTypeMetadata(metadata: ICTypeMetadata): void {
  if (!verifyObjectAgainstSchema(metadata, MetadataModel)) {
    throw SDKErrors.ERROR_OBJECT_MALFORMED()
  }
}
