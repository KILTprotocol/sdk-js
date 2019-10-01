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
  public static fromObject(obj: IClaim): Claim {
    return new Claim(obj.cTypeHash, obj.contents, obj.owner, undefined)
  }

  public cTypeHash: IClaim['cTypeHash']
  public contents: IClaim['contents']
  public owner: IClaim['owner']

  public constructor(
    cTypeHash: ICType['hash'],
    contents: object,
    owner: IPublicIdentity['address'],
    cTypeSchema?: ICType['schema']
  ) {
    if (cTypeSchema !== undefined) {
      if (!verifyClaim(contents, cTypeSchema)) {
        throw Error('Claim not valid')
      }
    }
    this.cTypeHash = cTypeHash
    this.contents = contents
    this.owner = owner
  }
}
