/**
 * @packageDocumentation
 * @module ITerms
 */

import DelegationNode from '../delegation/DelegationNode'
import { IPartialClaim, IPartialCompressedClaim } from '../messaging/Message'
import IAttestedClaim, { CompressedAttestedClaim } from './AttestedClaim'
import ICType from './CType'
import { IQuoteAttesterSigned, CompressedQuoteAttesterSigned } from './Quote'

export default interface ITerms {
  claim: IPartialClaim
  legitimations: IAttestedClaim[]
  delegationId?: DelegationNode['id']
  quote?: IQuoteAttesterSigned
  prerequisiteClaims?: ICType['hash']
}

export type ICompressedTerms = [
  IPartialCompressedClaim,
  CompressedAttestedClaim[],
  DelegationNode['id'] | undefined,
  CompressedQuoteAttesterSigned | undefined,
  ICType['hash'] | undefined
]
