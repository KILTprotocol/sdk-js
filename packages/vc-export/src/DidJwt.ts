/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import {
  createJWT,
  EdDSASigner,
  ES256KSigner,
  JWTHeader,
  JWTOptions,
  JWTPayload,
  JWTVerifyOptions,
  Signer,
  verifyJWT,
} from 'did-jwt'
import type { DIDResolutionResult, Resolvable } from 'did-resolver'

import { resolveCompliant } from '@kiltprotocol/did'
import { SDKErrors } from '@kiltprotocol/utils'
import type { DidResourceUri, DidUri } from '@kiltprotocol/types'

import type { UnsignedVc, VerifiablePresentation } from './types.js'

function jwtTimestampFromDate(date: string | number | Date): number {
  return Math.floor(new Date(date).getTime() / 1000)
}

function jwtTimestampToIsoDate(date: number): string {
  return new Date(date * 1000).toISOString()
}

export type supportedKeys = 'ed25519' | 'ecdsa'

const signers: Record<JWTHeader['alg'], (secretKey: Uint8Array) => Signer> = {
  ES256K: ES256KSigner,
  EdDSA: EdDSASigner,
}

/**
 * Creates a JWT from a payload object and signs it using a DID key.
 *
 * @param payload The VerifiablePresentation (without proof).
 * @param signingKey Key object required for signing.
 * @param signingKey.secretKey The bytes of the secret key.
 * @param signingKey.keyUri The key uri by which the public key can be looked up from a DID document.
 * @param signingKey.type The key type. Ed25519 and ecdsa (secp256k1) are supported.
 * @param options Additional optional configuration.
 * @param options.validFrom Timestamp (in ms since the epoch) indicating the earliest point in time where the presentation becomes valid. Defaults to the current time.
 * @param options.expiresIn Duration of validity of the presentation in seconds. If omitted, the presentation's validity is unlimited.
 * @param options.challenge Optional challenge provided by a verifier that can be used to prevent replay attacks.
 * @param options.audience Identifier of the verifier to prevent unintended re-use of the presentation.
 * @returns A signed JWT in compact representation containing a VerifiablePresentation.
 */
export function create(
  payload: JWTPayload & { iss: string },
  signingKey: {
    secretKey: Uint8Array
    keyUri: DidResourceUri
    type: supportedKeys
  },
  options: Partial<JWTOptions> = {}
): Promise<string> {
  const { type, keyUri, secretKey } = signingKey
  const alg = { ecdsa: 'ES256K', ed25519: 'EdDSA' }[type]
  if (!alg)
    throw new Error(`no signature algorithm available for key type ${type}`)
  const jwtHeader = {
    alg,
    kid: keyUri,
    type: 'JWT',
  }
  const signer = signers[alg](secretKey)

  return createJWT(
    payload,
    { ...options, issuer: payload.iss, signer },
    jwtHeader
  )
}

const kiltDidResolver: Resolvable = {
  resolve: async (did) => {
    const {
      didDocument = null,
      didDocumentMetadata,
      didResolutionMetadata,
    } = await resolveCompliant(did as DidUri)

    return {
      didDocument,
      didDocumentMetadata,
      didResolutionMetadata,
    } as DIDResolutionResult
  },
}

/**
 * Verifies a JWT rendering of a VerifiablePresentation.
 *
 * @param token The JWT in compact (string) encoding.
 * @param options Optional configuration.
 * @param options.audience Expected audience. Verification fails if the aud claim in the JWT is not equal to this value.
 * @param options.challenge Expected challenge. Verification fails if the nonce claim in the JWT is not equal to this value.
 * @returns The VerifiablePresentation (without proof), the decoded JWT payload containing all claims, and the decoded JWT header.
 */
export async function verify(
  token: string,
  options: Partial<JWTVerifyOptions>
): ReturnType<typeof verifyJWT> {
  // set default skewTime to 0
  const { skewTime = 0 } = options
  const result = await verifyJWT(token, {
    resolver: kiltDidResolver,
    ...options,
    skewTime,
    policies: {
      // by default, do not require iat to be in the past
      iat: false,
      ...options.policies,
      // override aud policy: only check aud if expected audience is defined
      aud: typeof options.audience === 'string',
    },
  })
  if (result.verified !== true) {
    throw new SDKErrors.SignatureUnverifiableError()
  }
  return result
}

