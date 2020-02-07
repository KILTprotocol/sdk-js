/**
 * @module TypeInterfaces/quote
 */
/**
 * Dummy comment needed for correct doc display, do not remove.
 */

import ICType from './CType'

export interface ICostBreakdown {
  tax: object
  net: number
  gross: number
}
export interface IQuote {
  attesterAddress: string
  cTypeHash: ICType['hash']
  cost: ICostBreakdown
  currency: string
  timeframe: Date
  termsAndConditions: string
}
export interface IQuoteAttesterSigned extends IQuote {
  attesterSignature: string
}

export interface IQuoteAgreement extends IQuoteAttesterSigned {
  rootHash: string
  claimerSignature: string
}
