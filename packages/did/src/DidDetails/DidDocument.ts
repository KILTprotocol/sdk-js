/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type {
  DidDocument,
  DidVerificationMethod,
  DidService,
  RelativeDidUrl,
} from '@kiltprotocol/types'

/**
 * Gets all public keys associated with this DID.
 *
 * @param document The DID document.
 * @returns Array of verification methods.
 */
export function getKeys(document: DidDocument): DidVerificationMethod[] {
  return document.verificationMethod || []
}

/**
 * Returns a key with a given id, if associated with this DID.
 *
 * @param document The DID document.
 * @param id Verification relative URL.
 * @returns The respective public key data or undefined.
 */
export function getKey(
  document: DidDocument,
  id: RelativeDidUrl
): DidVerificationMethod | undefined {
  return getKeys(document).find((key) => key.id === `${document.id}${id}`)
}

/**
 * Returns a service endpoint with a given id, if associated with this DID.
 *
 * @param document The DID document.
 * @param id Service relative URL.
 * @returns The respective endpoint data or undefined.
 */
export function getService(
  document: Pick<DidDocument, 'id' | 'service'>,
  id: RelativeDidUrl
): DidService | undefined {
  return document.service?.find(
    (endpoint) => endpoint.id === `${document.id}${id}`
  )
}
