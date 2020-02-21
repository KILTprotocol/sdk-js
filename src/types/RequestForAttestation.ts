/**
 * @packageDocumentation
 * @module IRequestForAttestation
 */
import IClaim from './Claim'
import { IDelegationBaseNode } from './Delegation'
import AttestedClaim from '../attestedclaim/AttestedClaim'

export type Hash = string

export type NonceHash = {
  hash: Hash
  nonce: string
}

export default interface IRequestForAttestation {
  claim: IClaim
  legitimations: AttestedClaim[]
  claimOwner: NonceHash
  claimHashTree: object
  cTypeHash: NonceHash
  rootHash: Hash
  claimerSignature: string
  delegationId: IDelegationBaseNode['id'] | null
}
