/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { u8aToHex } from '@polkadot/util'

import type {
  DidDetails,
  DidKey,
  DidResourceUri,
  DidServiceEndpoint,
  DidSignature,
  DidVerificationKey,
  SignCallback,
  VerificationKeyType,
} from '@kiltprotocol/types'
import { verificationKeyTypes } from '@kiltprotocol/types'
import { Crypto, SDKErrors } from '@kiltprotocol/utils'

import { getSigningAlgorithmForVerificationKeyType } from '../Did.utils.js'

/**
 * Gets all public keys associated with this Did.
 *
 * @param did The DID data.
 * @returns Array of public keys.
 */
export function getKeys(
  did: Partial<DidDetails> & Pick<DidDetails, 'authentication'>
): DidKey[] {
  return [
    ...did.authentication,
    ...(did.assertionMethod || []),
    ...(did.capabilityDelegation || []),
    ...(did.keyAgreement || []),
  ]
}

/**
 * Returns a key with a given id, if associated with this Did.
 *
 * @param did The DID data.
 * @param id Key id (not the full key uri).
 * @returns The respective public key data or undefined.
 */
export function getKey(
  did: Partial<DidDetails> & Pick<DidDetails, 'authentication'>,
  id: DidKey['id']
): DidKey | undefined {
  return getKeys(did).find((key) => key.id === id)
}

/**
 * Returns a service endpoint with a given id, if associated with this Did.
 *
 * @param did The DID data.
 * @param id Endpoint id (not the full endpoint uri).
 * @returns The respective endpoint data or undefined.
 */
export function getEndpoint(
  did: Pick<DidDetails, 'service'>,
  id: DidServiceEndpoint['id']
): DidServiceEndpoint | undefined {
  return did.service?.find((endpoint) => endpoint.id === id)
}

/**
 * Generate a signature over the provided input payload, either as a byte array or as a HEX-encoded string.
 *
 * @param did The DID data.
 * @param payload The byte array or HEX-encoded payload to sign.
 * @param sign The sign callback to use for the signing operation.
 * @param keyId The key ID to use to generate the signature.
 *
 * @returns The resulting [[DidSignature]].
 */
export async function signPayload(
  did: Partial<DidDetails> & Pick<DidDetails, 'authentication' | 'uri'>,
  payload: Uint8Array | string,
  sign: SignCallback,
  keyId: DidVerificationKey['id']
): Promise<DidSignature> {
  const key = getKey(did, keyId)
  if (!key || !verificationKeyTypes.includes(key.type)) {
    throw new SDKErrors.DidError(
      `Failed to find verification key with ID "${keyId}" on DID "${did.uri}"`
    )
  }
  const alg = getSigningAlgorithmForVerificationKeyType(
    key.type as VerificationKeyType
  )
  const { data: signature } = await sign({
    publicKey: key.publicKey,
    alg,
    data: Crypto.coToUInt8(payload),
  })
  return {
    keyUri: `${did.uri}${key.id}` as DidResourceUri,
    signature: u8aToHex(signature),
  }
}
