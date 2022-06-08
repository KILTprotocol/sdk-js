/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
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
 *  Compresses an [[IClaim]] for storage and/or messaging.
 *
 * @param claim An [[IClaim]] object that will be sorted and stripped for messaging or storage.
 *
 * @returns An ordered array of a [[CompressedClaim]].
 */
export function compress(claim: IClaim): CompressedClaim
/**
 *  Compresses a [[PartialClaim]] for storage and/or messaging.
 *
 * @param claim A [[PartialClaim]] object that will be sorted and stripped for messaging or storage.
 *
 * @returns An ordered array of a [[CompressedPartialClaim]].
 */
export function compress(claim: PartialClaim): CompressedPartialClaim
/**
 *  Compresses a claim object for storage and/or messaging.
 *
 * @param claim A (partial) claim object that will be sorted and stripped for messaging or storage.
 *
 * @returns An ordered array of that represents the underlying data in a more compact form.
 */
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
 *  Decompresses an [[IClaim]] from storage and/or message.
 *
 * @param claim A [[CompressedClaim]] array that is reverted back into an object.
 * @throws [[ERROR_DECOMPRESSION_ARRAY]] if `claim` is not an Array or it's length is unequal 3.
 * @returns An [[IClaim]] object that has the same properties compressed representation.
 */
export function decompress(claim: CompressedClaim): IClaim
/**
 *  Decompresses a partial [[IClaim]] from storage and/or message.
 *
 * @param claim A [[CompressedPartialClaim]] array that is reverted back into an object.
 * @throws [[ERROR_DECOMPRESSION_ARRAY]] if `claim` is not an Array or it's length is unequal 3.
 * @returns A [[PartialClaim]] object that has the same properties compressed representation.
 */
export function decompress(claim: CompressedPartialClaim): PartialClaim
/**
 *  Decompresses compressed representation of a (partial) [[IClaim]] from storage and/or message.
 *
 * @param claim A [[CompressedClaim]] or [[CompressedPartialClaim]] array that is reverted back into an object.
 * @throws [[ERROR_DECOMPRESSION_ARRAY]] if `claim` is not an Array or it's length is unequal 3.
 * @returns An [[IClaim]] or [[PartialClaim]] object that has the same properties compressed representation.
 */
export function decompress(
  claim: CompressedClaim | CompressedPartialClaim
): IClaim | PartialClaim {
  if (!Array.isArray(claim) || claim.length !== 3) {
    throw new SDKErrors.ERROR_DECOMPRESSION_ARRAY('Claim')
  }
  return {
    cTypeHash: claim[0],
    owner: claim[1],
    contents: claim[2],
  }
}
