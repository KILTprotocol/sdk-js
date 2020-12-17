/**
 * @packageDocumentation
 * @module IRequestForAttestation
 */

import { AttestationRequest } from '@kiltprotocol/portablegabi'
import IAttestedClaim, { CompressedAttestedClaim } from './AttestedClaim'
import IClaim, { CompressedClaim } from './Claim'
import { IDelegationBaseNode } from './Delegation'

export type Hash = string

export type NonceHash = {
  hash: Hash
  nonce?: string
}

export default interface IRequestForAttestation {
  claim: IClaim
  claimNonceMap: Record<Hash, string>
  claimHashes: Hash[]
  claimerSignature: string
  delegationId: IDelegationBaseNode['id'] | null
  privacyEnhancement: AttestationRequest | null
  legitimations: IAttestedClaim[]
  rootHash: Hash
}

export type CompressedRequestForAttestation = [
  CompressedClaim,
  IRequestForAttestation['claimNonceMap'],
  IRequestForAttestation['claimerSignature'],
  IRequestForAttestation['claimHashes'],
  IRequestForAttestation['rootHash'],
  CompressedAttestedClaim[],
  IRequestForAttestation['delegationId'],
  IRequestForAttestation['privacyEnhancement']
]
