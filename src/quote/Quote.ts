/**
 * [[Quote]] constructs a framework for Attesters to make an offer for building a [[Claim]] on a [[CTYPE]] in which it includes a price and other terms & conditions upon which a claimer can agree.
 *
 * A [[Quote]] object represents a legal **offer** for the closure of a contract attesting a [[Claim]] from the [[CTYPE]] specified within the offer.
 *
 * A [[Quote]] comes with a versionable specs, allowing different [[Quote]] specs to exist over time and tracks under which [[Quote]] a contract was closed.
 *
 * @module Quote
 * @preferred
 */

/**
 * Dummy comment needed for correct doc display, do not remove.
 */

import Ajv from 'ajv'
import QuoteSchema from './QuoteSchema'
import Identity from '../identity/Identity'
import IQuote from '../types/Quote'

export default class Quote implements IQuote {
  public static fromQuote(quoteInput: IQuote, identity: Identity): Quote {
    if (!Quote.validateQuoteSchema(QuoteSchema, quoteInput)) {
      throw new Error('Quote does not correspond to schema')
    }
    return new Quote(quoteInput, identity)
  }

  public attesterAddress: IQuote['attesterAddress']
  public cTypeHash: IQuote['cTypeHash']
  public cost: IQuote['cost']
  public currency: IQuote['currency']
  public quoteTimeframe: IQuote['quoteTimeframe']
  public termsAndConditions: IQuote['termsAndConditions']
  public version: IQuote['version']
  // public attesterSignature: string

  public constructor(quoteInput: Quote, identity: Identity) {
    this.attesterAddress = identity.address
    this.cTypeHash = quoteInput.cTypeHash
    this.cost = quoteInput.cost
    this.currency = quoteInput.currency
    this.quoteTimeframe = quoteInput.quoteTimeframe
    this.termsAndConditions = quoteInput.termsAndConditions
    this.version = quoteInput.version
    // this.attesterSignature = identity.signStr(JSON.stringify(quoteInput))
  }

  public static validateQuoteSchema(
    schema: object,
    validate: object,
    messages?: string[]
  ): boolean | PromiseLike<any> {
    const ajv = new Ajv()
    ajv.addMetaSchema(QuoteSchema)
    const result = ajv.validate(
      JSON.parse(JSON.stringify(schema)),
      JSON.parse(JSON.stringify(validate))
    )
    if (!result && ajv.errors) {
      if (messages) {
        ajv.errors.forEach((error: any) => {
          messages.push(error.message)
        })
      }
    }
    return !!result
  }

  // public static signedQuote(identity: Identity, quoteObject: Quote): IQuoteAttesterSigned {
  //   const QuoteSigned: IQuoteSigned
  //   return QuoteSigned
  // }
}
