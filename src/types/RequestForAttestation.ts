/**
 * @packageDocumentation
 * @module IRequestForAttestation
 */
import IClaim from './Claim'
import { IDelegationBaseNode } from './Delegation'
import IAttestedClaim from './AttestedClaim'

export type Hash = string

export type NonceHash = {
  hash: Hash
  nonce?: string
}

export type ClaimHashTree = {
  [key: string]: NonceHash
}

export default interface IRequestForAttestation {
  claim: IClaim
  claimHashTree: ClaimHashTree
  claimOwner: NonceHash
  claimerSignature: string
  cTypeHash: NonceHash
  delegationId: IDelegationBaseNode['id'] | null
  legitimations: IAttestedClaim[]
  rootHash: Hash
}
