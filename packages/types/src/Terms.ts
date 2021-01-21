/**
 * @packageDocumentation
 * @module ITerms
 */

import IAttestedClaim from './AttestedClaim'
import IClaim from './Claim'
import ICType from './CType'
import { IDelegationBaseNode } from './Delegation'
import { IQuoteAttesterSigned } from './Quote'

export default interface ITerms {
  claim: Partial<IClaim>
  legitimations: IAttestedClaim[]
  delegationId?: IDelegationBaseNode['id']
  quote?: IQuoteAttesterSigned
  prerequisiteClaims?: ICType['hash']
}
