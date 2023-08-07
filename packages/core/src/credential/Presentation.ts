/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { DidUri, SignCallback } from '@kiltprotocol/types'
import { JsonSchema, SDKErrors } from '@kiltprotocol/utils'

import {
  W3C_CREDENTIAL_CONTEXT_URL,
  W3C_CREDENTIAL_TYPE,
  W3C_PRESENTATION_TYPE,
} from './constants.js'
import type {
  VerifiableCredential,
  VerifiablePresentation,
  KiltCredentialV1,
} from './types.js'
import {
  VerifiedCredential,
  VerifyOptions,
  removeClaimProperties,
  verifyCredential,
} from './Credential.js'

export const presentationSchema: JsonSchema.Schema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    '@context': { $ref: '#/definitions/contexts' },
    type: {
      oneOf: [
        {
          type: 'array',
          uniqueItems: true,
          items: { type: 'string' },
          contains: { const: W3C_PRESENTATION_TYPE },
        },
        {
          const: W3C_PRESENTATION_TYPE,
        },
      ],
    },
    id: {
      type: 'string',
      format: 'uri',
    },
    verifiableCredential: {
      oneOf: [
        { $ref: '#/definitions/verifiableCredential' },
        {
          type: 'array',
          items: { $ref: '#/definitions/verifiableCredential' },
          minLength: 1,
        },
      ],
    },
    holder: {
      type: 'string',
      format: 'uri',
    },
    proof: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
        },
      },
      required: ['type'],
    },
  },
  required: ['@context', 'type', 'verifiableCredential', 'holder'],
  definitions: {
    verifiableCredential: {
      type: 'object',
      // only checking the minimal definition of a VC: a type field and potentially a context.
      properties: {
        '@context': { $ref: '#/definitions/contexts' },
        type: {
          oneOf: [
            {
              type: 'array',
              uniqueItems: true,
              items: { type: 'string' },
              contains: { const: W3C_CREDENTIAL_TYPE },
            },
            {
              const: W3C_CREDENTIAL_TYPE,
            },
          ],
        },
      },
      required: ['type'],
    },
    contexts: {
      oneOf: [
        {
          type: 'array',
          uniqueItem: true,
          items: [{ const: W3C_CREDENTIAL_CONTEXT_URL }],
          additionalItems: { type: 'string', format: 'uri' },
        },
        { const: W3C_CREDENTIAL_CONTEXT_URL },
      ],
    },
  },
}

// draft version '7' should align with $schema property of the schema above
const schemaValidator = new JsonSchema.Validator(presentationSchema, '7')

/**
 * Validates an object against the VerifiablePresentation data model.
 * Throws if object violates the [[presentationSchema]].
 *
 * @param presentation VerifiablePresentation or object to be validated.
 */
export function validateStructure(presentation: VerifiablePresentation): void {
  const { errors, valid } = schemaValidator.validate(presentation)
  if (!valid) {
    throw new SDKErrors.PresentationMalformedError(
      `Object not matching VerifiablePresentation data model`,
      {
        cause: errors,
      }
    )
  }
}

/**
 * Checks that an identity can act as a legitimate holder of a set of credentials and thus include them in a presentation they sign.
 * Credentials where `nonTransferable === true` and `credentialSubject.id !== holder` are disallowed and will cause this to fail.
 *
 * @param presentation A Verifiable Presentation.
 * @param presentation.holder The presentation holder's identifier.
 * @param presentation.verifiableCredential A VC or an array of VCs.
 */
export function assertHolderCanPresentCredentials({
  holder,
  verifiableCredential,
}: {
  holder: DidUri
  verifiableCredential: VerifiableCredential[] | VerifiableCredential
}): void {
  const credentials = Array.isArray(verifiableCredential)
    ? verifiableCredential
    : [verifiableCredential]
  credentials.forEach(({ nonTransferable, credentialSubject, id }) => {
    if (nonTransferable && credentialSubject.id !== holder)
      throw new Error(
        `The credential with id ${id} is non-transferable and cannot be presented by the identity ${holder}`
      )
  })
}

/**
 * Creates a Verifiable Presentation from one or more Verifiable Credentials.
 * This should be signed before sending to a verifier to provide authentication.
 *
 * @param VCs One or more Verifiable Credentials.
 * @param holder The holder of the credentials in the presentation, which also signs the presentation.
 * @param verificationOptions Options to restrict the validity of a presentation to a specific audience or time frame.
 * @param verificationOptions.verifier Identifier of the verifier to prevent unintended re-use of the presentation.
 * @param verificationOptions.validFrom A Date or date-time string indicating the earliest point in time where the presentation becomes valid.
 * Represented as `issuanceDate` on the presentation.
 * @param verificationOptions.validUntil A Date or date-time string indicating when the presentation is no longer valid.
 * Represented as `expirationDate` on the presentation.
 * @returns An (unsigned) Verifiable Presentation containing the original VCs with its proofs.
 */
