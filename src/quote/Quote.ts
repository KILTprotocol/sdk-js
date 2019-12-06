/**
 * Quote construct a framework for Attesters to make an offer for building a [[Claim]] on a [[CTYPE]] in which it includes a price and other terms & conditions upon which a claimer can agree.
 *
 * A Quote object represents a legal **offer** for the closure of a contract attesting a [[Claim]] from the [[CTYPE]] specified within the offer.
 *
 * A Quote comes with a versionable spec, allowing different Quote spec to exists over time and tracks under which Quote a contract was closed.
 *
 * @module Quote
 * @preferred
 */

/**
 * Dummy comment needed for correct doc display, do not remove.
 */

import IQuote from '../types/Quote'
import { validateQuoteSchema } from '../ctype/CTypeUtils'
import QuoteSchema from './QuoteSchema'

export default class Quote implements IQuote {
  public static fromQuote(quoteInput: IQuote): Quote {
    if (!validateQuoteSchema(QuoteSchema, quoteInput)) {
      throw new Error('Quote does not correspond to schema')
    }
    return new Quote(quoteInput)
  }

  public attesterAddress: IQuote['attesterAddress']
  public cTypeHash: IQuote['cTypeHash']
  public cost: IQuote['cost']
  public currency: IQuote['currency']
  public quoteTimeframe: IQuote['quoteTimeframe']
  public termsAndConditions: IQuote['termsAndConditions']
  public version: IQuote['version']

  public constructor(quoteInput: Quote) {
    this.attesterAddress = quoteInput.attesterAddress
    this.cTypeHash = quoteInput.cTypeHash
    this.cost = quoteInput.cost
    this.currency = quoteInput.currency
    this.quoteTimeframe = quoteInput.quoteTimeframe
    this.termsAndConditions = quoteInput.termsAndConditions
    this.version = quoteInput.version
  }
}
