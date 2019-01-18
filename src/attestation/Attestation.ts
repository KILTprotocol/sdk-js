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
    this.claimHash = this.generateClaimHash(claim)
    this.signature = this.sign()
    this.owner = attester.address
    this.revoked = revoked
  }

  public revoke() {
    // TODO revoke onChain
  }

  public updateRevokeStatus() {
    // TODO check attestation onChain
  }

  private generateClaimHash(claim: any): string {
    return '1234'
  }

  private sign(): string {
    // TODO
    return 'signature'
  }
}

export default Attestation
