/**
 * @packageDocumentation
 * @module ITerms
 */

import DelegationNode from '../delegation/DelegationNode'
import ICType from './CType'
import { IQuoteAttesterSigned } from './Quote'
import { IPartialClaim } from '../messaging/Message'

export default interface ITerms {
  claim: IPartialClaim
  legitimations: object[]
  delegationId?: DelegationNode['id']
  quote?: IQuoteAttesterSigned
  prerequisiteClaims?: ICType['hash']
}
