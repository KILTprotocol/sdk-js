/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { encode as cborEncode, decode as cborDecode } from 'cbor'
import type { LightDidDetailsCreationOpts } from './LightDidDetails'

const ENCRYPTION_KEY_MAP_KEY = 'encryptionKey'
const SERVICES_MAP_KEY = 'services'

/**
 * Serialize the optional encryption key and service endpoints of an off-chain DID using the CBOR serialization algorithm and encoding the result in Base64 format.
 *
 * @param root0
 * @param root0.encryptionKey
 * @param root0.services
 * @returns The Base64-encoded and CBOR-serialized off-chain DID optional details.
 */
export function serializeAndEncodeAdditionalLightDidDetails({
  encryptionKey,
  services,
}: Pick<LightDidDetailsCreationOpts, 'encryptionKey' | 'services'>):
  | string
  | null {
  const objectToSerialize: Map<string, any> = new Map()
  if (encryptionKey) {
    objectToSerialize.set(ENCRYPTION_KEY_MAP_KEY, encryptionKey)
  }
  if (services && services.length) {
    objectToSerialize.set(SERVICES_MAP_KEY, services)
  }

  if (!objectToSerialize.size) {
    return null
  }

  return cborEncode(objectToSerialize).toString('base64')
}

// Version # not used for now
export function decodeAndDeserializeAdditionalLightDidDetails(
  rawInput: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  version = 1
): Pick<LightDidDetailsCreationOpts, 'encryptionKey' | 'services'> {
  const decodedPayload: Map<string, any> = cborDecode(rawInput, {
    encoding: 'base64',
  })

  return {
    encryptionKey: decodedPayload[ENCRYPTION_KEY_MAP_KEY],
    services: decodedPayload[SERVICES_MAP_KEY],
  }
}
