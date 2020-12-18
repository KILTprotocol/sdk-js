/**
 * @packageDocumentation
 * @module ITerms
 */

import DelegationNode from '../delegation/DelegationNode'
import { IPartialClaim } from '../messaging/Message'
import IAttestedClaim from './AttestedClaim'
import ICType from './CType'
import { IQuoteAttesterSigned } from './Quote'

export default interface ITerms {
  claim: IPartialClaim
  legitimations: IAttestedClaim[]
  delegationId?: DelegationNode['id']
  quote?: IQuoteAttesterSigned
  prerequisiteClaims?: ICType['hash']
}
