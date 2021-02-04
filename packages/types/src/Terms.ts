/**
 * @packageDocumentation
 * @module ITerms
 */

import { IAttestedClaim, CompressedAttestedClaim } from './AttestedClaim'
import { ICType } from './CType'
import { IDelegationBaseNode } from './Delegation'
import { IQuoteAttesterSigned, CompressedQuoteAttesterSigned } from './Quote'
import { CompressedPartialClaim } from './Message'
import { PartialClaim } from './Claim'

export interface ITerms {
  claim: PartialClaim
  legitimations: IAttestedClaim[]
  delegationId?: IDelegationBaseNode['id']
  quote?: IQuoteAttesterSigned
  prerequisiteClaims?: ICType['hash']
}

export type CompressedTerms = [
  CompressedPartialClaim,
  CompressedAttestedClaim[],
  IDelegationBaseNode['id'] | undefined,
  CompressedQuoteAttesterSigned | undefined,
  ICType['hash'] | undefined
]
