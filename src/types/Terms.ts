/**
 * @packageDocumentation
 * @module ITerms
 */

import DelegationNode from '../delegation/DelegationNode'
import { IPartialClaim } from '../messaging/Message'
import IAttestedClaim, { CompressedAttestedClaim } from './AttestedClaim'
import ICType from './CType'
import { IQuoteAttesterSigned, CompressedQuoteAttesterSigned } from './Quote'
import { CompressedClaim } from './Claim'

export default interface ITerms {
  claim: IPartialClaim | CompressedClaim
  legitimations: IAttestedClaim[] | CompressedAttestedClaim[]
  delegationId?: DelegationNode['id']
  quote?: IQuoteAttesterSigned | CompressedQuoteAttesterSigned
  prerequisiteClaims?: ICType['hash']
}
