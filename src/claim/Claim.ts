import { v4 as uuid } from 'uuid'

import Ctype from '../ctype/CType'
import { verifyClaimStructure } from '../ctype/CTypeUtils'
import Identity from '../identity/Identity'
import { signStr, verify } from '../crypto/Crypto'

function verifyClaim(claimContents: object, ctype: Ctype) {
  return verifyClaimStructure(claimContents, ctype.schema)
}

function verfifySignature(claim: Claim): boolean {
  return verify(
    JSON.stringify(claim.contents),
    claim.signature,
    claim.identity.signPublicKeyAsHex
  )
}

export interface IClaim {
  alias: string
  ctype: Ctype
  contents: object
  id: string
  identity: Identity
  signature: string
}

class Claim implements IClaim {
  public static fromObject(obj: any): Claim {
    // TODO: verify all properties
    if (!(obj.ctype instanceof Ctype)) {
      obj.ctype = Ctype.fromObject(obj.ctype)
    }
    if (!(obj.identity instanceof Identity)) {
      obj.identity = Identity.buildFromMnemonic(obj.identity._phrase)
    }
    const newClaim = Object.create(Claim.prototype)
    return Object.assign(newClaim, obj)
  }

  public alias: string
  public ctype: Ctype
  public contents: object
  public id: string
  public identity: Identity
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
    this.ctype = ctype
    this.contents = contents
    this.identity = identity
    if (!id) {
      this.id = uuid()
    } else {
      this.id = id
    }
    this.signature = this.sign()
  }

  public verifySignature(): boolean {
    return verfifySignature(this)
  }

  private sign() {
    return signStr(
      JSON.stringify(this.contents),
      this.identity.signSecretKeyAsHex
    )
  }
}

export default Claim
