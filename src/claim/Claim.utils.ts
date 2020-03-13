import * as jsonabc from 'jsonabc'
import IClaim, { CompressedClaim } from '../types/Claim'

function claimErrorCheck(claim: IClaim): void {
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
export function compressClaim(claim: IClaim): CompressedClaim {
  claimErrorCheck(claim)
  const sortedContents = jsonabc.sortObj(claim.contents)
  return [sortedContents, claim.cTypeHash, claim.owner]
}

/**
 *  Decompresses the [[Claim]] from storage and/or message.
 *
 * @param claim A compressesd [[Claim]] array that is reverted back into an object.
 *
 * @returns An object that has the same properties as the [[Claim]].
 */
export function decompressClaim(claim: CompressedClaim): IClaim {
  if (!Array.isArray(claim) || claim.length !== 3) {
    throw new Error(
      'Compressed Claim isnt an Array or has all the required data types'
    )
  }
  return {
    contents: claim[0],
    cTypeHash: claim[1],
    owner: claim[2],
  }
}

export default { decompressClaim, compressClaim, claimErrorCheck }
