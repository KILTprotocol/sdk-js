import IAttestedClaimPE from '../types/AttestedClaimPE'
import AttestedClaim from '../attestedclaim/AttestedClaim'
import IAttestationPE from '../types/AttestationPE'

export default class AttestedClaimPE extends AttestedClaim
  implements IAttestedClaimPE {
  public attestationPE: IAttestationPE

  public constructor(attestedClaimInput: IAttestedClaimPE) {
    super(attestedClaimInput)
    this.attestationPE = attestedClaimInput.attestationPE
  }
}
