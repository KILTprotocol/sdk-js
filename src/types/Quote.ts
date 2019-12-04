/**
 * @module TypeInterfaces/Offer
 */
/**
 * Dummy comment needed for correct doc display, do not remove.
 */

import IClaim from './Claim'

export interface ICostBreakdown {
  tax: number
  net: number
  gross: number
}

export default interface IQuote {
  attesterID: string
  cTypeHash: IClaim['cTypeHash']
  cost: ICostBreakdown
  currency: string
  offerTimeframe: string
  termsAndConditions: string
  version: string
}
