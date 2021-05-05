/**
 * @packageDocumentation
 * @module ITerms
 */

import type { IAttestedClaim, CompressedAttestedClaim } from './AttestedClaim'
import type { ICType } from './CType'
import type { IDelegationBaseNode } from './Delegation'
import type {
  IQuoteAttesterSigned,
  CompressedQuoteAttesterSigned,
} from './Quote'
import type { CompressedPartialClaim } from './Message'
import type { PartialClaim } from './Claim'

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
