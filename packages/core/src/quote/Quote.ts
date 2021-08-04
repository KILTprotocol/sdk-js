/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

/**
 * [[Quote]] constructs a framework for Attesters to make an offer for building a [[Claim]] on a [[CType]] in which it includes a price and other terms & conditions upon which a claimer can agree.
 *
 * A [[Quote]] object represents a legal **offer** for the closure of a contract attesting a [[Claim]] from the [[CType]] specified within the offer.
 *
 * A [[Quote]] comes with a versionable spec, allowing different [[Quote]] specs to exist over time and tracks under which [[Quote]] a contract was closed.
 *
 * @packageDocumentation
 * @module Quote
 */

import Ajv from 'ajv'
import type {
  IDidDetails,
  IQuote,
  IQuoteAgreement,
  IQuoteAttesterSigned,
  KeystoreSigner,
} from '@kiltprotocol/types'
import { Crypto, SDKErrors } from '@kiltprotocol/utils'
import { DidUtils } from '@kiltprotocol/did'
import QuoteSchema from './QuoteSchema'

/**
 * Validates the quote against the meta schema and quote data against the provided schema.
 *
 * @param schema A [[Quote]] schema object.
 * @param validate [[Quote]] data to be validated against the provided schema.
 * @param messages The errors messages are listed in an array.
 *
 * @returns Whether the quote schema is valid.
 */

export function validateQuoteSchema(
  schema: unknown,
  validate: unknown,
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
      ajv.errors.forEach((error: Ajv.ErrorObject) => {
        if (typeof error.message === 'string') {
          messages.push(error.message)
        }
      })
    }
  }
  return !!result
}

/**
 * Builds a [[Quote]] object, from a simple object with the same properties.
 *
 * @param deserializedQuote The object which is used to create the attester signed [[Quote]] object.
 * @throws [[ERROR_QUOTE_MALFORMED]] when the derived basicQuote can not be validated with the QuoteSchema.
 *
 * @returns A [[Quote]] object signed by an Attester.
 */

export function fromAttesterSignedInput(
  deserializedQuote: IQuoteAttesterSigned,
  attesterDid: IDidDetails
): IQuoteAttesterSigned {
  const { attesterSignature, ...basicQuote } = deserializedQuote
  DidUtils.verifyDidSignature({
    ...attesterSignature,
    message: Crypto.hashObjectAsStr(basicQuote),
    didDetails: attesterDid,
    keyRelationship: 'authentication',
  })
  if (!validateQuoteSchema(QuoteSchema, basicQuote)) {
    throw SDKErrors.ERROR_QUOTE_MALFORMED()
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

export async function createAttesterSignature(
  quoteInput: IQuote,
  attesterIdentity: IDidDetails,
  signer: KeystoreSigner
): Promise<IQuoteAttesterSigned> {
  const signature = await DidUtils.authenticateWithDid(
    Crypto.hashObjectAsStr(quoteInput),
    attesterIdentity,
    signer
  )
  return {
    ...quoteInput,
    attesterSignature: signature,
  }
}

/**
 * Creates a [[Quote]] object signed by the given [[Identity]].
 *
 * @param quoteInput A [[Quote]] object.
 * @param identity [[Identity]] used to sign the object.
 * @throws [[ERROR_QUOTE_MALFORMED]] when the derived quoteInput can not be validated with the QuoteSchema.
 *
 * @returns A [[Quote]] object ready to be signed via [[createAttesterSignature]].
 */

export async function fromQuoteDataAndIdentity(
  quoteInput: IQuote,
  attesterIdentity: IDidDetails,
  signer: KeystoreSigner
): Promise<IQuoteAttesterSigned> {
  if (!validateQuoteSchema(QuoteSchema, quoteInput)) {
    throw SDKErrors.ERROR_QUOTE_MALFORMED()
  }
  return createAttesterSignature(quoteInput, attesterIdentity, signer)
}

/**
 * Creates a [[Quote]] signed by the Attester and the Claimer.
 *
 * @param claimerIdentity [[Identity]] of the Claimer in order to sign.
 * @param attesterSignedQuote A [[Quote]] object signed by an Attester.
 * @param requestRootHash A root hash of the entire object.
 *
 * @returns A [[Quote]] agreement signed by both the Attester and Claimer.
 */

export async function createQuoteAgreement(
  attesterSignedQuote: IQuoteAttesterSigned,
  requestRootHash: string,
  attesterIdentity: IDidDetails,
  claimerIdentity: IDidDetails,
  signer: KeystoreSigner
): Promise<IQuoteAgreement> {
  const { attesterSignature, ...basicQuote } = attesterSignedQuote

  if (attesterIdentity.did !== attesterSignedQuote.attesterDid)
    throw SDKErrors.ERROR_DID_IDENTIFIER_MISMATCH(
      attesterIdentity.did,
      attesterSignedQuote.attesterDid
    )

  DidUtils.verifyDidSignature({
    ...attesterSignature,
    message: Crypto.hashObjectAsStr(basicQuote),
    didDetails: attesterIdentity,
    keyRelationship: 'authentication',
  })

  const signature = await DidUtils.authenticateWithDid(
    Crypto.hashObjectAsStr(attesterSignedQuote),
    claimerIdentity,
    signer
  )

  return {
    ...attesterSignedQuote,
    rootHash: requestRootHash,
    claimerSignature: signature,
  }
}
