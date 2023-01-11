/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { DidResourceUri, DidUri, KeyringPair } from '@kiltprotocol/types'
import { toString, fromString } from 'uint8arrays'
import { stringToU8a, u8aToString } from '@polkadot/util'
import { verifyDidSignature } from '@kiltprotocol/did'
import {
  W3C_CREDENTIAL_CONTEXT_URL,
  W3C_PRESENTATION_TYPE,
} from './constants.js'
import type { VerifiableCredential, VerifiablePresentation } from './types.js'

/**
 * Checks that an identity can act as a legitimate holder of a set of credentials and thus include them in a presentation they sign.
 * Credentials where `nonTransferable === true` and `credentialSubject.id !== holder` are disallowed and will cause this to fail.
 *
 * @param holder A DID.
 * @param credentials An array of credentials.
 */
export function assertHolderCanPresentCredentials(
  holder: DidUri,
  credentials: VerifiableCredential[]
) {
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
export function makePresentation(
  VCs: Array<
    VerifiableCredential & Required<Pick<VerifiableCredential, 'proof'>>
  >,
  holder: DidUri
): VerifiablePresentation {
  assertHolderCanPresentCredentials(holder, VCs)
  const verifiableCredential = VCs.length === 1 ? VCs[0] : VCs
  return {
    '@context': [W3C_CREDENTIAL_CONTEXT_URL],
    type: [W3C_PRESENTATION_TYPE],
    verifiableCredential,
    holder,
  }
}

function encodeBase64url(bytes: Uint8Array): string {
  return toString(bytes, 'base64url')
}

function decodeBase64url(encoded: string): Uint8Array {
  return fromString(encoded, 'base64url')
}

export function signPresentationJWT(
  signingKey: KeyringPair,
  signingKeyUri: DidResourceUri,
  presentation: VerifiablePresentation,
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

  const alg = {
    ecdsa: 'ES256K',
    ed25519: 'EdDSA',
    sr25519: 'EdDSA',
    ethereum: 'ES256K',
  }[signingKey.type]
  const jwtHeader = JSON.stringify({
    alg,
    kid: signingKeyUri,
    type: 'JWT',
  })

  const signData = `${encodeBase64url(
    stringToU8a(jwtHeader)
  )}.${encodeBase64url(stringToU8a(jwtClaims))}`

  const signature = encodeBase64url(signingKey.sign(stringToU8a(signData)))

  return `${signData}.${signature}`
}

export async function verifyJwtPresentation(
  jwt: string,
  { audience, challenge }: { audience?: string; challenge?: string }
) {
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
  const credentials = Array.isArray(presentation.verifiableCredential)
    ? presentation.verifiableCredential
    : [presentation.verifiableCredential]
  assertHolderCanPresentCredentials(presentation.holder, credentials)
  return {
    presentation,
    payload,
    header,
  }
}
