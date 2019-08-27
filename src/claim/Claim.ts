/**
 * @module Claim
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
