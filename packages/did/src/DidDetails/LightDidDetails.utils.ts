/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { encode as cborEncode, decode as cborDecode } from 'cbor'
import type { LightDidDetailsCreationOpts } from '../types'

const ENCRYPTION_KEY_MAP_KEY = 'e'
const SERVICES_KEY_MAP_KEY = 's'

/**
 * Serialize the optional encryption key of an off-chain DID using the CBOR serialization algorithm and encoding the result in Base64 format.
 *
 * @param root0
 * @param root0.encryptionKey
 * @returns The Base64-encoded and CBOR-serialized off-chain DID optional details.
 */
export function serializeAndEncodeAdditionalLightDidDetails({
  encryptionKey,
  serviceEndpoints,
}: Pick<LightDidDetailsCreationOpts, 'encryptionKey' | 'serviceEndpoints'>):
  | string
  | null {
  const objectToSerialize: Map<string, unknown> = new Map()
  if (encryptionKey) {
    objectToSerialize.set(ENCRYPTION_KEY_MAP_KEY, encryptionKey)
  }
  if (serviceEndpoints && serviceEndpoints.length) {
    objectToSerialize.set(SERVICES_KEY_MAP_KEY, serviceEndpoints)
  }

  if (!objectToSerialize.size) {
    return null
  }

  return cborEncode(objectToSerialize).toString('base64')
}

export function decodeAndDeserializeAdditionalLightDidDetails(
  rawInput: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  version = 1
): Pick<LightDidDetailsCreationOpts, 'encryptionKey' | 'serviceEndpoints'> {
  const decodedPayload: Map<string, unknown> = cborDecode(rawInput, {
    encoding: 'base64',
  })

  return {
    encryptionKey: decodedPayload[ENCRYPTION_KEY_MAP_KEY],
    serviceEndpoints: decodedPayload[SERVICES_KEY_MAP_KEY],
  }
}
