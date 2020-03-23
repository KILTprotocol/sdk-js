/**
 * @packageDocumentation
 * @module IAttestedClaim
 */

import { Credential } from '@kiltprotocol/portablegabi'
import IRequestForAttestation, {
  CompressedRequestForAttestation,
} from './RequestForAttestation'
import IAttestation, { CompressedAttestation } from './Attestation'

export default interface IAttestedClaim {
  attestation: IAttestation
  credential: Credential | null
  request: IRequestForAttestation
}

export type CompressedAttestedClaim = [
  CompressedRequestForAttestation,
  CompressedAttestation,
  Credential | null
]
