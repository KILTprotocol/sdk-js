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

export function verifyQuoteHash(quote: IQuote, quoteHash: string): boolean {
  return hashObjectAsStr(quote) === quoteHash
}

export function fromAttesterSignedInput(
  deserializedQuote: IQuoteAttesterSigned
): IQuoteAttesterSigned {
  const { attesterSignature, ...quoteWithHash } = deserializedQuote
  if (
    !verify(
      JSON.stringify(quoteWithHash),
      attesterSignature,
      deserializedQuote.attesterAddress
    )
  ) {
    throw Error(
      `attestersSignature ${deserializedQuote.attesterSignature}
        does not check out with the supplied data`
    )
  }
  const { quoteHash, ...basicQuote } = quoteWithHash
  if (!validateQuoteSchema(QuoteSchema, basicQuote)) {
    throw new Error('Quote does not correspond to schema')
  }
  if (!verifyQuoteHash(basicQuote, quoteHash)) {
    throw Error('Invalid Quote Hash')
  }

  return {
    ...basicQuote,
    quoteHash,
    attesterSignature,
  }
}

export function createAttesterSignature(
  quoteInput: IQuote,
  attesterIdentity: Identity
): IQuoteAttesterSigned {
  const quoteHash = hashObjectAsStr(quoteInput)
  const quoteWithHash = { ...quoteInput, quoteHash }
  const signature = attesterIdentity.signStr(JSON.stringify(quoteWithHash))
  if (!verifyQuoteHash(quoteInput, quoteHash)) {
    throw Error('Invalid Quote Hash')
  }
  return {
    ...quoteWithHash,
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
  const { attesterSignature, ...noAttesterSignature } = attesterSignedQuote
  if (
    !verify(
      JSON.stringify(noAttesterSignature),
      attesterSignature,
      attesterSignedQuote.attesterAddress
    )
  ) {
    throw Error(`Quote Signature is invalid`)
  }
  const signature = claimerIdentity.signStr(JSON.stringify(attesterSignedQuote))
  return {
    ...attesterSignedQuote,
    rootHash: requestRootHash,
    claimerSignature: signature,
  }
}
