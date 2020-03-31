/**
 * @packageDocumentation
 * @module ITerms
 */

import DelegationNode from '../delegation/DelegationNode'
import ICType from './CType'
import { IQuoteAttesterSigned } from './Quote'
import { IPartialClaim } from '../messaging/Message'
import IAttestedClaim from './AttestedClaim'

export default interface ITerms {
  claim: IPartialClaim
  legitimations: IAttestedClaim[]
  delegationId?: DelegationNode['id']
  quote?: IQuoteAttesterSigned
  prerequisiteClaims?: ICType['hash']
}
