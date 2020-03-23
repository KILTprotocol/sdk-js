/**
 * @packageDocumentation
 * @module IRequestForAttestation
 */

import { AttestationRequest } from '@kiltprotocol/portablegabi'
import IClaim, { CompressedClaim } from './Claim'
import { IDelegationBaseNode } from './Delegation'
import IAttestedClaim, { CompressedAttestedClaim } from './AttestedClaim'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'

export type Hash = string

export type NonceHash = {
  hash: Hash
  nonce?: string
}

export type ClaimHashTree = {
  [key: string]: NonceHash
}

export type NonceHashTree = NonceHash | { [key: string]: NonceHashTree }

export default interface IRequestForAttestation {
  claim: IClaim
  claimHashTree: ClaimHashTree
  claimOwner: NonceHash
  claimerSignature: string
  cTypeHash: NonceHash
  delegationId: IDelegationBaseNode['id'] | null
  privacyEnhanced: AttestationRequest | null
  legitimations: IAttestedClaim[]
  rootHash: Hash
}

export type CompressedNonceHash = [string, string?]

export type CompressedClaimHashTree = object

export type CompressedClaimOwner = CompressedNonceHash
export type CompressedCTypeHash = CompressedNonceHash

export type CompressedRequestForAttestation = [
  CompressedClaim,
  CompressedClaimHashTree,
  CompressedClaimOwner,
  RequestForAttestation['claimerSignature'],
  CompressedCTypeHash,
  RequestForAttestation['rootHash'],
  CompressedAttestedClaim[],
  RequestForAttestation['delegationId'],
  RequestForAttestation['privacyEnhanced']
]
