import { Identity } from '../index'

class Attestation {
  public claimHash: string
  public signature: Uint8Array

  constructor(claim: any, attester: Identity) {
    if (this.verifyClaim()) {
      this.claimHash = this.generateClaimHash(claim)
      this.signature = this.sign()
    } else {
      throw Error('Claim not valid')
    }
  }

  private verifyClaim(): boolean {
    // TODO
    return true
  }

  private generateClaimHash(claim: any): string {
    return '1234'
  }

  private sign(): Uint8Array {
    // TODO
    return new Uint8Array(1)
  }
}

export default Attestation
