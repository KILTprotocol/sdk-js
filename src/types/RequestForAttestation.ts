/**
 * @module TypeInterfaces/RequestForAttestation
 */
/**
 * Dummy comment needed for correct doc display, do not remove.
 */
import IClaim from './Claim'
import { IDelegationBaseNode } from './Delegation'
import IAttestedClaim from './AttestedClaim'

export type Hash = string

export type NonceHash = {
  nonce: string
  hash: Hash
}

export default interface IRequestForAttestation {
  claim: IClaim
  legitimations: IAttestedClaim[]
  claimOwner: NonceHash
  claimerSignature: string
  claimHashTree: object
  ctypeHash: NonceHash
  rootHash: Hash
  delegationId?: IDelegationBaseNode['id']
}
