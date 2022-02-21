/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * Claims are a core building block of the KILT SDK. A claim represents **something an entity claims about itself**. Once created, a claim can be used to create a [[RequestForAttestation]].
 *
 * A claim object has:
 * * contents - among others, the pure content of a claim, for example `"isOver18": yes`;
 * * a [[CType]] that represents its data structure.
 *
 * A claim object's owner is (should be) the same entity as the claimer.
 *
 * @packageDocumentation
 * @module Claim
 */

import type { IClaim, IDidDetails, ICType } from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'
import * as CTypeUtils from '../ctype/CType.utils.js'
import * as ClaimUtils from './utils.js'

function verifyAgainstCType(
  claimContents: IClaim['contents'],
  cTypeSchema: ICType['schema']
): boolean {
  return CTypeUtils.verifyClaimStructure(claimContents, cTypeSchema)
}
/**
 * Verifies the data structure and schema of a Claim.
 *
 * @param claimInput IClaim to verify.
 * @param cTypeSchema ICType['schema'] to verify claimInput's contents.
 * @throws [[ERROR_CLAIM_UNVERIFIABLE]] when claimInput's contents could not be verified with the provided cTypeSchema.
 */
export function verify(
  claimInput: IClaim,
  cTypeSchema: ICType['schema']
): void {
  if (!verifyAgainstCType(claimInput.contents, cTypeSchema)) {
    throw SDKErrors.ERROR_CLAIM_UNVERIFIABLE()
  }

  ClaimUtils.verifyDataStructure(claimInput)
}

/**
 * [STATIC] Builds a [[Claim]] from a [[CType]] which has nested [[CType]]s within the schema.
 *
 * @param cTypeInput A [[CType]] object that has nested [[CType]]s.
 * @param nestedCType The array of [[CType]]s, which are used inside the main [[CType]].
 * @param claimContents The data inside the [[Claim]].
 * @param claimOwner The [[PublicIdentity]] of the owner of the [[Claim]].
 *
 * @returns A [[Claim]] the owner can use.
 */

export function fromNestedCTypeClaim(
  cTypeInput: ICType,
  nestedCType: Array<ICType['schema']>,
  claimContents: IClaim['contents'],
  claimOwner: IDidDetails['did']
): IClaim {
  if (
    !CTypeUtils.validateNestedSchemas(
      cTypeInput.schema,
      nestedCType,
      claimContents
    )
  ) {
    throw SDKErrors.ERROR_NESTED_CLAIM_UNVERIFIABLE()
  }
  const claim = {
    cTypeHash: cTypeInput.hash,
    contents: claimContents,
    owner: claimOwner,
  }
  ClaimUtils.verifyDataStructure(claim)
  return claim
}

/**
 * Constructs a new Claim from the given [[ICType]], IClaim['contents'] and IPublicIdentity['address'].
 *
 * @param ctypeInput [[ICType]] for which the Claim will be built.
 * @param claimContents IClaim['contents'] to be used as the pure contents of the instantiated Claim.
 * @param claimOwner IPublicIdentity['address'] to be used as the Claim owner.
 * @throws [[ERROR_CLAIM_UNVERIFIABLE]] when claimInput's contents could not be verified with the schema of the provided ctypeInput.
 *
 * @returns A Claim object.
 */
export function fromCTypeAndClaimContents(
  ctypeInput: ICType,
  claimContents: IClaim['contents'],
  claimOwner: IDidDetails['did']
): IClaim {
  if (ctypeInput.schema) {
    if (!verifyAgainstCType(claimContents, ctypeInput.schema)) {
      throw SDKErrors.ERROR_CLAIM_UNVERIFIABLE()
    }
  }
  const claim = {
    cTypeHash: ctypeInput.hash,
    contents: claimContents,
    owner: claimOwner,
  }
  ClaimUtils.verifyDataStructure(claim)
  return claim
}

/**
 * [STATIC] Custom Type Guard to determine input being of type IClaim using the ClaimUtils errorCheck.
 *
 * @param input The potentially only partial IClaim.
 *
 * @returns Boolean whether input is of type IClaim.
 */
export function isIClaim(input: unknown): input is IClaim {
  try {
    ClaimUtils.verifyDataStructure(input as IClaim)
  } catch (error) {
    return false
  }
  return true
}
