/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { DidDocument, DidUri } from '@kiltprotocol/types'

import {
  base58Decode,
  base58Encode,
  decodeAddress,
} from '@polkadot/util-crypto'
import { cbor, SDKErrors, ss58Format } from '@kiltprotocol/utils'

import type {
  NewDidEncryptionKey,
  NewDidVerificationKey,
  NewService,
  DidSigningMethodType,
} from './DidDetails.js'

import {
  keypairToMultibaseKey,
  didKeyToVerificationMethod,
  getAddressFromVerificationMethod,
  parse,
} from '../Did.utils.js'
import { fragmentIdToChain, validateNewService } from '../Did.chain.js'
import {
  addKeypairAsVerificationMethod,
  encryptionMethodTypes,
} from './DidDetails.js'

/**
 * Currently, a light DID does not support the use of an ECDSA key as its authentication verification method.
 */
export type LightDidSupportedVerificationKeyType = Extract<
  DidSigningMethodType,
  'ed25519' | 'sr25519'
>
/**
 * A new public key specified when creating a new light DID.
 */
export type NewLightDidVerificationKey = NewDidVerificationKey & {
  type: LightDidSupportedVerificationKeyType
}

type LightDidEncoding = '00' | '01'

const authenticationKeyId = '#authentication'
const encryptionKeyId = '#encryption'

const verificationKeyTypeToLightDidEncoding: Record<
  LightDidSupportedVerificationKeyType,
  LightDidEncoding
> = {
  sr25519: '00',
  ed25519: '01',
}

const lightDidEncodingToVerificationKeyType: Record<
  LightDidEncoding,
  LightDidSupportedVerificationKeyType
> = {
  '00': 'sr25519',
  '01': 'ed25519',
}

/**
 * The options that can be used to create a light DID.
 */
export type CreateDocumentInput = {
  /**
   * The key to be used as the DID authentication verification method. This is mandatory and will be used as the first authentication verification method
   * of the full DID upon migration.
   */
  authentication: [NewDidVerificationKey]
  /**
   * The optional encryption key to be used as the DID key agreement verification method. If present, it will be used as the first key agreement verification method
   * of the full DID upon migration.
   */
  keyAgreement?: [NewDidEncryptionKey]
  /**
   * The set of services associated with this DID. Each service ID must be unique.
   * The service ID must not contain the DID prefix when used to create a new DID.
   */
  service?: NewService[]
}

function validateCreateDocumentInput({
  authentication,
  keyAgreement,
  service,
}: CreateDocumentInput): void {
  // Check authentication key type
  const authenticationKeyTypeEncoding =
    verificationKeyTypeToLightDidEncoding[authentication[0].type]

  if (authenticationKeyTypeEncoding === undefined) {
    throw new SDKErrors.UnsupportedKeyError(authentication[0].type)
  }
  if (
    keyAgreement?.[0].type &&
    !encryptionMethodTypes.includes(keyAgreement[0].type)
  ) {
    throw new SDKErrors.DidError(
      `Encryption key type "${keyAgreement[0].type}" is not supported`
    )
  }

  // Checks that for all service IDs have regular strings as their ID and not a full DID.
  // Plus, we forbid a service ID to be `authentication` or `encryption` as that would create confusion
  // when upgrading to a full DID.
  service?.forEach((s) => {
    // A service ID cannot have a reserved ID that is used for key IDs.
    if (s.id === '#authentication' || s.id === '#encryption') {
      throw new SDKErrors.DidError(
        `Cannot specify a service ID with the name "${s.id}" as it is a reserved keyword`
      )
    }
    validateNewService(s)
  })
}

const KEY_AGREEMENT_MAP_KEY = 'e'
const SERVICES_MAP_KEY = 's'

interface SerializableStructure {
  [KEY_AGREEMENT_MAP_KEY]?: NewDidEncryptionKey
  [SERVICES_MAP_KEY]?: Array<
    Partial<Omit<NewService, 'id'>> & {
      id: string
    } & { types?: string[]; urls?: string[] } // This below was mistakenly not accounted for during the SDK refactor, meaning there are light DIDs that contain these keys in their services.
  >
}

/**
 * Serialize the optional key agreement verification method and services of a light DID using the CBOR serialization algorithm
 * and encoding the result in Base58 format with a multibase prefix.
 *
 * @param details The light DID details to encode.
 * @param details.keyAgreement The DID key agreement verification method.
 * @param details.service The DID services.
 * @returns The Base58-encoded and CBOR-serialized light DID optional details.
 */
function serializeAdditionalLightDidDetails({
  keyAgreement,
  service,
}: Pick<CreateDocumentInput, 'keyAgreement' | 'service'>): string | undefined {
  const objectToSerialize: SerializableStructure = {}
  if (keyAgreement) {
    const key = keyAgreement[0]
    objectToSerialize[KEY_AGREEMENT_MAP_KEY] = key
  }
  if (service && service.length > 0) {
    objectToSerialize[SERVICES_MAP_KEY] = service.map(({ id, ...rest }) => ({
      id: fragmentIdToChain(id),
      ...rest,
    }))
  }

  if (Object.keys(objectToSerialize).length === 0) {
    return undefined
  }

  const serializationVersion = 0x0
  const serialized = cbor.encode(objectToSerialize)
  return base58Encode([serializationVersion, ...serialized], true)
}

