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
import {
  IQuote,
  IQuoteAgreement,
  IQuoteAttesterSigned,
  ICostBreakdown,
} from '../types/Quote'
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
/**
 *  Compresses the cost from a [[Quote]] object.
 *
 * @param cost A cost object that will be sorted and stripped into a [[Quote]].
 *
 * @returns An ordered array of a cost.
 */

export function compressCost(cost: ICostBreakdown): any[] {
  return Object.values(cost)
}

/**
 *  Decompresses the cost from storage and/or message.
 *
 * @param cost A compressesd cost array that is reverted back into an object.
 *
 * @returns An object that has the same properties as a cost.
 */

export function decompressCost(cost: ICostBreakdown): ICostBreakdown {
  return { gross: cost[0], net: cost[1], tax: cost[2] }
}

/**
 *  Compresses a [[Quote]] for storage and/or messaging.
 *
 * @param quote An [[Quote]] object that will be sorted and stripped for messaging or storage.
 *
 * @returns An ordered array of an [[Quote]].
 */

export function compressQuote(quote: IQuote): any[] {
  return [
    quote.attesterAddress,
    quote.cTypeHash,
    compressCost(quote.cost),
    quote.currency,
    quote.termsAndConditions,
    quote.timeframe,
  ]
}

/**
 *  Decompresses an [[Quote]] from storage and/or message.
 *
 * @param quote A compressesd [[Quote]] array that is reverted back into an object.
 *
 * @returns An object that has the same properties as an [[Quote]].
 */

export function decompressQuote(quote: any[]): IQuote {
  return {
    attesterAddress: quote[0],
    cTypeHash: quote[1],
    cost: decompressCost(quote[2]),
    currency: quote[3],
    termsAndConditions: quote[4],
    timeframe: quote[5],
  }
}

/**
 *  Compresses an attester signed [[Quote]] for storage and/or messaging.
 *
 * @param attesterSignedQuote An attester signed [[Quote]] object that will be sorted and stripped for messaging or storage.
 *
 * @returns An ordered array of an attester signed [[Quote]].
 */

export function compressAttesterSignedQuote(
  attesterSignedQuote: IQuoteAttesterSigned
): any[] {
  return [
    ...compressQuote(attesterSignedQuote),
    attesterSignedQuote.attesterSignature,
  ]
}

/**
 *  Decompresses an attester signed [[Quote]] from storage and/or message.
 *
 * @param attesterSignedQuote A compressesd attester signed [[Quote]] array that is reverted back into an object.
 *
 * @returns An object that has the same properties as an attester signed [[Quote]].
 */

export function decompressAttesterSignedQuote(
  attesterSignedQuote: any[]
): IQuoteAttesterSigned {
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

/**
 *  Compresses a [[Quote]] Agreement for storage and/or messaging.
 *
 * @param quoteAgreement A [[Quote]] Agreement object that will be sorted and stripped for messaging or storage.
 *
 * @returns An ordered array of a [[Quote]] Agreement.
 */

export function compressQuoteAgreement(quoteAgreement: IQuoteAgreement): any[] {
  return [
    ...compressAttesterSignedQuote(quoteAgreement),
    quoteAgreement.rootHash,
    quoteAgreement.claimerSignature,
  ]
}

/**
 *  Decompresses a [[Quote]] Agreement from storage and/or message.
 *
 * @param quoteAgreement A compressesd [[Quote]] Agreement array that is reverted back intobject.
 *
 * @returns An object that has the same properties as a [[Quote]] Agreement.
 */

export function decompressQuoteAgreement(
  quoteAgreement: any[]
): IQuoteAgreement {
  return {
    attesterAddress: quoteAgreement[0],
    cTypeHash: quoteAgreement[1],
    cost: decompressCost(quoteAgreement[2]),
    currency: quoteAgreement[3],
    termsAndConditions: quoteAgreement[4],
    timeframe: quoteAgreement[5],
    attesterSignature: quoteAgreement[6],
    rootHash: quoteAgreement[7],
    claimerSignature: quoteAgreement[8],
  }
}
