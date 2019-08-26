/**
 * @module Claim
 * --- Overview ---
 * Claims are a core building block of the KILT SDK.
 * An Claim object represent something an entity claims about itself.
 * --- Usage ---
 * A Claim object's owner is (should be) the same entity as the claimer.
 * A Claim object can then be attested, to ultimately create an attested claim - which can later be verified.
 * A Claim object has contents, as well as a cType that represents its data structure.
 */

import CType from '../ctype/CType'
import { verifyClaimStructure } from '../ctype/CTypeUtils'
import Identity from '../identity/Identity'
import IClaim from '../types/Claim'

function verifyClaim(claimContents: object, cType: CType) {
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

  constructor(cType: CType, contents: IClaim['contents'], identity: Identity) {
    if (!verifyClaim(contents, cType)) {
      throw Error('Claim not valid')
    }
    this.cType = cType.hash
    this.contents = contents
    this.owner = identity.address
  }
}
