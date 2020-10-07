/**
 * @packageDocumentation
 * @module ClaimUtils
 * @preferred
 */

import { IPartialClaim, CompressedPartialClaim } from '../messaging'
import jsonabc from '../util/jsonabc'
import * as SDKErrors from '../errorhandling/SDKErrors'
import IClaim, { CompressedClaim } from '../types/Claim'
import { validateAddress, validateHash } from '../util/DataUtils'

/**
 *  Checks whether the input meets all the required criteria of an IClaim object.
 *  Throws on invalid input.
 *
 * @param input The potentially only partial IClaim.
 * @throws When input's cTypeHash do not exist.
 * @throws When any of the input's contents[key] is not of type 'number', 'boolean' or 'string'.
 * @throws [[ERROR_CTYPE_HASH_NOT_PROVIDED]], [[ERROR_CLAIM_CONTENTS_MALFORMED]].
 *
 */
export function errorCheck(input: IClaim | IPartialClaim): void {
  if (!input.cTypeHash) {
    throw SDKErrors.ERROR_CTYPE_HASH_NOT_PROVIDED()
  }
  if (input.owner) {
    validateAddress(input.owner, 'Claim owner')
  }
  if (input.contents !== undefined) {
    Object.entries(input.contents).forEach((entry) => {
      if (
        !entry[0] ||
        !entry[1] ||
        !['string', 'number', 'boolean', 'object'].includes(typeof entry[1])
      ) {
        throw SDKErrors.ERROR_CLAIM_CONTENTS_MALFORMED()
      }
    })
  }
  validateHash(input.cTypeHash, 'Claim CType')
}

/**
 *  Compresses the [[IClaim]] for storage and/or messaging.
 *
 * @param claim An [[IClaim]] object that will be sorted and stripped for messaging or storage.
 *
 * @returns An ordered array of a [[CompressedClaim]].
 */
export function compress(claim: IClaim): CompressedClaim
/**
 *  Compresses the [[IPartialClaim]] for storage and/or messaging.
 *
 * @param claim An [[IPartialClaim]] object that will be sorted and stripped for messaging or storage.
 *
 * @returns An ordered array of an [[IPartialCompressedClaim]].
 */
export function compress(claim: IPartialClaim): CompressedPartialClaim
export function compress(
  claim: IClaim | IPartialClaim
): CompressedClaim | CompressedPartialClaim {
  errorCheck(claim)
  let sortedContents
  if (claim.contents) {
    sortedContents = jsonabc.sortObj(claim.contents)
  }
  return [claim.cTypeHash, claim.owner, sortedContents]
}

/**
 *  Decompresses the [[IClaim]] from storage and/or message.
 *
 * @param claim An [[CompressedClaim]] array that is reverted back into an object.
 * @throws When an [[CompressedClaim]] is not an Array or it's length is unequal 3.
 * @throws [[ERROR_DECOMPRESSION_ARRAY]].
 * @returns An [[IClaim]] object that has the same properties as the [[CompressedClaim]].
 */
export function decompress(claim: CompressedClaim): IClaim
/**
 *  Decompresses the Partial [[IClaim]] from storage and/or message.
 *
 * @param claim An [[IPartialCompressedClaim]] array that is reverted back into an object.
 * @throws When an [[IPartialCompressedClaim]] is not an Array or it's length is unequal 3.
 * @throws [[ERROR_DECOMPRESSION_ARRAY]].
 * @returns An [[IPartialClaim]] object that has the same properties as the [[IPartialCompressedClaim]].
 */
export function decompress(claim: CompressedPartialClaim): IPartialClaim
export function decompress(
  claim: CompressedClaim | CompressedPartialClaim
): IClaim | IPartialClaim {
  if (!Array.isArray(claim) || claim.length !== 3) {
    throw SDKErrors.ERROR_DECOMPRESSION_ARRAY('Claim')
  }
  return {
    cTypeHash: claim[0],
    owner: claim[1],
    contents: claim[2],
  }
}

export default { decompress, compress, errorCheck }
