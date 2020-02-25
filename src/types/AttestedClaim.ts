/**
 * @packageDocumentation
 * @module IAttestedClaim
 */
import { Attestation as GabiAttestation } from '@kiltprotocol/portablegabi'
import IRequestForAttestation from './RequestForAttestation'
import IAttestation from './Attestation'

export default interface IAttestedClaim {
  request: IRequestForAttestation
  attestation: IAttestation
  attestationPE: GabiAttestation | null
}
