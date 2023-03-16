/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import {
  DidResourceUri,
  DidUri,
  VerificationKeyType,
} from '@kiltprotocol/types'
import { toString, fromString } from 'uint8arrays'
import { stringToU8a, u8aToString } from '@polkadot/util'
import { VerifierFunction, verifyDidSignature } from '@kiltprotocol/did'
import {
  signSync as secp256k1Sign,
  verify as secp256k1Verify,
} from '@noble/secp256k1'
import { ed25519Sign, ed25519Verify, sha256AsU8a } from '@polkadot/util-crypto'
import { AnyJson } from '@polkadot/types/types/codec.js'
import {
  W3C_CREDENTIAL_CONTEXT_URL,
  W3C_PRESENTATION_TYPE,
} from './constants.js'
import type { VerifiableCredential, VerifiablePresentation } from './types.js'

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
 * Creates a Verifiable Presentation from a KILT Verifiable Credential and allows removing properties while doing so.
 * Does not currently sign the presentation or allow adding a challenge to be signed.
 *
 * @param VCs One or more KILT Verifiable Credential as exported with the SDK utils.
 * @param holder The holder of the credentials in the presentation, which also signs the presentation.
 * @returns A Verifiable Presentation containing the original VC with its proofs, but not extra signatures.
 */
export function create(
  VCs: Array<
    VerifiableCredential & Required<Pick<VerifiableCredential, 'proof'>>
  >,
  holder: DidUri
): VerifiablePresentation {
  const verifiableCredential = VCs.length === 1 ? VCs[0] : VCs
  const presentation: VerifiablePresentation = {
    '@context': [W3C_CREDENTIAL_CONTEXT_URL],
    type: [W3C_PRESENTATION_TYPE],
    verifiableCredential,
    holder,
  }
  assertHolderCanPresentCredentials(presentation)
  return presentation
}

function encodeBase64url(bytes: Uint8Array): string {
  return toString(bytes, 'base64url')
}

function decodeBase64url(encoded: string): Uint8Array {
  return fromString(encoded, 'base64url')
}

type supportedKeys = 'ed25519' | 'ecdsa'

const signers: Record<
  supportedKeys,
  (data: Uint8Array, secretKey: Uint8Array) => Uint8Array
> = {
  ecdsa: (data, secretKey) =>
    secp256k1Sign(sha256AsU8a(data), secretKey, {
      recovered: false,
      canonical: true,
      der: false,
    }),
  ed25519: (data, secretKey) => ed25519Sign(data, { secretKey }, true),
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
 * @param options.validFrom Timestamp (in ms since the epoch) indicating the earliest point in time where the presentation becomes valid. Defaults to the current time.
 * @param options.expiresIn Duration of validity of the presentation in ms. If omitted, the presentation's validity is unlimited.
 * @param options.challenge Optional challenge provided by a verifier that can be used to prevent replay attacks.
 * @param options.audience Identifier of the verifier to prevent unintended re-use of the presentation.
 * @returns A signed JWT in compact representation containing a VerifiablePresentation.
 */
export function signJwt(
  presentation: VerifiablePresentation,
  signingKey: {
    secretKey: Uint8Array
    keyUri: DidResourceUri
    type: supportedKeys
  },
  {
    validFrom = Date.now(),
    expiresIn,
    challenge,
    audience,
  }: {
    validFrom?: number
    expiresIn?: number
    challenge?: string
    audience?: string
  } = {}
): string {
  const { holder, id, ...vp } = presentation
  const nbf = validFrom / 1000
  const exp = typeof expiresIn === 'number' ? nbf + expiresIn / 1000 : undefined
  const jwtClaims = JSON.stringify({
    jti: id,
    iss: holder,
    vp,
    nbf,
    exp,
    aud: audience,
    nonce: challenge,
  })

  const { type, keyUri, secretKey } = signingKey
  const alg = { ecdsa: 'ES256K', ed25519: 'EdDSA' }[type]
  if (!alg)
    throw new Error(`no signature algorithm available for key type ${type}`)
  const jwtHeader = JSON.stringify({
    alg,
    kid: keyUri,
    type: 'JWT',
  })

  const signData = `${encodeBase64url(
    stringToU8a(jwtHeader)
  )}.${encodeBase64url(stringToU8a(jwtClaims))}`

  const signature = encodeBase64url(
    signers[type](stringToU8a(signData), secretKey)
  )

  return `${signData}.${signature}`
}

const verifiers: Record<VerificationKeyType, VerifierFunction> = {
  ecdsa: (message, signature, publicKey) =>
    secp256k1Verify(signature, sha256AsU8a(message), publicKey),
  ed25519: ed25519Verify,
  sr25519: () => {
    throw new Error('not implemented')
  },
}

/**
 * Verifies a JWT rendering of a VerifiablePresentation.
 *
 * @param jwt The JWT in compact (string) encoding.
 * @param options Optional configuration.
 * @param options.audience Expected audience. Verification fails if the aud claim in the JWT is not equal to this value.
 * @param options.challenge Expected challenge. Verification fails if the nonce claim in the JWT is not equal to this value.
 * @returns The VerifiablePresentation (without proof), the decoded JWT payload containing all claims, and the decoded JWT header.
 */
export async function verifyJwt(
  jwt: string,
  { audience, challenge }: { audience?: string; challenge?: string }
): Promise<{
  presentation: VerifiablePresentation
  payload: Record<string, AnyJson>
  header: Record<string, AnyJson>
}> {
  const parts = jwt.match(
    /^([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)$/
  )
  if (!parts) throw new Error('not a valid JWT')
  const message = `${parts[1]}.${parts[2]}`
  const signature = decodeBase64url(parts[3])
  const header = JSON.parse(u8aToString(decodeBase64url(parts[1])))
  const payload = JSON.parse(u8aToString(decodeBase64url(parts[2])))
  await verifyDidSignature({
    message,
    signature,
    keyUri: header.kid,
    expectedSigner: payload.iss,
    verifiers,
  })
  if (audience && payload.aud !== audience)
    throw new Error('expected audience not matching presentation')
  if (challenge && payload.nonce !== challenge)
    throw new Error('expected challenge not matching presentation')
  const now = Date.now() / 1000
  if (typeof payload.nbf === 'number' && payload.nbf > now)
    throw new Error('Time of validity is in the future')
  if (typeof payload.exp === 'number' && payload.exp < now)
    throw new Error('Time of validity is in the past')
  const presentation: VerifiablePresentation = {
    ...payload.vp,
    holder: payload.iss,
    ...(typeof payload.jti === 'string' && { id: payload.jti }),
  }
  assertHolderCanPresentCredentials(presentation)
  return {
    presentation,
    payload,
    header,
  }
}
