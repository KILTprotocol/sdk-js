/**
 * @packageDocumentation
 * @module IRequestForAttestation
 */

import { AttestationRequest } from '@kiltprotocol/portablegabi'
import RequestForAttestation from '../requestforattestation/RequestForAttestation'
import IAttestedClaim, { CompressedAttestedClaim } from './AttestedClaim'
import IClaim, { CompressedClaim } from './Claim'
import { IDelegationBaseNode } from './Delegation'

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
  privacyEnhancement: AttestationRequest | null
  legitimations: IAttestedClaim[]
  rootHash: Hash
}

export type CompressedNonceHash = [string, string?]

export type CompressedNonceHashTree = Record<string, any>

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
  RequestForAttestation['delegationId'],
  RequestForAttestation['privacyEnhancement']
]
