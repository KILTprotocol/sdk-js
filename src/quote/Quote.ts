/**
 * [[Quote]] constructs a framework for Attesters to make an offer for building a [[Claim]] on a [[CTYPE]] in which it includes a price and other terms & conditions upon which a claimer can agree.
 *
 * A [[Quote]] object represents a legal **offer** for the closure of a contract attesting a [[Claim]] from the [[CTYPE]] specified within the offer.
 *
 * A [[Quote]] comes with a versionable spec, allowing different [[Quote]] specs to exist over time and tracks under which [[Quote]] a contract was closed.
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
import IQuote, { IQuoteAgreement, IQuoteAttesterSigned } from '../types/Quote'
import { hashObjectAsStr, verify } from '../crypto/Crypto'

export default class Quote implements IQuote {
  public static fromAttesterSignedInput(
    deserializedQuote: IQuoteAttesterSigned
  ): IQuoteAttesterSigned {
    const { quoteHash, attesterSignature, ...basicQuote } = deserializedQuote
    const quote = new Quote(basicQuote)
    if (!Quote.validateQuoteSchema(QuoteSchema, quote)) {
      throw new Error('Quote does not correspond to schema')
    }
    if (!Quote.verifyQuoteHash(quote, quoteHash)) {
      throw Error('Invalid Quote Hash')
    }
    if (
      !verify(
        JSON.stringify(quote),
        attesterSignature,
        deserializedQuote.attesterAddress
      )
    ) {
      throw Error(
        `attestersSignature ${deserializedQuote.attesterSignature}
        does not check out with the supplied data`
      )
    }
    return {
      ...quote,
      quoteHash,
      attesterSignature,
    }
  }

  public static fromQuoteDataAndIdentity(
    quoteInput: IQuote,
    identity: Identity
  ): IQuoteAttesterSigned {
    if (!Quote.validateQuoteSchema(QuoteSchema, quoteInput)) {
      throw new Error('Quote does not correspond to schema')
    }
    const quote = new Quote(quoteInput)
    return quote.createAttesterSignature(identity)
  }

  public attesterAddress: IQuote['attesterAddress']
  public cTypeHash: IQuote['cTypeHash']
  public cost: IQuote['cost']
  public currency: IQuote['currency']
  public quoteTimeframe: IQuote['quoteTimeframe']
  public termsAndConditions: IQuote['termsAndConditions']
  public specVersion: IQuote['specVersion']

  public constructor(quoteInput: IQuote) {
    this.attesterAddress = quoteInput.attesterAddress
    this.cTypeHash = quoteInput.cTypeHash
    this.cost = quoteInput.cost
    this.currency = quoteInput.currency
    this.quoteTimeframe = quoteInput.quoteTimeframe
    this.termsAndConditions = quoteInput.termsAndConditions
    this.specVersion = quoteInput.specVersion
  }

  public createAttesterSignature(
    attesterIdentity: Identity
  ): IQuoteAttesterSigned {
    const generatedQuoteHash = hashObjectAsStr(this)
    const quoteWithHash = { ...this, quoteHash: generatedQuoteHash }
    const signature = attesterIdentity.signStr(JSON.stringify(quoteWithHash))
    if (!Quote.verifyQuoteHash(this, generatedQuoteHash)) {
      throw Error('Invalid Quote Hash')
    }
    return {
      ...quoteWithHash,
      attesterSignature: signature,
    }
  }

  public static createAgreedQuote(
    claimerIdentity: Identity,
    attestersignedQuote: IQuoteAttesterSigned,
    requestRootHash: string
  ): IQuoteAgreement {
    const { attesterSignature, ...noAttesterSignature } = attestersignedQuote
    if (
      !verify(
        JSON.stringify({ ...noAttesterSignature }),
        attesterSignature,
        attestersignedQuote.attesterAddress
      )
    ) {
      throw Error(`Quote Signature could not be verified`)
    }
    const signature = claimerIdentity.signStr(
      JSON.stringify(attestersignedQuote)
    )
    return {
      ...attestersignedQuote,
      rootHash: requestRootHash,
      claimerSignature: signature,
    }
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

  public static verifyQuoteHash(quote: IQuote, quoteHash: string): boolean {
    return hashObjectAsStr(quote) === quoteHash
  }
}
