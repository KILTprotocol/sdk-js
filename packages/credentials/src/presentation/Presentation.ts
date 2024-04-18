/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { cryptosuite as eddsaSuite } from '@kiltprotocol/eddsa-jcs-2022'
import { cryptosuite as ecdsaSuite } from '@kiltprotocol/es256k-jcs-2023'
import { cryptosuite as sr25519Suite } from '@kiltprotocol/sr25519-jcs-2023'

import type { CryptoSuite } from '@kiltprotocol/jcs-data-integrity-proofs-common'

import type { Did, DidResolver } from '@kiltprotocol/types'
import { JsonSchema, SDKErrors } from '@kiltprotocol/utils'

import {
  W3C_CREDENTIAL_CONTEXT_URL,
  W3C_CREDENTIAL_TYPE,
  W3C_PRESENTATION_TYPE,
} from '../V1/constants.js'
import type {
  VerifiableCredential,
  VerifiablePresentation,
} from '../V1/types.js'
import { VerifyPresentationResult } from '../interfaces.js'
import * as DataIntegrity from '../proofs/DataIntegrity.js'
import { appendErrors, getProof, toError } from '../proofs/utils.js'

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
 * Throws if object violates the {@link presentationSchema}.
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
  holder: Did
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
 *
 * @param args Object holding all function arguments.
 * @param args.credentials Array of one or more Verifiable Credentials.
 * @param args.holder The DID or DID Document of the holder of the credentials in the presentation, which also signs the presentation.
 * @param args.validFrom A Date or date-time string indicating the earliest point in time where the presentation becomes valid.
 * Represented as `issuanceDate` on the presentation.
 * @param args.validUntil A Date or date-time string indicating when the presentation is no longer valid.
 * Represented as `expirationDate` on the presentation.
 * @param args.verifier Identifier (e.g., DID) of the verifier to prevent unauthorized re-use of the presentation.
 * @returns An unsigned Verifiable Presentation containing the original VCs.
 */
export async function create({
  credentials,
  holder,
  verifier,
  validFrom,
  validUntil,
}: {
  credentials: VerifiableCredential[]
  holder: Did
  verifier?: string
  validFrom?: Date | string
  validUntil?: Date | string
}): Promise<VerifiablePresentation> {
  const verifiableCredential =
    credentials.length === 1 ? credentials[0] : credentials
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
 * Verifies the proofs on a Verifiable Presentation. Does not verify the credentials contained within.
 *
 * @param presentation - The Verifiable Presentation to be verified.
 * @param options - Verification options.
 * @param options.now - The reference time for verification as Date (default is current time).
 * @param options.challenge - The expected challenge value for the presentation, if any.
 * @param options.domain - Expected domain for the proof. Verification fails if mismatched.
 * @param options.cryptosuites - Array of cryptographic suites to use during verification (default includes suites for `sr25519-jcs-2023`, `eddsa-jcs-2022`, and `es256k-jcs-2023`).
 * @param options.verifier - The expected verifier for the presentation, if any.
 * @param options.tolerance - The allowed time drift in milliseconds for time-sensitive checks (default is 0).
 * @param options.didResolver - An alterative DID resolver to resolve the holder DID (defaults to {@link resolve}).
 * @param options.proofPurpose - Controls which value is expected for the proof's `proofPurpose` property.
 * If specified, verification fails if the proof is issued for a different purpose.
 * @returns An object representing the verification results of the presentation proofs.
 */
export async function verifyPresentationProof(
  presentation: VerifiablePresentation,
  {
    now = new Date(),
    tolerance = 0,
    challenge,
    verifier,
    domain,
    cryptosuites = [eddsaSuite, ecdsaSuite, sr25519Suite],
    didResolver,
    proofPurpose,
  }: {
    now?: Date
    tolerance?: number
    cryptosuites?: Array<CryptoSuite<any>>
    challenge?: string
    domain?: string
    verifier?: string | undefined
    didResolver?: DidResolver['resolve']
    proofPurpose?: string
  }
): Promise<Omit<VerifyPresentationResult, 'credentialResults'>> {
  const result: VerifyPresentationResult = {
    verified: false,
  }
  try {
    validateStructure(presentation)
    if (presentation.verifier && verifier !== presentation.verifier) {
      appendErrors(
        result,
        toError(
          'presentation.verifier is set but does not match the verifier option'
        )
      )
    }
    if (
      presentation.issuanceDate &&
      Date.parse(presentation.issuanceDate) > now.getTime() + tolerance
    ) {
      appendErrors(result, toError('presentation.issuanceDate > now'))
    }
    if (
      presentation.expirationDate &&
      Date.parse(presentation.expirationDate) < now.getTime() - tolerance
    ) {
      appendErrors(result, toError('presentation.expirationDate < now'))
    }

    assertHolderCanPresentCredentials(presentation)

    if (typeof result.error === 'undefined' || result.error.length === 0) {
      const proof = getProof(presentation)
      try {
        const verified = await DataIntegrity.verifyProof(
          presentation,
          proof as DataIntegrity.DataIntegrityProof,
          {
            cryptosuites,
            domain,
            challenge,
            expectedController: presentation.holder,
            tolerance,
            now,
            didResolver,
            expectedProofPurpose: proofPurpose,
          }
        )
        if (verified !== true) {
          throw new SDKErrors.SignatureUnverifiableError()
        }
        result.proofResults = [{ verified, proof }]
      } catch (proofError) {
        const error = toError(proofError)
        result.proofResults = [{ verified: false, error: [error], proof }]
        appendErrors(result, error)
      }

      result.verified = result.proofResults.every(({ verified }) => verified)
    }
    if (result.error?.length === 0) {
      delete result.error
    }
    if (result.error) {
      result.verified = false
    }
  } catch (e) {
    result.verified = false
    appendErrors(result, toError(e))
  }
  return result
}
