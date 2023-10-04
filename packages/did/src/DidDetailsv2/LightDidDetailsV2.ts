/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import {
  DidDocumentV2,
  encryptionKeyTypes,
  NewDidEncryptionKey,
  NewDidVerificationKey,
} from '@kiltprotocol/types'
import { cbor, SDKErrors, ss58Format } from '@kiltprotocol/utils'
import {
  base58Decode,
  base58Encode,
  decodeAddress,
} from '@polkadot/util-crypto'
import {
  keypairToMultibaseKey,
  didKeyToVerificationMethod,
  getAddressFromVerificationMethod,
  parse,
} from '../Did2.utils.js'
import { fragmentIdToChain, validateNewService } from '../Did2.chain.js'
import type { NewService, DidVerificationKeyType } from './DidDetailsV2.js'

/**
 * Currently, a light DID does not support the use of an ECDSA key as its authentication key.
 */
export type LightDidSupportedVerificationKeyType = Extract<
  DidVerificationKeyType,
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

export type CreateDocumentInput = {
  /**
   * The DID authentication verification method. This is mandatory and will be used as the first authentication verification method
   * of the full DID upon migration.
   */
  authentication: [NewDidVerificationKey]
  /**
   * The optional DID encryption verification method. If present, it will be used as the first key agreement verification method
   * of the full DID upon migration.
   */
  keyAgreement?: [NewDidEncryptionKey]
  /**
   * The set of service endpoints associated with this DID. Each service endpoint ID must be unique.
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
    !encryptionKeyTypes.includes(keyAgreement[0].type)
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
    } & { types?: string[]; urls?: string[] } // This below was mistakenly not accounted for during the SDK refactor, meaning there are light DIDs that contain these keys in their service endpoints.
  >
}

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

export function createLightDidDocument({
  authentication,
  keyAgreement = undefined,
  service,
}: CreateDocumentInput): DidDocumentV2.DidDocument {
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
    `did:kilt:light:${authenticationKeyTypeEncoding}${address}${encodedDetailsString}` as DidDocumentV2.DidUri

  const did: DidDocumentV2.DidDocument = {
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
    did.keyAgreement = [encryptionKeyId]
    did.verificationMethod.push(
      didKeyToVerificationMethod(uri, encryptionKeyId, {
        keyType: keyAgreement[0].type,
        publicKey: keyAgreement[0].publicKey,
      })
    )
  }

  return did
}

export function parseDocumentFromLightDid(
  uri: DidDocumentV2.DidUri,
  failIfFragmentPresent = true
): DidDocumentV2.DidDocument {
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
