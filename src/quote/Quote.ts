/**
 * [[Quote]] constructs a framework for Attesters to make an offer for building a [[Claim]] on a [[CTYPE]] in which it includes a price and other terms & conditions upon which a claimer can agree.
 *
 * A [[Quote]] object represents a legal **offer** for the closure of a contract attesting a [[Claim]] from the [[CTYPE]] specified within the offer.
 *
 * A [[Quote]] comes with a versionable spec, allowing different [[Quote]] specs to exist over time and tracks under which [[Quote]] a contract was closed.
 *
 * @packageDocumentation
 * @module Quote
 * @preferred
 */

import Ajv from 'ajv'
import QuoteSchema from './QuoteSchema'
import Identity from '../identity/Identity'
import { IQuote, IQuoteAgreement, IQuoteAttesterSigned } from '../types/Quote'
import { hashObjectAsStr, verify } from '../crypto/Crypto'

export function validateQuoteSchema(
  schema: object,
  validate: object,
  messages?: string[]
): boolean {
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

export function fromAttesterSignedInput(
  deserializedQuote: IQuoteAttesterSigned
): IQuoteAttesterSigned {
  const { attesterSignature, ...basicQuote } = deserializedQuote
  if (
    !verify(
      hashObjectAsStr(basicQuote),
      attesterSignature,
      deserializedQuote.attesterAddress
    )
  ) {
    throw Error(
      `attestersSignature ${deserializedQuote.attesterSignature}
        does not check out with the supplied data`
    )
  }
  if (!validateQuoteSchema(QuoteSchema, basicQuote)) {
    throw new Error('Quote does not correspond to schema')
  }

  return {
    ...basicQuote,
    attesterSignature,
  }
}

export function createAttesterSignature(
  quoteInput: IQuote,
  attesterIdentity: Identity
): IQuoteAttesterSigned {
  const signature = attesterIdentity.signStr(hashObjectAsStr(quoteInput))
  return {
    ...quoteInput,
    attesterSignature: signature,
  }
}

export function fromQuoteDataAndIdentity(
  quoteInput: IQuote,
  identity: Identity
): IQuoteAttesterSigned {
  if (!validateQuoteSchema(QuoteSchema, quoteInput)) {
    throw new Error('Quote does not correspond to schema')
  }
  return createAttesterSignature(quoteInput, identity)
}

export function createAgreedQuote(
  claimerIdentity: Identity,
  attesterSignedQuote: IQuoteAttesterSigned,
  requestRootHash: string
): IQuoteAgreement {
  const { attesterSignature, ...basicQuote } = attesterSignedQuote
  if (
    !verify(
      hashObjectAsStr(basicQuote),
      attesterSignature,
      attesterSignedQuote.attesterAddress
    )
  ) {
    throw Error(`Quote Signature is invalid`)
  }
  const signature = claimerIdentity.signStr(
    hashObjectAsStr(attesterSignedQuote)
  )
  return {
    ...attesterSignedQuote,
    rootHash: requestRootHash,
    claimerSignature: signature,
  }
}

export function compressCost(quote: IQuote): any {
  return Object.values(quote.cost)
}

export function decompressCost(quote: IQuote['cost']): any {
  return { gross: quote[0], net: quote[1], vat: quote[2] }
}

export function compressQuote(quote: IQuote): any {
  return [
    quote.attesterAddress,
    quote.cTypeHash,
    compressCost(quote),
    quote.currency,
    quote.termsAndConditions,
    quote.timeframe,
  ]
}
export function decompressQuote(quote: any): any {
  return {
    attesterAddress: quote[0],
    cTypeHash: quote[1],
    cost: decompressCost(quote[2]),
    currency: quote[3],
    termsAndConditions: quote[4],
    timeframe: quote[5],
  }
}

export function compressAttesterSignedQuote(
  attesterSignedQuote: IQuoteAttesterSigned
): any {
  return [
    ...compressQuote(attesterSignedQuote),
    attesterSignedQuote.attesterSignature,
  ]
}

export function decompressAttesterSignedQuote(attesterSignedQuote: any): any {
  return {
    attesterAddress: attesterSignedQuote[0],
    cTypeHash: attesterSignedQuote[1],
    cost: decompressCost(attesterSignedQuote[2]),
    currency: attesterSignedQuote[3],
    termsAndConditions: attesterSignedQuote[4],
    timeframe: attesterSignedQuote[5],
    attesterSignature: attesterSignedQuote[6],
  }
}

export function compressAgreedQuote(agreedQuote: IQuoteAgreement): any {
  return [
    ...compressAttesterSignedQuote(agreedQuote),
    agreedQuote.rootHash,
    agreedQuote.claimerSignature,
  ]
}

export function decompressAgreedQuote(agreedQuote: any): any {
  return {
    attesterAddress: agreedQuote[0],
    cTypeHash: agreedQuote[1],
    cost: decompressCost(agreedQuote[2]),
    currency: agreedQuote[3],
    termsAndConditions: agreedQuote[4],
    timeframe: agreedQuote[5],
    attesterSignature: agreedQuote[6],
    rootHash: agreedQuote[7],
    claimerSignature: agreedQuote[8],
  }
}
