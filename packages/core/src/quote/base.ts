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

// TODO: should have a "create quote" function.

/**
 * Signs a [[Quote]] object as an Attester.
 *
 * @param quoteInput A [[Quote]] object.
 * @param attesterIdentity The DID used to sign the object.
 * @param signer Signer callback to interface with the key store managing signing keys.
 * @param options Optional settings.
 * @param options.keySelection Callback that receives all eligible public keys and returns the one to be used for signing.
 * @returns A signed [[Quote]] object.
 */
export async function createAttesterSignedQuote(
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
    throw new SDKErrors.ERROR_QUOTE_MALFORMED()
  }

  const authenticationKey = await keySelection(
    attesterIdentity.getVerificationKeys(KeyRelationship.authentication)
  )
  if (!authenticationKey) {
    throw new SDKErrors.ERROR_DID_ERROR(
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
  const result = await DidUtils.verifyDidSignature({
    signature: attesterSignature,
    message: Crypto.hashObjectAsStr(basicQuote),
    expectedVerificationMethod: KeyRelationship.authentication,
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
 * @param signer Signer callback to interface with the key store managing signing keys.
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
    throw new SDKErrors.ERROR_DID_IDENTIFIER_MISMATCH(
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
    throw new SDKErrors.ERROR_DID_ERROR(
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

// TODO: Should have a `verifyQuoteAgreemment` function