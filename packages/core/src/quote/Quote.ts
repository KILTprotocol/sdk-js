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
  CompressedCostBreakdown,
  CompressedQuote,
  CompressedQuoteAgreed,
  CompressedQuoteAttesterSigned,
  DidPublicKey,
  DidSignature,
  DidVerificationKey,
  ICostBreakdown,
  IDidDetails,
  IDidResolver,
  IQuote,
  IQuoteAgreement,
  IQuoteAttesterSigned,
  IRequestForAttestation,
  SignCallback,
} from '@kiltprotocol/types'
import { Crypto, JsonSchema, SDKErrors } from '@kiltprotocol/utils'
import {
  DidDetails,
  DidKeySelectionCallback,
  DidResolver,
  Utils as DidUtils,
  verifyDidSignature,
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
 * @param attesterIdentity The DID used to sign the object.
 * @param sign The callback to sign with the private key.
 * @param options Optional settings.
 * @param options.keySelection Callback that receives all eligible public keys and returns the one to be used for signing.
 * @returns A signed [[Quote]] object.
 */
export async function createAttesterSignedQuote(
  quoteInput: IQuote,
  attesterIdentity: DidDetails,
  sign: SignCallback,
  {
    keySelection = DidUtils.defaultKeySelectionCallback,
  }: {
    keySelection?: DidKeySelectionCallback<DidVerificationKey>
  } = {}
): Promise<IQuoteAttesterSigned> {
  if (!validateQuoteSchema(QuoteSchema, quoteInput)) {
    throw new SDKErrors.ERROR_QUOTE_MALFORMED()
  }

  const authenticationKey = await keySelection(
    attesterIdentity.getVerificationKeys('authentication')
  )
  if (!authenticationKey) {
    throw new SDKErrors.ERROR_DID_ERROR(
      `The attester ${attesterIdentity.uri} does not have a valid authentication key.`
    )
  }
  const signature = await attesterIdentity.signPayload(
    Crypto.hashObjectAsStr(quoteInput),
    sign,
    authenticationKey.id
  )
  return {
    ...quoteInput,
    attesterSignature: {
      keyUri: attesterIdentity.assembleKeyUri(authenticationKey.id),
      signature: signature.signature,
    },
  }
}

/**
 * Verifies a [[IQuoteAttesterSigned]] object.
 *
 * @param quote The object which to be verified.
 * @param options Optional settings.
 * @param options.resolver DidResolver used in the process of verifying the attester signature.
 * @throws [[ERROR_QUOTE_MALFORMED]] when the quote can not be validated with the QuoteSchema.
 */
export async function verifyAttesterSignedQuote(
  quote: IQuoteAttesterSigned,
  {
    resolver = DidResolver,
  }: {
    resolver?: IDidResolver
  } = {}
): Promise<void> {
  const { attesterSignature, ...basicQuote } = quote
  const result = await verifyDidSignature({
    signature: attesterSignature,
    message: Crypto.hashObjectAsStr(basicQuote),
    expectedVerificationMethod: 'authentication',
    resolver,
  })

  if (!result.verified) {
    // TODO: should throw a "signature not verifiable" error, with the reason attached.
    throw new SDKErrors.ERROR_QUOTE_MALFORMED()
  }

  const messages: string[] = []
  if (!validateQuoteSchema(QuoteSchema, basicQuote, messages)) {
    throw new SDKErrors.ERROR_QUOTE_MALFORMED()
  }
}

/**
 * Creates a [[Quote]] signed by the Attester and the Claimer.
 *
 * @param attesterSignedQuote A [[Quote]] object signed by an Attester.
 * @param requestRootHash A root hash of the entire object.
 * @param attesterIdentity The uri of the Attester DID.
 * @param claimerIdentity The DID of the Claimer in order to sign.
 * @param sign The callback to sign with the private key.
 * @param options Optional settings.
 * @param options.keySelection Callback that receives all eligible public keys and returns the one to be used for signing.
 * @param options.resolver DidResolver used in the process of verifying the attester signature.
 * @returns A [[Quote]] agreement signed by both the Attester and Claimer.
 */
export async function createQuoteAgreement(
  attesterSignedQuote: IQuoteAttesterSigned,
  requestRootHash: IRequestForAttestation['rootHash'],
  attesterIdentity: IDidDetails['uri'],
  claimerIdentity: DidDetails,
  sign: SignCallback,
  {
    keySelection = DidUtils.defaultKeySelectionCallback,
    resolver = DidResolver,
  }: {
    keySelection?: DidKeySelectionCallback<DidVerificationKey>
    resolver?: IDidResolver
  } = {}
): Promise<IQuoteAgreement> {
  const { attesterSignature, ...basicQuote } = attesterSignedQuote

  if (attesterIdentity !== attesterSignedQuote.attesterDid)
    throw new SDKErrors.ERROR_DID_IDENTIFIER_MISMATCH(
      attesterIdentity,
      attesterSignedQuote.attesterDid
    )

  await verifyDidSignature({
    signature: attesterSignature,
    message: Crypto.hashObjectAsStr(basicQuote),
    expectedVerificationMethod: 'authentication',
    resolver,
  })

  const claimerAuthenticationKey = await keySelection(
    claimerIdentity.getVerificationKeys('authentication')
  )
  if (!claimerAuthenticationKey) {
    throw new SDKErrors.ERROR_DID_ERROR(
      `Claimer DID ${claimerIdentity.uri} does not have an authentication key.`
    )
  }

  const signature = await claimerIdentity.signPayload(
    Crypto.hashObjectAsStr(attesterSignedQuote),
    sign,
    claimerAuthenticationKey.id
  )

  return {
    ...attesterSignedQuote,
    rootHash: requestRootHash,
    claimerSignature: signature,
  }
}

// TODO: Should have a `verifyQuoteAgreement` function

/**
 * Compresses the cost from a [[Quote]] object.
 *
 * @param cost A cost object that will be sorted and stripped into a [[Quote]].
 * @throws [[ERROR_COMPRESS_OBJECT]] when cost is missing any property defined in [[ICostBreakdown]].
 *
 * @returns An ordered array of a cost.
 */
export function compressCost(cost: ICostBreakdown): CompressedCostBreakdown {
  if (!cost.gross || !cost.net || !cost.tax) {
    throw new SDKErrors.ERROR_COMPRESS_OBJECT(cost, 'Cost Breakdown')
  }
  return [cost.gross, cost.net, cost.tax]
}

/**
 * Decompresses the cost from storage and/or message.
 *
 * @param cost A compressed cost array that is reverted back into an object.
 * @throws [[ERROR_DECOMPRESSION_ARRAY]] when cost is not an Array and its length does not equal the defined length of 3.
 *
 * @returns An object that has the same properties as a cost.
 */
export function decompressCost(cost: CompressedCostBreakdown): ICostBreakdown {
  if (!Array.isArray(cost) || cost.length !== 3) {
    throw new SDKErrors.ERROR_DECOMPRESSION_ARRAY('Cost Breakdown')
  }
  return { gross: cost[0], net: cost[1], tax: cost[2] }
}

/**
 * Compresses a [[Quote]] for storage and/or messaging.
 *
 * @param quote An [[Quote]] object that will be sorted and stripped for messaging or storage.
 * @throws [[ERROR_COMPRESS_OBJECT]] when quote is missing any property defined in [[IQuote]].
 *
 * @returns An ordered array of an [[Quote]].
 */
export function compressQuote(quote: IQuote): CompressedQuote {
  if (
    !quote.attesterDid ||
    !quote.cTypeHash ||
    !quote.cost ||
    !quote.currency ||
    !quote.termsAndConditions ||
    !quote.timeframe
  ) {
    throw new SDKErrors.ERROR_COMPRESS_OBJECT(quote, 'Quote')
  }
  return [
    quote.attesterDid,
    quote.cTypeHash,
    compressCost(quote.cost),
    quote.currency,
    quote.termsAndConditions,
    quote.timeframe,
  ]
}

/**
 * Decompresses an [[Quote]] from storage and/or message.
 *
 * @param quote A compressed [[Quote]] array that is reverted back into an object.
 * @throws [[ERROR_DECOMPRESSION_ARRAY]] when quote is not an Array and its length does not equal the defined length of 6.
 * @returns An object that has the same properties as an [[Quote]].
 */
export function decompressQuote(quote: CompressedQuote): IQuote {
  if (!Array.isArray(quote) || quote.length !== 6) {
    throw new SDKErrors.ERROR_DECOMPRESSION_ARRAY()
  }
  return {
    attesterDid: quote[0],
    cTypeHash: quote[1],
    cost: decompressCost(quote[2]),
    currency: quote[3],
    termsAndConditions: quote[4],
    timeframe: quote[5],
  }
}

function compressSignature(comp: DidSignature): [string, DidPublicKey['uri']] {
  return [comp.signature, comp.keyUri]
}

function decompressSignature(
  comp: [string, DidPublicKey['uri']]
): DidSignature {
  return { signature: comp[0], keyUri: comp[1] }
}

/**
 * Compresses an attester signed [[Quote]] for storage and/or messaging.
 *
 * @param attesterSignedQuote An attester signed [[Quote]] object that will be sorted and stripped for messaging or storage.
 * @throws [[ERROR_COMPRESS_OBJECT]] when attesterSignedQuote is missing any property defined in [[IQuoteAttesterSigned]].
 *
 * @returns An ordered array of an attester signed [[Quote]].
 */
export function compressAttesterSignedQuote(
  attesterSignedQuote: IQuoteAttesterSigned
): CompressedQuoteAttesterSigned {
  const {
    attesterDid,
    cTypeHash,
    cost,
    currency,
    termsAndConditions,
    timeframe,
    attesterSignature,
  } = attesterSignedQuote
  if (
    !attesterDid ||
    !cTypeHash ||
    !cost ||
    !currency ||
    !termsAndConditions ||
    !timeframe ||
    !attesterSignature.signature ||
    !attesterSignature.keyUri
  ) {
    throw new SDKErrors.ERROR_COMPRESS_OBJECT(
      attesterSignedQuote,
      'Attester Signed Quote'
    )
  }
  return [
    attesterDid,
    cTypeHash,
    compressCost(cost),
    currency,
    termsAndConditions,
    timeframe,
    compressSignature(attesterSignature),
  ]
}

/**
 * Decompresses an attester signed [[Quote]] from storage and/or message.
 *
 * @param attesterSignedQuote A compressed attester signed [[Quote]] array that is reverted back into an object.
 * @throws [[ERROR_DECOMPRESSION_ARRAY]] when attesterSignedQuote is not an Array and its length does not equal the defined length of 7.
 *
 * @returns An object that has the same properties as an attester signed [[Quote]].
 */
export function decompressAttesterSignedQuote(
  attesterSignedQuote: CompressedQuoteAttesterSigned
): IQuoteAttesterSigned {
  if (!Array.isArray(attesterSignedQuote) || attesterSignedQuote.length !== 7) {
    throw new SDKErrors.ERROR_DECOMPRESSION_ARRAY()
  }
  return {
    attesterDid: attesterSignedQuote[0],
    cTypeHash: attesterSignedQuote[1],
    cost: decompressCost(attesterSignedQuote[2]),
    currency: attesterSignedQuote[3],
    termsAndConditions: attesterSignedQuote[4],
    timeframe: attesterSignedQuote[5],
    attesterSignature: decompressSignature(attesterSignedQuote[6]),
  }
}

/**
 * Compresses a [[Quote]] Agreement for storage and/or messaging.
 *
 * @param quoteAgreement A [[Quote]] Agreement object that will be sorted and stripped for messaging or storage.
 * @throws [[ERROR_COMPRESS_OBJECT]] when quoteAgreement is missing any property defined in [[IQuoteAgreement]].
 *
 * @returns An ordered array of a [[Quote]] Agreement.
 */
export function compressQuoteAgreement(
  quoteAgreement: IQuoteAgreement
): CompressedQuoteAgreed {
  if (
    !quoteAgreement.attesterDid ||
    !quoteAgreement.cTypeHash ||
    !quoteAgreement.cost ||
    !quoteAgreement.currency ||
    !quoteAgreement.termsAndConditions ||
    !quoteAgreement.timeframe ||
    !quoteAgreement.attesterSignature
  ) {
    throw new SDKErrors.ERROR_COMPRESS_OBJECT(quoteAgreement, 'Quote Agreement')
  }
  return [
    quoteAgreement.attesterDid,
    quoteAgreement.cTypeHash,
    compressCost(quoteAgreement.cost),
    quoteAgreement.currency,
    quoteAgreement.termsAndConditions,
    quoteAgreement.timeframe,
    compressSignature(quoteAgreement.attesterSignature),
    compressSignature(quoteAgreement.claimerSignature),
    quoteAgreement.rootHash,
  ]
}

/**
 * Decompresses a [[Quote]] Agreement from storage and/or message.
 *
 * @param quoteAgreement A compressed [[Quote]] Agreement array that is reverted back into an object.
 * @throws [[ERROR_DECOMPRESSION_ARRAY]] when quoteAgreement is not an Array and its length does not equal the defined length of 9.
 *
 * @returns An object that has the same properties as a [[Quote]] Agreement.
 */
export function decompressQuoteAgreement(
  quoteAgreement: CompressedQuoteAgreed
): IQuoteAgreement {
  if (!Array.isArray(quoteAgreement) || quoteAgreement.length !== 9) {
    throw new SDKErrors.ERROR_DECOMPRESSION_ARRAY()
  }
  return {
    attesterDid: quoteAgreement[0],
    cTypeHash: quoteAgreement[1],
    cost: decompressCost(quoteAgreement[2]),
    currency: quoteAgreement[3],
    termsAndConditions: quoteAgreement[4],
    timeframe: quoteAgreement[5],
    attesterSignature: decompressSignature(quoteAgreement[6]),
    claimerSignature: decompressSignature(quoteAgreement[7]),
    rootHash: quoteAgreement[8],
  }
}
