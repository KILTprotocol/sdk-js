/**
 * @module Claim
 */

import CType from '../ctype/CType'
import { verifyClaimStructure } from '../ctype/CTypeUtils'
import Identity from '../identity/Identity'
import PublicIdentity from '../identity/PublicIdentity'

function verifyClaim(claimContents: object, cType: CType) {
  return verifyClaimStructure(claimContents, cType.schema)
}

export interface IClaim {
  cType: CType['hash']
  contents: object
  owner: PublicIdentity['address']
}

export default class Claim implements IClaim {
  public static fromObject(obj: IClaim): Claim {
    const newClaim = Object.create(Claim.prototype)
    return Object.assign(newClaim, obj)
  }
  public cType: CType['hash']
  public contents: object
  public owner: PublicIdentity['address']

  constructor(cType: CType, contents: object, identity: Identity) {
    if (!verifyClaim(contents, cType)) {
      throw Error('Claim not valid')
    }
    this.cType = cType.hash
    this.contents = contents
    this.owner = identity.address
  }
}