function deserializeAdditionalLightDidDetails(
  rawInput: string,
  version = 1
): Pick<CreateDocumentInput, 'keyAgreement' | 'service'> {
  if (version !== 1) {
    throw new SDKErrors.DidError('Serialization version not supported')
  }

  const decoded = base58Decode(rawInput, true)
  const serializationVersion = decoded[0]
  const serialized = decoded.slice(1)

  if (serializationVersion !== 0x0) {
    throw new SDKErrors.DidError('Serialization algorithm not supported')
  }
  const deserialized: SerializableStructure = cbor.decode(serialized)

  const keyAgreement = deserialized[KEY_AGREEMENT_MAP_KEY]
  return {
    keyAgreement: keyAgreement && [keyAgreement],
    service: deserialized[SERVICES_MAP_KEY]?.map(
      ({ id, type, serviceEndpoint, types, urls }) => ({
        id: `#${id}`,
        // types for retro-compatibility
        type: (type ?? types) as string[],
        // urls for retro-compatibility
        serviceEndpoint: (serviceEndpoint ?? urls) as string[],
      })
    ),
  }
}

/**
 * Create [[DidDocument]] of a light DID using the provided verification methods and services.
 * Sets proper verification method IDs, builds light DID URI.
 * Private keys are assumed to already live in another storage, as it contains reference only to public keys as verification methods.
 *
 * @param input The input.
 * @param input.authentication The array containing the public keys to be used as the light DID authentication verification method.
 * @param input.keyAgreement The optional array containing the public keys to be used as the light DID key agreement verification methods.
 * @param input.service The optional light DID services.
 *
 * @returns The resulting [[DidDocument]].
 */
export function createLightDidDocument({
  authentication,
  keyAgreement = undefined,
  service,
}: CreateDocumentInput): DidDocument {
  validateCreateDocumentInput({
    authentication,
    keyAgreement,
    service,
  })
  const encodedDetails = serializeAdditionalLightDidDetails({
    keyAgreement,
    service,
  })
  // Validity is checked in validateCreateDocumentInput
  const authenticationKeyTypeEncoding =
    verificationKeyTypeToLightDidEncoding[authentication[0].type]
  const address = getAddressFromVerificationMethod({
    publicKeyMultibase: keypairToMultibaseKey(authentication[0]),
  })

  const encodedDetailsString = encodedDetails ? `:${encodedDetails}` : ''
  const uri =
    `did:kilt:light:${authenticationKeyTypeEncoding}${address}${encodedDetailsString}` as DidUri

  const did: DidDocument = {
    id: uri,
    authentication: [authenticationKeyId],
    verificationMethod: [
      didKeyToVerificationMethod(uri, authenticationKeyId, {
        keyType: authentication[0].type,
        publicKey: authentication[0].publicKey,
      }),
    ],
    service,
  }

  if (keyAgreement !== undefined) {
    const { publicKey, type } = keyAgreement[0]
    addKeypairAsVerificationMethod(
      did,
      { id: encryptionKeyId, publicKey, type },
      'keyAgreement'
    )
  }

  return did
}

/**
 * Create [[DidDocument]] of a light DID by parsing the provided input URI.
 * Only use for DIDs you control, when you are certain they have not been upgraded to on-chain full DIDs.
 * For the DIDs you have received from external sources use [[resolve]] etc.
 *
 * Parsing is possible because of the self-describing and self-containing nature of light DIDs.
 * Private keys are assumed to already live in another storage, as it contains reference only to public keys as verification methods.
 *
 * @param uri The DID URI to parse.
 * @param failIfFragmentPresent Whether to fail when parsing the URI in case a fragment is present or not, which is not relevant to the creation of the DID. It defaults to true.
 *
 * @returns The resulting [[DidDocument]].
 */
export function parseDocumentFromLightDid(
  uri: DidUri,
  failIfFragmentPresent = true
): DidDocument {
  const {
    address,
    version,
    encodedDetails,
    fragment,
    type,
    authKeyTypeEncoding,
  } = parse(uri)

  if (type !== 'light') {
    throw new SDKErrors.DidError(
      `Cannot build a light DID from the provided URI "${uri}" because it does not refer to a light DID`
    )
  }
  if (fragment !== undefined && failIfFragmentPresent) {
    throw new SDKErrors.DidError(
      `Cannot build a light DID from the provided URI "${uri}" because it has a fragment`
    )
  }
  const keyType =
    authKeyTypeEncoding &&
    lightDidEncodingToVerificationKeyType[authKeyTypeEncoding]

  if (keyType === undefined) {
    throw new SDKErrors.DidError(
      `Authentication key encoding "${authKeyTypeEncoding}" does not match any supported key type`
    )
  }
  const publicKey = decodeAddress(address, false, ss58Format)
  const authentication: [NewLightDidVerificationKey] = [
    { publicKey, type: keyType },
  ]
  if (!encodedDetails) {
    return createLightDidDocument({ authentication })
  }
  const { keyAgreement, service } = deserializeAdditionalLightDidDetails(
    encodedDetails,
    version
  )
  return createLightDidDocument({
    authentication,
    keyAgreement,
    service,
  })
}
