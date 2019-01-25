import { v4 as uuid } from 'uuid'
import { verify } from '../crypto/Crypto'

import Ctype from '../ctype/CType'
import { verifyClaimStructure } from '../ctype/CTypeUtils'
import Identity from '../identity/Identity'

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
  hash: string
  owner: string
  signature: string
}

class Claim implements IClaim {
  public static fromObject(obj: IClaim): Claim {
    const newClaim = Object.create(Claim.prototype)
    return Object.assign(newClaim, obj)
  }

  public alias: string
  public ctype: string
  public contents: object
  public hash: string
  public owner: string
  public signature: string

  constructor(
    alias: string,
    ctype: Ctype,
    contents: object,
    identity: Identity,
    hash?: string
  ) {
    if (!verifyClaim(contents, ctype)) {
      throw Error('Claim not valid')
    }
    this.alias = alias
    this.ctype = ctype.hash
    this.contents = contents
    this.owner = identity.address

    if (!hash) {
      this.hash = uuid()
    } else {
      this.hash = hash
    }
    this.signature = this.sign(identity)
  }

  public verifySignature(): boolean {
    return verfifySignature(this)
  }

  private sign(identity: Identity) {
    return identity.signStr(JSON.stringify(this.contents))
  }
}

export default Claim
