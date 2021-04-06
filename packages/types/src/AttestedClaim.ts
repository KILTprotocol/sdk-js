/**
 * @packageDocumentation
 * @module IAttestedClaim
 */

import type { IAttestation, CompressedAttestation } from './Attestation'
import type {
  IRequestForAttestation,
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
