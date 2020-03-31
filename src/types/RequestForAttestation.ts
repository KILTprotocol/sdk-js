/**
 * @packageDocumentation
 * @module IRequestForAttestation
 */

import IClaim, { CompressedClaim } from './Claim'
import { IDelegationBaseNode } from './Delegation'
import IAttestedClaim, { CompressedAttestedClaim } from './AttestedClaim'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'

export type Hash = string

export type NonceHash = {
  hash: Hash
  nonce?: string
}

export type NonceHashTree = { [key: string]: NonceHash }

export default interface IRequestForAttestation {
  claim: IClaim
  claimHashTree: NonceHashTree
  claimOwner: NonceHash
  claimerSignature: string
  cTypeHash: NonceHash
  delegationId: IDelegationBaseNode['id'] | null
  legitimations: IAttestedClaim[]
  rootHash: Hash
}

export type CompressedNonceHash = [string, string?]

export type CompressedNonceHashTree = object

export type CompressedClaimOwner = CompressedNonceHash
export type CompressedCTypeHash = CompressedNonceHash

export type CompressedRequestForAttestation = [
  CompressedClaim,
  CompressedNonceHashTree,
  CompressedClaimOwner,
  RequestForAttestation['claimerSignature'],
  CompressedCTypeHash,
  RequestForAttestation['rootHash'],
  CompressedAttestedClaim[],
  RequestForAttestation['delegationId']
]
