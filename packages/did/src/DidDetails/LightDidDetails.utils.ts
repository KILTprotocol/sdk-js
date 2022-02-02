/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { encode as cborEncode, decode as cborDecode } from 'cbor'

import { base58Decode, base58Encode } from '@polkadot/util-crypto'

import {
  DidServiceEndpoint,
  EncryptionKeyType,
  SubmittableExtrinsic,
  VerificationKeyType,
  NewDidEncryptionKey,
  NewDidVerificationKey,
} from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'

import { parseDidUri } from '../Did.utils.js'

const ENCRYPTION_KEY_MAP_KEY = 'e'
const SERVICES_KEY_MAP_KEY = 's'

// Ecdsa not supported.
export enum LightDidSupportedVerificationKeyTypes {
  Ed25519 = VerificationKeyType.ed25519,
  Sr25519 = VerificationKeyType.sr25519,
}

// Ecdsa not supported.
const EncodingForSigningKeyType: Record<
  LightDidSupportedVerificationKeyTypes,
  string
> = {
  [LightDidSupportedVerificationKeyTypes.Sr25519]: '00',
  [LightDidSupportedVerificationKeyTypes.Ed25519]: '01',
}

const supportedEncryptionKeyTypes = new Set(Object.values(EncryptionKeyType))

export function getEncodingForSigningKeyType(
  keyType: LightDidSupportedVerificationKeyTypes
): string | undefined {
  return EncodingForSigningKeyType[keyType]
}

/**
 * A new public key specified when creating a new light DID.
 *
 * Currently, a light DID does not support the use of an ECDSA key as its authentication key.
 */
export type NewLightDidAuthenticationKey = Omit<
  NewDidVerificationKey,
  'type'
> & {
  type: LightDidSupportedVerificationKeyTypes
}

/**
 * The options that can be used to create a light DID.
 */
export type LightDidCreationDetails = {
  /**
   * The DID authentication key. This is mandatory and will be used as the first authentication key
   * of the full DID upon migration.
   */
  authenticationKey: NewLightDidAuthenticationKey
  /**
   * The optional DID encryption key. If present, it will be used as the first key agreement key
   * of the full DID upon migration.
   */
  encryptionKey?: NewDidEncryptionKey
  /**
   * The set of service endpoints associated with this DID. Each service endpoint ID must be unique.
   * The service ID must not contain the DID prefix when used to create a new DID.
   *
   * @example ```typescript
   * const authenticationKey = exampleKey;
   * const services = [
   *   {
   *     id: 'test-service',
   *     types: ['CredentialExposureService'],
   *     urls: ['http://my_domain.example.org'],
   *   },
   * ];
   * const lightDid = new LightDid({ authenticationKey, services });
   * RequestForAttestation.fromRequest(parsedRequest);
   * ```
   */
  serviceEndpoints?: DidServiceEndpoint[]
}

const SigningKeyTypeFromEncoding: Record<
  string,
  LightDidSupportedVerificationKeyTypes
> = {
  '00': LightDidSupportedVerificationKeyTypes.Sr25519,
  '01': LightDidSupportedVerificationKeyTypes.Ed25519,
}

export type DidMigrationHandler = (
  migrationExtrinsic: SubmittableExtrinsic
) => Promise<void>

export function getSigningKeyTypeFromEncoding(
  encoding: string
): string | undefined {
  return SigningKeyTypeFromEncoding[encoding]?.toString()
}

export function checkLightDidCreationDetails(
  details: LightDidCreationDetails
): void {
  // Check authentication key type
  const authenticationKeyTypeEncoding = getEncodingForSigningKeyType(
    details.authenticationKey.type
  )
  if (!authenticationKeyTypeEncoding) {
    throw SDKErrors.ERROR_UNSUPPORTED_KEY
  }

  if (details.encryptionKey?.type) {
    if (!supportedEncryptionKeyTypes.has(details.encryptionKey.type)) {
      throw SDKErrors.ERROR_DID_ERROR(
        `Encryption key type ${details.encryptionKey.type} is not supported.`
      )
    }
  }

  // Check service endpoints
  if (!details.serviceEndpoints) {
    return
  }

  // Checks that for all service IDs have regular strings as their ID and not a full DID.
  // Plus, we forbid a service ID to be `authentication` or `encryption` as that would create confusion
  // when upgrading to a full DID.
  details.serviceEndpoints?.forEach((service) => {
    let isServiceIdADid = true
    try {
      // parseDidUrl throws if the service ID is not a proper DID URI, which is exactly what we expect here.
      parseDidUri(service.id)
    } catch {
      // Here if parseDidUrl throws -> service.id is NOT a DID.
      isServiceIdADid = false
    }

    if (isServiceIdADid) {
      throw SDKErrors.ERROR_DID_ERROR(
        `Invalid service ID provided: ${service.id}. The service ID should be a simple identifier and not a complete DID URI.`
      )
    }
    // A service ID cannot have a reserved ID that is used for key IDs.
    if (service.id === 'authentication' || service.id === 'encryption') {
      throw SDKErrors.ERROR_DID_ERROR(
        `Cannot specify a service ID with the name ${service.id} as it is a reserved keyword.`
      )
    }
  })
}

/**
 * Serialize the optional encryption key of an off-chain DID using the CBOR serialization algorithm
 * and encoding the result in Base58 format with a multibase prefix.
 *
 * @param details The light DID details to encode.
 * @param details.encryptionKey The DID encryption key.
 * @param details.serviceEndpoints The DID service endpoints.
 * @returns The Base58-encoded and CBOR-serialized off-chain DID optional details.
 */
export function serializeAndEncodeAdditionalLightDidDetails({
  encryptionKey,
  serviceEndpoints,
}: Pick<LightDidCreationDetails, 'encryptionKey' | 'serviceEndpoints'>):
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

  const serialized = cborEncode(objectToSerialize)
  // Add a flag to recognize the serialization algorithm. (Currently only custom object + cbor)
  return base58Encode([0x0, ...serialized], true)
}

export function decodeAndDeserializeAdditionalLightDidDetails(
  rawInput: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  version = 1
): Pick<LightDidCreationDetails, 'encryptionKey' | 'serviceEndpoints'> {
  const decoded = base58Decode(rawInput, true)
  const serializationFlag = decoded[0]
  if (serializationFlag !== 0x0) {
    throw SDKErrors.ERROR_DID_ERROR('Serialization algorithm not supported')
  }
  const withoutFlag = decoded.slice(1)
  const deserialized: Map<string, unknown> = cborDecode(withoutFlag)

  return {
    encryptionKey: deserialized[ENCRYPTION_KEY_MAP_KEY],
    serviceEndpoints: deserialized[SERVICES_KEY_MAP_KEY],
  }
}