export function create(
  VCs: VerifiableCredential[],
  holder: DidUri,
  {
    validFrom,
    validUntil,
    verifier,
  }: {
    verifier?: string
    validFrom?: Date | string
    validUntil?: Date | string
  } = {}
): VerifiablePresentation {
  const verifiableCredential = VCs.length === 1 ? VCs[0] : VCs
  const presentation: VerifiablePresentation = {
    '@context': [W3C_CREDENTIAL_CONTEXT_URL],
    type: [W3C_PRESENTATION_TYPE],
    verifiableCredential,
    holder,
  }
  if (typeof validFrom !== 'undefined') {
    presentation.issuanceDate = new Date(validFrom).toISOString()
  }
  if (typeof validUntil !== 'undefined') {
    presentation.expirationDate = new Date(validUntil).toISOString()
  }
  if (typeof verifier === 'string') {
    presentation.verifier = verifier
  }

  validateStructure(presentation)
  assertHolderCanPresentCredentials(presentation)
  return presentation
}

/**
 * Type Guard to determine input being of type [[ICredentialPresentation]].
 *
 * @param input - An [[ICredential]], [[ICredentialPresentation]], or other object.
 *
 * @returns  Boolean whether input is of type ICredentialPresentation.
 */
export function isPresentation(
  input: unknown
): input is VerifiablePresentation {
  return schemaValidator.validate(input).valid
}

/**
 * Performs all steps to verify a credential presentation (signed).
 * In addition to verifying data structure, data integrity, and looking up the attestation record on the KILT blockchain,
 * this involves verifying the claimer's signature over the credential.
 *
 * This is the function verifiers would typically call upon receiving a credential presentation from a third party.
 * The attester's identity and the credential revocation status returned by this function would then be either displayed to an end user
 * or processed in application logic deciding whether to accept or reject a credential submission
 * (e.g., by matching the attester DID against an allow-list of trusted attesters).
 *
 * @param presentation - The object to check.
 * @param options - Additional parameter for more verification steps.
 * @param options.ctype - CType which the included claim should be checked against.
 * @param options.challenge -  The expected value of the challenge. Verification will fail in case of a mismatch.
 * @param options.didResolveKey - The function used to resolve the claimer's key. Defaults to [[resolveKey]].
 * @param options.cTypes
 * @returns A [[VerifiedCredential]] object, which is the orignal credential presentation with two additional properties:
 * a boolean `revoked` status flag and the `attester` DID.
 */
export async function verifyPresentation(
  presentation: VerifiablePresentation,
  { cTypes, challenge }: VerifyOptions = {}
): Promise<VerifiedCredential[]> {
  validateStructure(presentation)
  // TODO: implement verify
  assertHolderCanPresentCredentials(presentation)
  return Promise.all(
    [presentation.verifiableCredential]
      .flat()
      .map((credential) =>
        verifyCredential(credential as KiltCredentialV1, { cTypes })
      )
  )
}

/**
 * Creates a public presentation which can be sent to a verifier.
 * This presentation is signed.
 *
 * @param presentationOptions The additional options to use upon presentation generation.
 * @param presentationOptions.credential The credential to create the presentation for.
 * @param presentationOptions.signCallback The callback to sign the presentation.
 * @param presentationOptions.selectedAttributes All properties of the claim which have been requested by the verifier and therefore must be publicly presented.
 * @param presentationOptions.challenge Challenge which will be part of the presentation signature.
 * If not specified, all attributes are shown. If set to an empty array, we hide all attributes inside the claim for the presentation.
 * @param presentationOptions.verifier
 * @returns A deep copy of the Credential with all but `publicAttributes` removed.
 */
export async function fromCredential({
  credential,
  signCallback,
  selectedAttributes,
  challenge,
  verifier,
}: {
  credential: KiltCredentialV1
  signCallback: SignCallback
  selectedAttributes?: string[]
  challenge?: string
  verifier?: DidUri
}): Promise<VerifiablePresentation> {
  const copyForPresentation = selectedAttributes
    ? removeClaimProperties(credential, selectedAttributes)
    : { ...credential }
  const presentation = create(
    [copyForPresentation],
    copyForPresentation.credentialSubject.id,
    { verifier }
  )
  // TODO: sign

  return presentation
}
