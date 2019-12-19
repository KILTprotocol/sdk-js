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
  quoteTimeframe: Date
  termsAndConditions: string
  version: string
}
export interface IQuoteAttesterSigned {
  quote: IQuote
  quoteHash: string
  attesterSignature: string
}

export interface IQuoteAgreement {
  quoteSignedAttester: IQuoteAttesterSigned
  claimerSignature: string
}
