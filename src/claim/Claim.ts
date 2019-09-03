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
import CType from '../ctype/CType'
import { verifyClaimStructure } from '../ctype/CTypeUtils'
import Identity from '../identity/Identity'
import IClaim from '../types/Claim'

function verifyClaim(claimContents: object, cType: CType): boolean {
  return verifyClaimStructure(claimContents, cType.schema)
}

export default class Claim implements IClaim {
  public static fromObject(obj: IClaim): Claim {
    const newClaim = Object.create(Claim.prototype)
    return Object.assign(newClaim, obj)
  }

  public cType: IClaim['cType']
  public contents: IClaim['contents']
  public owner: IClaim['owner']

  public constructor(
    cType: CType,
    contents: IClaim['contents'],
    identity: Identity
  ) {
    if (!verifyClaim(contents, cType)) {
      throw Error('Claim not valid')
    }
    this.cType = cType.hash
    this.contents = contents
    this.owner = identity.address
  }
}
