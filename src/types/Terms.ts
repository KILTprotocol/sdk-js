/**
 * @module TypeInterfaces/Terms
 */
/**
 * Dummy comment needed for correct doc display, do not remove.
 */

import DelegationNode from '../delegation/DelegationNode'
import ICType from './CType'
import IQuoteAttesterSigned from './Quote'
import { IPartialClaim } from '../messaging/Message'

export default interface ITerms {
  claim: IPartialClaim
  legitimations: object[]
  delegationId?: DelegationNode['id']
  quote?: IQuoteAttesterSigned // The Attester has Signed the Quote, which the claimer has requested.
  prerequisiteClaims?: ICType['hash']
}
