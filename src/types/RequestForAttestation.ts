/**
 * @packageDocumentation
 * @module IRequestForAttestation
 */
import { AttestationRequest } from '@kiltprotocol/portablegabi'
import IClaim from './Claim'
import { IDelegationBaseNode } from './Delegation'
import AttestedClaim from '../attestedclaim/AttestedClaim'

export type Hash = string

export type NonceHash = {
  nonce: string
  hash: Hash
}

export type NonceHashTree = NonceHash | { [key: string]: NonceHashTree }

export default interface IRequestForAttestation {
  claim: IClaim
  legitimations: AttestedClaim[]
  claimOwner: NonceHash
  claimHashTree: NonceHashTree
  cTypeHash: NonceHash
  rootHash: Hash
  claimerSignature: string
  delegationId: IDelegationBaseNode['id'] | null
  privacyEnhanced: AttestationRequest | null
}
