/**
 * @module TypeInterfaces/AttestedClaim
 */
import IRequestForAttestation from './RequestForAttestation'
import IAttestation from './Attestation'

export default interface IAttestedClaim {
  request: IRequestForAttestation
  attestation: IAttestation
}
