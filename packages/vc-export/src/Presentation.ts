/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { JWTOptions, JWTVerified } from 'did-jwt'

import { JsonSchema } from '@kiltprotocol/utils'
import type { DidResourceUri, DidUri } from '@kiltprotocol/types'

import {
  supportedKeys,
  verify,
  create as createJWT,
  presentationToPayload,
  presentationFromPayload,
} from './DidJwt.js'
import {
  W3C_CREDENTIAL_CONTEXT_URL,
  W3C_CREDENTIAL_TYPE,
  W3C_PRESENTATION_TYPE,
} from './constants.js'
import { PresentationMalformedError } from './errors.js'
import type { VerifiableCredential, VerifiablePresentation } from './types.js'

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
    throw new PresentationMalformedError(
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
 * Signs a presentation in its JWT rendering.
 *
 * @param presentation The VerifiablePresentation (without proof).
 * @param signingKey Key object required for signing.
 * @param signingKey.secretKey The bytes of the secret key.
 * @param signingKey.keyUri The key uri by which the public key can be looked up from a DID document.
 * @param signingKey.type The key type. Ed25519 and ecdsa (secp256k1) are supported.
 * @param options Additional optional configuration.
 * @param options.expiresIn Time in seconds until the presentation expires, based on issuanceDate or alternatively the current system time.
 * If set, this replaces the presentation's current expirationDate.
 * @param options.challenge Optional challenge provided by a verifier that can be used to prevent replay attacks.
 * @returns A signed JWT in compact representation containing a VerifiablePresentation.
 */
export function signAsJwt(
  presentation: VerifiablePresentation,
  signingKey: {
    secretKey: Uint8Array
    keyUri: DidResourceUri
    type: supportedKeys
  },
  options: {
    challenge?: string
  } & Partial<JWTOptions> = {}
): Promise<string> {
  // produce (unencoded) payload where keys on the presentation object are mapped to JWT claims
  const payload = presentationToPayload(presentation)
  // JWS replaces any existing proof
  delete payload.vp.proof
  const { challenge, expiresIn } = options
  // if expiresIn is set, remove exp claim to make sure it is replaced
  if (typeof expiresIn === 'number') {
    delete payload.exp
  }
  // add challenge claim to JWTs
  if (challenge) {
    payload.nonce = challenge
  }
  // encode and add JWS
  return createJWT(payload, signingKey, options)
}

/**
 * Verifies a JWT rendering of a [[VerifiablePresentation]].
 *
 * @param token The JWT in compact (string) encoding.
 * @param options Optional configuration.
 * @param options.verifier Expected audience/verifier. Verification fails if the aud claim in the JWT is not equal to this value.
 * @param options.challenge Expected challenge. Verification fails if the nonce claim in the JWT is not equal to this value.
 * @param options.skewTime Allowed tolerance, in seconds, when verifying time of validity to account for clock skew between two machines. Defaults to 0.
 * @returns An object including the `presentation` (without proof) and the decoded JWT `payload` containing all claims.
 */
export async function verifySignedAsJwt(
  token: string,
  {
    verifier,
    challenge,
    skewTime,
  }: { verifier?: string; challenge?: string; skewTime?: number } = {}
): Promise<
  JWTVerified & {
    presentation: VerifiablePresentation
  }
> {
  const result = await verify(token, {
    proofPurpose: 'authentication',
    audience: verifier,
    skewTime,
  })
  if (challenge && result.payload.nonce !== challenge) {
    throw new Error('expected challenge not matching presentation')
  }
  const presentation = presentationFromPayload(result.payload)
  validateStructure(presentation)
  assertHolderCanPresentCredentials(presentation)
  return {
    presentation,
    ...result,
  }
}
