import { v4 as uuid } from 'uuid'
import { Identity } from '../index'

export interface IAttestation {
  claimHash: string
  signature: string
  owner: string
  revoked: boolean
}

class Attestation implements IAttestation {
  public claimHash: string
  public signature: string
  public owner: string
  public revoked: boolean

  constructor(claim: any, attester: Identity, revoked = false) {
    this.owner = attester.address
    this.claimHash = this.generateClaimHash(claim)
    this.signature = this.sign()
    this.revoked = revoked
  }

  public revoke() {
    // TODO revoke onChain
  }

  public updateRevokeStatus() {
    // TODO check attestation onChain
  }

  private generateClaimHash(claim: any): string {
    // TODO
    return uuid()
  }

  private sign(): string {
    // TODO
    return `${this.claimHash}-${this.owner}`
  }
}

export default Attestation
