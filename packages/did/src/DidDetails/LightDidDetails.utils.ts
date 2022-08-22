/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

// This module is not part of the public-facing api.
/* eslint-disable jsdoc/require-jsdoc */

import { decode as cborDecode, encode as cborEncode } from 'cbor'

import { base58Decode, base58Encode } from '@polkadot/util-crypto'

import type {
  DidServiceEndpoint,
  LightDidSupportedVerificationKeyType,
  NewDidEncryptionKey,
  NewLightDidVerificationKey,
} from '@kiltprotocol/types'
import { encryptionKeyTypes } from '@kiltprotocol/types'

import { SDKErrors } from '@kiltprotocol/utils'

import { checkServiceEndpointSyntax, stripFragment } from '../Did.utils.js'

type LightDidEncoding = '00' | '01'

export const verificationKeyTypeToLightDidEncoding: Record<
  LightDidSupportedVerificationKeyType,
  LightDidEncoding
> = {
  sr25519: '00',
  ed25519: '01',
}

export const lightDidEncodingToVerificationKeyType: Record<
  LightDidEncoding,
  LightDidSupportedVerificationKeyType
> = {
  '00': 'sr25519',
  '01': 'ed25519',
}

/**
 * The options that can be used to create a light DID.
 */
export type CreateDetailsInput = {
  /**
   * The DID authentication key. This is mandatory and will be used as the first authentication key
   * of the full DID upon migration.
   */
  authentication: [NewLightDidVerificationKey]
  /**
   * The optional DID encryption key. If present, it will be used as the first key agreement key
   * of the full DID upon migration.
   */
  keyAgreement?: [NewDidEncryptionKey]
  /**
   * The set of service endpoints associated with this DID. Each service endpoint ID must be unique.
   * The service ID must not contain the DID prefix when used to create a new DID.
   */
  service?: DidServiceEndpoint[]
}

export function validateCreateDetailsInput(details: CreateDetailsInput): void {
  // Check authentication key type
  const authenticationKeyTypeEncoding =
    verificationKeyTypeToLightDidEncoding[details.authentication[0].type]

  if (!authenticationKeyTypeEncoding) {
    throw new SDKErrors.UnsupportedKeyError(details.authentication[0].type)
  }

  if (
    details.keyAgreement?.[0].type &&
    !encryptionKeyTypes.includes(details.keyAgreement[0].type)
  ) {
    throw new SDKErrors.DidError(
      `Encryption key type "${details.keyAgreement[0].type}" is not supported`
    )
  }

  // Check service endpoints
  if (!details.service) {
    return
  }

  // Checks that for all service IDs have regular strings as their ID and not a full DID.
  // Plus, we forbid a service ID to be `authentication` or `encryption` as that would create confusion
  // when upgrading to a full DID.
  details.service?.forEach((service) => {
    // A service ID cannot have a reserved ID that is used for key IDs.
    if (service.id === '#authentication' || service.id === '#encryption') {
      throw new SDKErrors.DidError(
        `Cannot specify a service ID with the name "${service.id}" as it is a reserved keyword`
      )
    }
    const [, errors] = checkServiceEndpointSyntax(service)
    if (errors && errors.length > 0) {
      throw errors[0]
    }
  })
}

const KEY_AGREEMENT_MAP_KEY = 'e'
const SERVICES_MAP_KEY = 's'

interface SerializableStructure {
  [KEY_AGREEMENT_MAP_KEY]?: NewDidEncryptionKey
  [SERVICES_MAP_KEY]?: Array<Omit<DidServiceEndpoint, 'id'> & { id: string }>
}

/**
 * Serialize the optional encryption key of an off-chain DID using the CBOR serialization algorithm
 * and encoding the result in Base58 format with a multibase prefix.
 *
 * @param details The light DID details to encode.
 * @param details.keyAgreement The DID encryption key.
 * @param details.service The DID service endpoints.
 * @returns The Base58-encoded and CBOR-serialized off-chain DID optional details.
 */
export function serializeAndEncodeAdditionalLightDidDetails({
  keyAgreement,
  service,
}: Pick<CreateDetailsInput, 'keyAgreement' | 'service'>): string | undefined {
  const objectToSerialize: SerializableStructure = {}
  if (keyAgreement) {
    const key = keyAgreement[0]
    objectToSerialize[KEY_AGREEMENT_MAP_KEY] = key
  }
  if (service && service.length > 0) {
    objectToSerialize[SERVICES_MAP_KEY] = service.map(({ id, ...rest }) => ({
      id: stripFragment(id),
      ...rest,
    }))
  }

  if (Object.keys(objectToSerialize).length === 0) {
    return undefined
  }

  const serializationVersion = 0x0
  const serialized = cborEncode(objectToSerialize)
  return base58Encode([serializationVersion, ...serialized], true)
}

export function decodeAndDeserializeAdditionalLightDidDetails(
  rawInput: string,
  version = 1
): Pick<CreateDetailsInput, 'keyAgreement' | 'service'> {
  if (version !== 1) {
    throw new SDKErrors.DidError('Serialization version not supported')
  }

  const decoded = base58Decode(rawInput, true)
  const serializationVersion = decoded[0]
  const serialized = decoded.slice(1)

  if (serializationVersion !== 0x0) {
    throw new SDKErrors.DidError('Serialization algorithm not supported')
  }
  const deserialized: SerializableStructure = cborDecode(serialized)

  const keyAgreement = deserialized[KEY_AGREEMENT_MAP_KEY]
  return {
    keyAgreement: keyAgreement && [keyAgreement],
    service: deserialized[SERVICES_MAP_KEY]?.map(({ id, ...rest }) => ({
      id: `#${id}`,
      ...rest,
    })),
  }
}
