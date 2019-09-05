/**
 * @module TypeInterfaces
 */
import IRequestForAttestation from './RequestForAttestation'
import IAttestation from './Attestation'

export default interface IAttestedClaim {
  request: IRequestForAttestation
  attestation: IAttestation
}
