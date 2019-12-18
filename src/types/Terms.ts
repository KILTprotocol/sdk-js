/**
 * @module TypeInterfaces/Terms
 */
/**
 * Dummy comment needed for correct doc display, do not remove.
 */

import DelegationNode from '../delegation/DelegationNode'
import IClaim from './Claim'
import IQuote from './Quote'
import { IPartialClaim } from '../messaging/Message'

export default interface ITerms {
  claim: IPartialClaim
  legitimations: object[]
  delegationId?: DelegationNode['id']
  quote?: IQuote
  prerequisiteClaims?: Array<IClaim['cTypeHash']>
}
