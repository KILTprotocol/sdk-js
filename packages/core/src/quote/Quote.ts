/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
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
 */

import type {
  IQuote,
  IQuoteAgreement,
  IQuoteAttesterSigned,
  ICredential,
  SignCallback,
  DidResolveKey,
  DidUri,
} from '@kiltprotocol/types'
import { Crypto, JsonSchema, SDKErrors } from '@kiltprotocol/utils'
import {
  resolveKey,
  verifyDidSignature,
  signatureToJson,
  signatureFromJson,
} from '@kiltprotocol/did'
import { QuoteSchema } from './QuoteSchema.js'

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
  schema: JsonSchema.Schema,
  validate: unknown,
  messages?: string[]
): boolean {
  const validator = new JsonSchema.Validator(schema)
  if (schema.$id !== QuoteSchema.$id) {
    validator.addSchema(QuoteSchema)
  }
  const result = validator.validate(validate)
  if (!result.valid && messages) {
    result.errors.forEach((error) => {
      messages.push(error.error)
    })
  }
  return result.valid
}

// TODO: should have a "create quote" function.

/**
 * Signs a [[Quote]] object as an Attester.
 *
 * @param quoteInput A [[Quote]] object.
 * @param sign The callback to sign with the private key.
 * @returns A signed [[Quote]] object.
 */
export async function createAttesterSignedQuote(
  quoteInput: IQuote,
  sign: SignCallback
): Promise<IQuoteAttesterSigned> {
  if (!validateQuoteSchema(QuoteSchema, quoteInput)) {
    throw new SDKErrors.QuoteUnverifiableError()
  }

  const signature = await sign({
    data: Crypto.hash(Crypto.encodeObjectAsStr(quoteInput)),
    did: quoteInput.attesterDid,
    keyRelationship: 'authentication',
  })
  return {
    ...quoteInput,
    attesterSignature: signatureToJson(signature),
  }
}

/**
 * Verifies a [[IQuoteAttesterSigned]] object.
 *
 * @param quote The object which to be verified.
 * @param options Optional settings.
 * @param options.didResolveKey Resolve function used in the process of verifying the attester signature.
 */
export async function verifyAttesterSignedQuote(
  quote: IQuoteAttesterSigned,
  {
    didResolveKey = resolveKey,
  }: {
    didResolveKey?: DidResolveKey
  } = {}
): Promise<void> {
  const { attesterSignature, ...basicQuote } = quote
  await verifyDidSignature({
    ...signatureFromJson(attesterSignature),
    message: Crypto.hashStr(Crypto.encodeObjectAsStr(basicQuote)),
    expectedSigner: basicQuote.attesterDid,
    expectedVerificationMethod: 'authentication',
    didResolveKey,
  })

  const messages: string[] = []
  if (!validateQuoteSchema(QuoteSchema, basicQuote, messages)) {
    throw new SDKErrors.QuoteUnverifiableError()
  }
}

/**
 * Creates a [[Quote]] signed by the Attester and the Claimer.
 *
 * @param attesterSignedQuote A [[Quote]] object signed by an Attester.
 * @param credentialRootHash A root hash of the entire object.
 * @param sign The callback to sign with the private key.
 * @param claimerDid The DID of the Claimer, who has to sign.
 * @param options Optional settings.
 * @param options.didResolveKey Resolve function used in the process of verifying the attester signature.
 * @returns A [[Quote]] agreement signed by both the Attester and Claimer.
 */
export async function createQuoteAgreement(
  attesterSignedQuote: IQuoteAttesterSigned,
  credentialRootHash: ICredential['rootHash'],
  sign: SignCallback,
  claimerDid: DidUri,
  {
    didResolveKey = resolveKey,
  }: {
    didResolveKey?: DidResolveKey
  } = {}
): Promise<IQuoteAgreement> {
  const { attesterSignature, ...basicQuote } = attesterSignedQuote

  await verifyDidSignature({
    ...signatureFromJson(attesterSignature),
    message: Crypto.hashStr(Crypto.encodeObjectAsStr(basicQuote)),
    expectedVerificationMethod: 'authentication',
    didResolveKey,
  })

  const signature = await sign({
    data: Crypto.hash(Crypto.encodeObjectAsStr(attesterSignedQuote)),
    did: claimerDid,
    keyRelationship: 'authentication',
  })

  return {
    ...attesterSignedQuote,
    rootHash: credentialRootHash,
    claimerSignature: signatureToJson(signature),
  }
}

// TODO: Should have a `verifyQuoteAgreement` function
