/**
 * @module TypeInterfaces/Terms
 */
/**
 * Dummy comment needed for correct doc display, do not remove.
 */

import DelegationNode from '../delegation/DelegationNode'
import IClaim from './Claim'
import IQuote from './Quote'

export default interface ITerms {
  claim: string
  legitimations: object[]
  delegationId?: DelegationNode['id']
  quote?: IQuote
  prerequisiteClaims?: Array<IClaim['cTypeHash']>
}
