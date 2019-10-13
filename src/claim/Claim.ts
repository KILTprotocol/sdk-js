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
  public static fromClaimInterface(obj: IClaim): Claim {
    if (obj.cTypeSchema !== undefined) {
      if (!verifyClaim(obj.contents, obj.cTypeSchema)) {
        throw Error('Claim not valid')
      }
    }
    return new Claim(obj.cTypeHash, obj.contents, obj.owner)
  }

  public static fromCType(
    ctype: ICType,
    contents: object,
    owner: IPublicIdentity['address']
  ): Claim {
    if (ctype.schema !== undefined) {
      if (!verifyClaim(contents, ctype.schema)) {
        throw Error('Claim not valid')
      }
    }
    return new Claim(ctype.hash, contents, owner)
  }

  public cTypeHash: IClaim['cTypeHash']
  public contents: IClaim['contents']
  public owner: IClaim['owner']

  public constructor(
    cTypeHash: ICType['hash'],
    contents: object,
    owner: IPublicIdentity['address']
  ) {
    this.cTypeHash = cTypeHash
    this.contents = contents
    this.owner = owner
  }
}
