/**
 * Claims are a core building block of the KILT SDK. A claim represents **something an entity claims about itself**. Once created, a claim can be used to create a [[RequestForAttestation]].
 * ***
 * A claim object has:
 * * contents - among others, the pure content of a claim, for example `"isOver18": yes`;
 * * a [[CType]] that represents its data structure.
 * <br><br>
 * A claim object's owner is (should be) the same entity as the claimer.
 * @module Claim
 * @preferred
 */

/**
 * Dummy comment needed for correct doc display, do not remove
 */
import ICType from '../ctype/CType'
import { verifyClaimStructure } from '../ctype/CTypeUtils'
import IClaim from '../types/Claim'
import IPublicIdentity from '../types/PublicIdentity'

function verifyClaim(
  claimContents: object,
  cTypeSchema: ICType['schema']
): boolean {
  return verifyClaimStructure(claimContents, cTypeSchema)
}

export default class Claim implements IClaim {
  public static fromClaim(claimInput: IClaim): Claim {
    if (claimInput.cTypeSchema) {
      if (!verifyClaim(claimInput.contents, claimInput.cTypeSchema)) {
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
    if (ctypeInput.schema !== undefined) {
      if (!verifyClaim(claimContents, ctypeInput.schema)) {
        throw Error('Claim not valid')
      }
    }
    return new Claim({
      cTypeHash: ctypeInput.hash,
      cTypeSchema: null,
      contents: claimContents,
      owner: claimOwner,
    })
  }

  public cTypeHash: IClaim['cTypeHash']
  public contents: IClaim['contents']
  public owner: IClaim['owner']
  public cTypeSchema: ICType['schema'] | null

  public constructor(claimInput: IClaim) {
    if (claimInput.cTypeSchema) {
      this.cTypeSchema = claimInput.cTypeSchema
    } else {
      this.cTypeSchema = null
    }
    if (!claimInput.cTypeHash) {
      throw new Error(`No cTypeHash provided: ${claimInput.cTypeHash}`)
    }
    this.cTypeHash = claimInput.cTypeHash
    if (!claimInput.contents) {
      throw new Error(`No ClaimContents provided: ${claimInput.contents}`)
    }
    this.contents = claimInput.contents
    if (!claimInput.owner) {
      throw new Error(`No owner provided: ${claimInput.owner}`)
    }
    this.owner = claimInput.owner
  }
}
