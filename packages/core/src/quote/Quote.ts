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

import type {
  IDidDetails,
  IQuote,
  IDidResolver,
  IQuoteAgreement,
  IQuoteAttesterSigned,
  KeystoreSigner,
  DidVerificationKey,
  IRequestForAttestation,
} from '@kiltprotocol/types'
import { KeyRelationship } from '@kiltprotocol/types'
import { Crypto, SDKErrors, JsonSchema } from '@kiltprotocol/utils'
import {
  Utils as DidUtils,
  DidResolver,
  DidDetails,
  DidKeySelectionCallback,
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

/**
 * Builds a [[Quote]] object, from a simple object with the same properties.
 *
 * @param deserializedQuote The object which is used to create the attester signed [[Quote]] object.
 * @throws [[ERROR_QUOTE_MALFORMED]] when the derived basicQuote can not be validated with the QuoteSchema.
 *
 * @returns A [[Quote]] object signed by an Attester.
 */

export async function fromAttesterSignedInput(
  deserializedQuote: IQuoteAttesterSigned,
  {
    resolver = DidResolver,
  }: {
    resolver?: IDidResolver
  } = {}
): Promise<IQuoteAttesterSigned> {
  const { attesterSignature, ...basicQuote } = deserializedQuote
  await DidUtils.verifyDidSignature({
    signature: attesterSignature,
    message: Crypto.hashObjectAsStr(basicQuote),
    expectedVerificationMethod: KeyRelationship.authentication,
    resolver,
  })
  const messages: string[] = []
  if (!validateQuoteSchema(QuoteSchema, basicQuote, messages)) {
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
  attesterIdentity: DidDetails,
  signer: KeystoreSigner,
  {
    keySelection = DidUtils.defaultKeySelectionCallback,
  }: {
    keySelection?: DidKeySelectionCallback<DidVerificationKey>
  } = {}
): Promise<IQuoteAttesterSigned> {
  const authenticationKey = await keySelection(
    attesterIdentity.getVerificationKeys(KeyRelationship.authentication)
  )
  if (!authenticationKey) {
    throw SDKErrors.ERROR_DID_ERROR(
      `The attester ${attesterIdentity.uri} does not have a valid authentication key.`
    )
  }
  const signature = await attesterIdentity.signPayload(
    Crypto.hashObjectAsStr(quoteInput),
    signer,
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
  attesterIdentity: DidDetails,
  signer: KeystoreSigner,
  {
    keySelection = DidUtils.defaultKeySelectionCallback,
  }: {
    keySelection?: DidKeySelectionCallback<DidVerificationKey>
  } = {}
): Promise<IQuoteAttesterSigned> {
  if (!validateQuoteSchema(QuoteSchema, quoteInput)) {
    throw SDKErrors.ERROR_QUOTE_MALFORMED()
  }
  return createAttesterSignature(quoteInput, attesterIdentity, signer, {
    keySelection,
  })
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
  requestRootHash: IRequestForAttestation['rootHash'],
  attesterIdentity: IDidDetails['uri'],
  claimerIdentity: DidDetails,
  signer: KeystoreSigner,
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
    throw SDKErrors.ERROR_DID_IDENTIFIER_MISMATCH(
      attesterIdentity,
      attesterSignedQuote.attesterDid
    )

  await DidUtils.verifyDidSignature({
    signature: attesterSignature,
    message: Crypto.hashObjectAsStr(basicQuote),
    expectedVerificationMethod: KeyRelationship.authentication,
    resolver,
  })

  const claimerAuthenticationKey = await keySelection(
    claimerIdentity.getVerificationKeys(KeyRelationship.authentication)
  )
  if (!claimerAuthenticationKey) {
    throw SDKErrors.ERROR_DID_ERROR(
      `Claimer DID ${claimerIdentity.uri} does not have an authentication key.`
    )
  }

  const signature = await claimerIdentity.signPayload(
    Crypto.hashObjectAsStr(attesterSignedQuote),
    signer,
    claimerAuthenticationKey.id
  )

  return {
    ...attesterSignedQuote,
    rootHash: requestRootHash,
    claimerSignature: signature,
  }
}
