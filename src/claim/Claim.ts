import { v4 as uuid } from 'uuid'

import Ctype from '../ctype/CType'
import { verifyClaimStructure } from '../ctype/CTypeUtils'
import Identity from '../identity/Identity'
import { signStr, verify } from '../crypto/Crypto'

function verifyClaim(claimContents: object, ctype: Ctype) {
  return verifyClaimStructure(claimContents, ctype.schema)
}

function verfifySignature(claim: Claim): boolean {
  return verify(JSON.stringify(claim.contents), claim.signature, claim.owner)
}

export interface IClaim {
  alias: string
  ctype: string
  contents: object
  id: string
  owner: string
  signature: string
}

class Claim implements IClaim {
  public static fromObject(obj: any): Claim {
    // TODO: verify all properties
    const newClaim = Object.create(Claim.prototype)
    return Object.assign(newClaim, obj)
  }

  public alias: string
  public ctype: string
  public contents: object
  public id: string
  public owner: string
  public signature: string

  constructor(
    alias: string,
    ctype: Ctype,
    contents: object,
    identity: Identity,
    id?: string
  ) {
    if (!verifyClaim(contents, ctype)) {
      throw Error('Claim not valid')
    }
    this.alias = alias
    this.ctype = ctype.hash
    this.contents = contents
    this.owner = identity.address

    if (!id) {
      this.id = uuid()
    } else {
      this.id = id
    }
    this.signature = this.sign(identity)
  }

  public verifySignature(): boolean {
    return verfifySignature(this)
  }

  private sign(identity: Identity) {
    return signStr(JSON.stringify(this.contents), identity.signSecretKeyAsHex)
  }
}

export default Claim
