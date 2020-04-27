/**
 * @packageDocumentation
 * @module IAttestedClaim
 */

import IRequestForAttestation, {
  CompressedRequestForAttestation,
} from './RequestForAttestation'
import IAttestation, { CompressedAttestation } from './Attestation'

export default interface IAttestedClaim {
  attestation: IAttestation
  request: IRequestForAttestation
}

export type CompressedAttestedClaim = [
  CompressedRequestForAttestation,
  CompressedAttestation
]
