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
import { IQuote, IQuoteAgreement, IQuoteAttesterSigned } from '../types/Quote'
import { hashObjectAsStr, verify } from '../crypto/Crypto'

/**
 * Validates the quote against the meta schema and quote data against the provided schema.
 *
 * @param schema A [[Quote]] schema object.
 * @param validate [[Quote]] data to be validated against the provided schema.
 * @param messages The validating function provides an array of errors, in the case of validation failures.
 *
 * @returns Boolean to provide a check against the data.
 */

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

/**
 * Deserializes a [[Quote]] object into a readable format.
 *
 * @param deserializedQuote A serialized [[Quote]] object.
 *
 * @returns A human readable [[Quote]] object.
 */

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

/**
 * Signs a [[Quote]] object as an Attester, created via [[fromQuoteDataAndIdentity]].
 *
 * @param quoteInput A [[Quote]] object.
 * @param attesterIdentity [[Identity]] used to sign the object.
 *
 * @returns A signed [[Quote]] object.
 */

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

/**
 * Creates a [[Quote]] object with a given [[Identity]].
 *
 * @param quoteInput A [[Quote]] object.
 * @param identity [[Identity]] to add the public address of the Attester.
 *
 * @returns A [[Quote]] object ready to be signed via [[createAttesterSignature]].
 */

export function fromQuoteDataAndIdentity(
  quoteInput: IQuote,
  identity: Identity
): IQuoteAttesterSigned {
  if (!validateQuoteSchema(QuoteSchema, quoteInput)) {
    throw new Error('Quote does not correspond to schema')
  }
  return createAttesterSignature(quoteInput, identity)
}

/**
 * Creates a [[Quote]] signed by the Attester and the Claimer.
 *
 * @param claimerIdentity [[Identity]] of the Claimer in order to sign.
 * @param attesterSignedQuote An Attester signed [[Quote]] object.
 * @param requestRootHash A root hash of the entire object.
 *
 * @returns A [[Quote]] agreement signed by both the Attester and Claimer.
 */

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
