/**
 * @module TypeInterfaces/quote
 */
/**
 * Dummy comment needed for correct doc display, do not remove.
 */

import ICType from './CType'

export interface ICostBreakdown {
  tax: number
  net: number
  gross: number
}
export default interface IQuote {
  attesterAddress: string
  cTypeHash: ICType['hash']
  cost: ICostBreakdown
  currency: string
  timeframe: Date
  termsAndConditions: string
  specVersion: string
}
export interface IQuoteAttesterSigned extends IQuote {
  quoteHash: string
  attesterSignature: string
}

export interface IQuoteAgreement extends IQuoteAttesterSigned {
  rootHash: string
  claimerSignature: string
}
