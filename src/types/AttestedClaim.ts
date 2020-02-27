/**
 * @packageDocumentation
 * @module IAttestedClaim
 */
import { Credential } from '@kiltprotocol/portablegabi'
import IRequestForAttestation from './RequestForAttestation'
import IAttestation from './Attestation'

export default interface IAttestedClaim {
  request: IRequestForAttestation
  attestation: IAttestation
  credential: Credential | null
}
