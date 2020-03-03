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
import IClaim from '../types/Claim'
import IPublicIdentity from '../types/PublicIdentity'

type CompressedClaimContents = object

export type CompressedClaim = [
  CompressedClaimContents,
  IClaim['cTypeHash'],
  IClaim['owner']
]

/**
 *  Compresses the claim for storage and/or messaging.
 *
 * @param claim The claim that will be sorted and stripped for messaging or storage.
 *
 * @returns An ordered array of claim.
 */
export function compressClaim(claim: IClaim): CompressedClaim {
  const sortedContents = jsonabc.sortObj(claim.contents)
  return [sortedContents, claim.cTypeHash, claim.owner]
}

/**
 *  Decompresses the claim from storage and/or message.
 *
 * @param claim A compressesd claim array that is reverted back into an object.
 *
 * @returns An object that has the same properties as the claim.
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

  public compress(): CompressedClaim {
    return compressClaim(this)
  }

  public static decompress(compressedClaim: IClaim): Claim {
    return new Claim(compressedClaim)
  }
}
