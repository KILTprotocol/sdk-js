/**
 * @packageDocumentation
 * @module ClaimUtils
 * @preferred
 */

import * as jsonabc from 'jsonabc'
import IClaim, { CompressedClaim } from '../types/Claim'

function errorCheck(claim: IClaim): void {
  if (!claim.cTypeHash || !claim.contents || !claim.owner) {
    throw new Error(
      `Property Not Provided while building Claim: 
        ${JSON.stringify(claim, null, 2)}`
    )
  }
}

/**
 *  Compresses the [[Claim]] for storage and/or messaging.
 *
 * @param claim A [[Claim]] object that will be sorted and stripped for messaging or storage.
 *
 * @returns An ordered array of a [[Claim]].
 */
export function compress(claim: IClaim): CompressedClaim {
  errorCheck(claim)
  const sortedContents = jsonabc.sortObj(claim.contents)
  return [sortedContents, claim.cTypeHash, claim.owner]
}

/**
 *  Decompresses the [[Claim]] from storage and/or message.
 *
 * @param claim A compressed [[Claim]] array that is reverted back into an object.
 * @throws When [[claim]] is not an Array or it's length is unequal 3.
 *
 * @returns An object that has the same properties as the [[Claim]].
 */
export function decompress(claim: CompressedClaim): IClaim {
  if (!Array.isArray(claim) || claim.length !== 3) {
    throw new Error(
      "Compressed Claim isn't an Array or has all the required data types"
    )
  }
  return {
    contents: claim[0],
    cTypeHash: claim[1],
    owner: claim[2],
  }
}

export default { decompress, compress, errorCheck }
