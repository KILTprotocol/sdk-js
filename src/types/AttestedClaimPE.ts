import IAttestedClaim from './AttestedClaim'
import IAttestationPE from './AttestationPE'

export default interface IAttestedClaimPE extends IAttestedClaim {
  attestationPE: IAttestationPE
}
