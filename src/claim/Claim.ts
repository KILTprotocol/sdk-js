/**
 * @module Claim
 */

import Ctype from '../ctype/CType'
import { verifyClaimStructure } from '../ctype/CTypeUtils'
import Identity from '../identity/Identity'

function verifyClaim(claimContents: object, ctype: Ctype) {
  return verifyClaimStructure(claimContents, ctype.schema)
}

export interface IClaim {
  ctype: string
  contents: object
  owner: string
}

export default class Claim implements IClaim {
  public static fromObject(obj: IClaim): Claim {
    const newClaim = Object.create(Claim.prototype)
    return Object.assign(newClaim, obj)
  }
  public ctype: string
  public contents: object
  public owner: string

  constructor(ctype: Ctype, contents: object, identity: Identity) {
    if (!verifyClaim(contents, ctype)) {
      throw Error('Claim not valid')
    }
    this.ctype = ctype.hash
    this.contents = contents
    this.owner = identity.address
  }
}
