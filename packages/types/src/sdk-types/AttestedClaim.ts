/**
 * @packageDocumentation
 * @module IAttestedClaim
 */

import { IAttestation, CompressedAttestation } from './Attestation'
import IRequestForAttestation, {
  CompressedRequestForAttestation,
} from './RequestForAttestation'

export interface IAttestedClaim {
  attestation: IAttestation
  request: IRequestForAttestation
}

export type CompressedAttestedClaim = [
  CompressedRequestForAttestation,
  CompressedAttestation
]
