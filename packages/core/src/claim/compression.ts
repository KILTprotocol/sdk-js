/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * @packageDocumentation
 * @module Claim
 */

import type {
  IClaim,
  CompressedClaim,
  PartialClaim,
  CompressedPartialClaim,
} from '@kiltprotocol/types'
import { jsonabc, SDKErrors } from '@kiltprotocol/utils'
import { verifyDataStructure } from './utils.js'

/**
 *  Compresses the [[IClaim]] for storage and/or messaging.
 *
 * @param claim An [[IClaim]] object that will be sorted and stripped for messaging or storage.
 *
 * @returns An ordered array of a [[CompressedClaim]].
 */
export function compress(claim: IClaim): CompressedClaim
/**
 *  Compresses the [[PartialClaim]] for storage and/or messaging.
 *
 * @param claim A [[PartialClaim]] object that will be sorted and stripped for messaging or storage.
 *
 * @returns An ordered array of a [[CompressedPartialClaim]].
 */
export function compress(claim: PartialClaim): CompressedPartialClaim
export function compress(
  claim: IClaim | PartialClaim
): CompressedClaim | CompressedPartialClaim {
  verifyDataStructure(claim)
  let sortedContents
  if (claim.contents) {
    sortedContents = jsonabc.sortObj(claim.contents)
  }
  return [claim.cTypeHash, claim.owner, sortedContents]
}

/**
 *  Decompresses the [[IClaim]] from storage and/or message.
 *
 * @param claim A [[CompressedClaim]] array that is reverted back into an object.
 * @throws [[ERROR_DECOMPRESSION_ARRAY]] when a [[CompressedClaim]] is not an Array or it's length is unequal 3.
 * @returns An [[IClaim]] object that has the same properties as the [[CompressedClaim]].
 */
export function decompress(claim: CompressedClaim): IClaim
/**
 *  Decompresses the Partial [[IClaim]] from storage and/or message.
 *
 * @param claim A [[CompressedPartialClaim]] array that is reverted back into an object.
 * @throws When a [[CompressedPartialClaim]] is not an Array or it's length is unequal 3.
 * @throws [[ERROR_DECOMPRESSION_ARRAY]].
 * @returns A [[PartialClaim]] object that has the same properties as the [[CompressedPartialClaim]].
 */
export function decompress(claim: CompressedPartialClaim): PartialClaim
export function decompress(
  claim: CompressedClaim | CompressedPartialClaim
): IClaim | PartialClaim {
  if (!Array.isArray(claim) || claim.length !== 3) {
    throw SDKErrors.ERROR_DECOMPRESSION_ARRAY('Claim')
  }
  return {
    cTypeHash: claim[0],
    owner: claim[1],
    contents: claim[2],
  }
}
