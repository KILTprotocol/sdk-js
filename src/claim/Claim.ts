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
 * @preferred
 */

import * as jsonabc from 'jsonabc'

import ICType from '../ctype/CType'
import { verifyClaimStructure } from '../ctype/CTypeUtils'
import IClaim, { CompressedClaim } from '../types/Claim'
import IPublicIdentity from '../types/PublicIdentity'

/**
 *  Compresses the [[Claim]] for storage and/or messaging.
 *
 * @param claim A [[Claim]] object that will be sorted and stripped for messaging or storage.
 *
 * @returns An ordered array of a [[Claim]].
 */
export function compressClaim(claim: IClaim): CompressedClaim {
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
  return {
    contents: claim[0],
    cTypeHash: claim[1],
    owner: claim[2],
  }
}

function verifyClaim(
  claimContents: object,
  cTypeSchema: ICType['schema']
): boolean {
  return verifyClaimStructure(claimContents, cTypeSchema)
}

export default class Claim implements IClaim {
  public static fromClaim(
    claimInput: IClaim,
    cTypeSchema: ICType['schema']
  ): Claim {
    if (cTypeSchema) {
      if (!verifyClaim(claimInput.contents, cTypeSchema)) {
        throw Error('Claim not valid')
      }
    }
    return new Claim(claimInput)
  }

  public static fromCTypeAndClaimContents(
    ctypeInput: ICType,
    claimContents: object,
    claimOwner: IPublicIdentity['address']
  ): Claim {
    if (ctypeInput.schema) {
      if (!verifyClaim(claimContents, ctypeInput.schema)) {
        throw Error('Claim not valid')
      }
    }
    return new Claim({
      cTypeHash: ctypeInput.hash,
      contents: claimContents,
      owner: claimOwner,
    })
  }

  public cTypeHash: IClaim['cTypeHash']
  public contents: IClaim['contents']
  public owner: IClaim['owner']

  public constructor(claimInput: IClaim) {
    if (!claimInput.cTypeHash || !claimInput.contents || !claimInput.owner) {
      throw new Error(
        `Property Not Provided while building Claim:\n
        claimInput.cTypeHash:\n
          ${claimInput.cTypeHash}\n
          claimInput.contents:\n
          ${claimInput.contents}\n
          claimInput.owner:\n'
          ${claimInput.owner}`
      )
    }
    this.cTypeHash = claimInput.cTypeHash
    this.contents = claimInput.contents
    this.owner = claimInput.owner
  }

  /**
   * Compresses an [[Claim]] object from the [[CompressedClaim]].
   *
   * @returns An array that contains the same properties of an [[Claim]].
   */

  public compress(): CompressedClaim {
    return compressClaim(this)
  }

  /**
   * [STATIC] Builds an [[Claim]] from the decompressed array.
   *
   * @returns A new [[Claim]] object.
   */

  public static decompress(compressedClaim: CompressedClaim): Claim {
    const decompressedClaim = decompressClaim(compressedClaim)
    return new Claim(decompressedClaim)
  }
}
