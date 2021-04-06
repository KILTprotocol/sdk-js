/**
 * @packageDocumentation
 * @module IRequestForAttestation
 */

import type { IAttestedClaim, CompressedAttestedClaim } from './AttestedClaim'
import type { IClaim, CompressedClaim } from './Claim'
import type { IDelegationBaseNode } from './Delegation'

export type Hash = string

export type NonceHash = {
  hash: Hash
  nonce?: string
}

export interface IRequestForAttestation {
  claim: IClaim
  claimNonceMap: Record<Hash, string>
  claimHashes: Hash[]
  claimerSignature: string
  delegationId: IDelegationBaseNode['id'] | null
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
  IRequestForAttestation['delegationId']
]