function toPayloadCommon(
  iss: string,
  jti: string | undefined,
  issuanceDate: string | undefined,
  expirationDate: string | undefined
): JWTPayload & {
  iss: string
} {
  const result: JWTPayload & {
    iss: string
  } = {
    jti,
    iss,
  }

  if (typeof issuanceDate === 'string') {
    result.nbf = jwtTimestampFromDate(issuanceDate)
  }
  if (typeof expirationDate === 'string') {
    result.exp = jwtTimestampFromDate(expirationDate)
  }

  return result
}

/**
 * Produces a serialized JWT payload from a Verifiable Presentation.
 *
 * @param presentation A [[VerifiablePresentation]] object.
 * @returns The payload, ready for serialization.
 */
export function presentationToPayload(
  presentation: VerifiablePresentation
): JWTPayload & {
  iss: string
} {
  const { holder, id, issuanceDate, expirationDate, verifier, ...vp } =
    presentation
  const payload = toPayloadCommon(holder, id, issuanceDate, expirationDate)

  return {
    ...payload,
    vp,
    aud: verifier,
  }
}

/**
 * Produces a serialized JWT payload from a Verifiable Credential.
 *
 * @param credential A [[VerifiableCredential]] object.
 * @returns The payload, ready for serialization.
 */
export function credentialToPayload(
  credential: UnsignedVc & { expirationDate?: string }
): JWTPayload & {
  iss: string
} {
  const { issuer, id, issuanceDate, expirationDate, ...vc } = credential

  const payload = toPayloadCommon(issuer, id, issuanceDate, expirationDate)

  return {
    ...payload,
    vc,
    sub: credential.credentialSubject?.id,
  }
}

function fromPayloadCommon(
  payload: JWTPayload
): Partial<VerifiablePresentation> {
  const { jti, nbf, exp } = payload
  const decoded: Partial<VerifiablePresentation> = {}
  if (typeof jti === 'string') {
    decoded.id = jti
  }
  if (typeof nbf === 'number') {
    decoded.issuanceDate = jwtTimestampToIsoDate(nbf)
  }
  if (typeof exp === 'number') {
    decoded.expirationDate = jwtTimestampToIsoDate(exp)
  }
  return decoded
}

/**
 * Reconstruct a Verifiable Presentation object from its JWT serialization.
 *
 * @param payload The encoded payload of a JWT, containing a 'vp' claim.
 * @returns A [[VerifiablePresentation]] object.
 */
export function presentationFromPayload(
  payload: JWTPayload
): VerifiablePresentation {
  const { vp, iss, aud } = payload
  if (typeof vp !== 'object' || vp === null) {
    throw new Error('JWT must contain a vp claim')
  }

  const decoded = {
    ...vp,
    ...fromPayloadCommon(payload),
  }

  if (typeof iss === 'string') {
    decoded.holder = iss as DidUri
  }
  if (typeof aud === 'string') {
    decoded.verifier = aud as DidUri
  }

  return decoded as VerifiablePresentation
}

/**
 * Reconstruct a Verifiable Credential object from its JWT serialization.
 *
 * @param payload The encoded payload of a JWT, containing a 'vc' claim.
 * @returns A [[VerifiableCredential]] object.
 */
export function credentialFromPayload(payload: JWTPayload): UnsignedVc {
  const { vc, iss, sub } = payload
  if (typeof vc !== 'object' || vc === null) {
    throw new Error('JWT must contain a vc claim')
  }

  const decoded: UnsignedVc = {
    ...vc,
    ...fromPayloadCommon(payload),
  }

  if (typeof iss === 'string') {
    decoded.issuer = iss as DidUri
  }
  if (typeof sub === 'string') {
    if (typeof decoded.credentialSubject === 'object') {
      decoded.credentialSubject.id = sub as DidUri
    } else {
      decoded.credentialSubject = sub as any
    }
  }

  return decoded
}
