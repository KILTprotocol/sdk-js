/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { u8aToHex } from '@polkadot/util'

import type {
  DidDocument,
  DidKey,
  DidServiceEndpoint,
  DidSignature,
  SignCallback,
} from '@kiltprotocol/types'
import { Crypto } from '@kiltprotocol/utils'

/**
 * Gets all public keys associated with this DID.
 *
 * @param did The DID data.
 * @returns Array of public keys.
 */
export function getKeys(
  did: Partial<DidDocument> & Pick<DidDocument, 'authentication'>
): DidKey[] {
  return [
    ...did.authentication,
    ...(did.assertionMethod || []),
    ...(did.capabilityDelegation || []),
    ...(did.keyAgreement || []),
  ]
}

/**
 * Returns a key with a given id, if associated with this DID.
 *
 * @param did The DID data.
 * @param id Key id (not the full key uri).
 * @returns The respective public key data or undefined.
 */
export function getKey(
  did: Partial<DidDocument> & Pick<DidDocument, 'authentication'>,
  id: DidKey['id']
): DidKey | undefined {
  return getKeys(did).find((key) => key.id === id)
}

/**
 * Returns a service endpoint with a given id, if associated with this DID.
 *
 * @param did The DID data.
 * @param id Endpoint id (not the full endpoint uri).
 * @returns The respective endpoint data or undefined.
 */
export function getEndpoint(
  did: Pick<DidDocument, 'service'>,
  id: DidServiceEndpoint['id']
): DidServiceEndpoint | undefined {
  return did.service?.find((endpoint) => endpoint.id === id)
}

/**
 * Generate a signature over the provided input payload, either as a byte array or as a HEX-encoded string.
 *
 * @param payload The byte array or HEX-encoded payload to sign.
 * @param sign The sign callback to use for the signing operation.
 *
 * @returns The resulting [[DidSignature]].
 */
export async function signPayload(
  payload: Uint8Array | string,
  sign: SignCallback
): Promise<DidSignature> {
  const { data: signature, keyUri } = await sign({
    data: Crypto.coToUInt8(payload),
    keyRelationship: 'authentication',
  })

  return {
    keyUri,
    signature: u8aToHex(signature),
  }
}
