/**
 * @module TypeInterfaces/AttestedClaim
 */
/**
 * Dummy comment needed for correct doc display, do not remove.
 */
import IRequestForAttestation from './RequestForAttestation'
import IAttestation from './Attestation'

export default interface IAttestedClaim {
  request: IRequestForAttestation
  attestation: IAttestation
}
