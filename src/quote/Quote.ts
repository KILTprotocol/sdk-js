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
  public offerTimeframe: IQuote['offerTimeframe']
  public termsAndConditions: IQuote['termsAndConditions']
  public version: IQuote['version']

  public constructor(quoteInput: Quote) {
    this.attesterAddress = quoteInput.attesterAddress
    this.cTypeHash = quoteInput.cTypeHash
    this.cost = quoteInput.cost
    this.currency = quoteInput.currency
    this.offerTimeframe = quoteInput.offerTimeframe
    this.termsAndConditions = quoteInput.termsAndConditions
    this.version = quoteInput.version
  }
}
