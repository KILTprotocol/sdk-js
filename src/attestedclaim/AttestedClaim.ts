/**
 * @module AttestationPresentation
 */
import cloneDeep from 'lodash/cloneDeep'
import Attestation from '../attestation/Attestation'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import IAttestedClaim from '../types/AttestedClaim'
import IAttestation from '../types/Attestation'
import IRequestForAttestation from '../types/RequestForAttestation'

export default class AttestedClaim implements IAttestedClaim {
  /**
   * Creates a new instance of this Attestation class from the given interface.
   */
  public static fromObject(obj: IAttestedClaim): AttestedClaim {
    const newAttestedClaim: AttestedClaim = Object.create(
      AttestedClaim.prototype
    )
    newAttestedClaim.request = RequestForAttestation.fromObject(obj.request)
    newAttestedClaim.attestation = Attestation.fromObject(obj.attestation)
    return newAttestedClaim
  }

  public request: RequestForAttestation
  public attestation: Attestation

  constructor(request: IRequestForAttestation, attestation: IAttestation) {
    // TODO: this should be instantiated w/o fromObject
    this.request = RequestForAttestation.fromObject(request)
    this.attestation = Attestation.fromObject(attestation)
  }

  public async verify(): Promise<boolean> {
    if (!this.verifyData()) {
      Promise.resolve(false)
    }
    return this.attestation.verify()
  }

  public verifyData(): boolean {
    return (
      this.request.verifyData() &&
      this.request.hash === this.attestation.claimHash
    )
  }

  public getHash(): string {
    return this.attestation.claimHash
  }

  public createPresentation(excludedClaimProperties: string[]): AttestedClaim {
    const result: AttestedClaim = AttestedClaim.fromObject(cloneDeep(this))
    result.request.removeClaimProperties(excludedClaimProperties)
    return result
  }
}
