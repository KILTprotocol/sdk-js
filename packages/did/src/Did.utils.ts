/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { checkAddress } from '@polkadot/util-crypto'
import { stringToU8a } from '@polkadot/util'
import { ApiPromise } from '@polkadot/api'
import { u32 } from '@polkadot/types'

import {
  DidKey,
  DidPublicKey,
  EncryptionKeyType,
  IDidDetails,
  DidIdentifier,
  NewDidKey,
  VerificationKeyType,
  DidServiceEndpoint,
  EncryptionAlgorithms,
  SigningAlgorithms,
} from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'

/// The latest version for KILT light DIDs.
export const LIGHT_DID_LATEST_VERSION = 1

/// The latest version for KILT full DIDs.
export const FULL_DID_LATEST_VERSION = 1

const KILT_DID_PREFIX = 'did:kilt:'

// NOTICE: The following regex patterns must be kept in sync with DidUri type in @kiltprotocol/types

// Matches the following full DIDs
// - did:kilt:<kilt_address>
// - did:kilt:<kilt_address>#<fragment>
const FULL_KILT_DID_REGEX =
  /^did:kilt:(?<identifier>4[1-9a-km-zA-HJ-NP-Z]{47})(?<fragment>#[^#\n]+)?$/

// Matches the following light DIDs
// - did:kilt:light:00<kilt_address>
// - did:kilt:light:01<kilt_address>:<encoded_details>
// - did:kilt:light:10<kilt_address>#<fragment>
// - did:kilt:light:99<kilt_address>:<encoded_details>#<fragment>
const LIGHT_KILT_DID_REGEX =
  /^did:kilt:light:(?<auth_key_type>[0-9]{2})(?<identifier>4[1-9a-km-zA-HJ-NP-Z]{47,48})(?<encoded_details>:.+?)?(?<fragment>#[^#\n]+)?$/

export const defaultKeySelectionCallback = <T>(keys: T[]): Promise<T | null> =>
  Promise.resolve(keys[0] || null)

/**
 * Compiles a KILT DID uri for a full or light DID from a unique identifier and associated data.
 *
 * @param identifier A ss58 encoded address valid on the KILT network.
 * @param didType 'full' to produce a FullDid's uri, 'light' for a LightDid.
 * @param version KILT DID specification version number.
 * @param encodedDetails When compiling a LightDid uri, encoded DidDetails can be appeneded to the end of the uri.
 * @returns A DID uri as a string.
 */
export function getKiltDidFromIdentifier(
  identifier: DidIdentifier,
  didType: 'full' | 'light',
  version?: number,
  encodedDetails?: string
): IDidDetails['uri'] {
  const typeString = didType === 'full' ? '' : `light:`
  let versionValue = version
  // If no version is specified, take the default one depending on the requested DID type.
  if (!versionValue) {
    versionValue =
      didType === 'full' ? FULL_DID_LATEST_VERSION : LIGHT_DID_LATEST_VERSION
  }
  const versionString = versionValue === 1 ? '' : `v${version}:`
  const encodedDetailsString = encodedDetails ? `:${encodedDetails}` : ''
  return `${KILT_DID_PREFIX}${typeString}${versionString}${identifier}${encodedDetailsString}`
}

export type IDidParsingResult = {
  did: IDidDetails['uri']
  version: number
  type: 'light' | 'full'
  identifier: DidIdentifier
  fragment?: string
  authKeyTypeEncoding?: string
  encodedDetails?: string
}

/**
 * Parses a KILT DID uri and returns the information contained within in a structured form.
 *
 * @param didUri A KILT DID uri as a string.
 * @returns Object containing information extracted from the DID uri.
 */
export function parseDidUri(didUri: IDidDetails['uri']): IDidParsingResult {
  let matches = FULL_KILT_DID_REGEX.exec(didUri)?.groups
  if (matches && matches.identifier) {
    const version = matches.version
      ? parseInt(matches.version, 10)
      : FULL_DID_LATEST_VERSION
    return {
      did: getKiltDidFromIdentifier(matches.identifier, 'full', version),
      version,
      type: 'full',
      identifier: matches.identifier,
      fragment: matches.fragment?.substring(1),
    }
  }

  // If it fails to parse full DID, try with light DID
  matches = LIGHT_KILT_DID_REGEX.exec(didUri)?.groups
  if (matches && matches.identifier && matches.auth_key_type) {
    const version = matches.version ? parseInt(matches.version, 10) : 1
    const lightDidIdentifier = matches.auth_key_type.concat(matches.identifier)
    const encodedDetails = matches.encoded_details?.substring(1)
    return {
      did: getKiltDidFromIdentifier(
        lightDidIdentifier,
        'light',
        version,
        encodedDetails
      ),
      version,
      type: 'light',
      identifier: matches.auth_key_type.concat(matches.identifier),
      fragment: matches.fragment?.substring(1),
      encodedDetails,
    }
  }

  throw new SDKErrors.ERROR_INVALID_DID_FORMAT(didUri)
}

/**
 * Parses a KILT DID uri and returns its unique identifier.
 *
 * @param didUri A KILT DID uri as a string.
 * @returns The identifier contained within the DID uri.
 */
export function getIdentifierFromKiltDid(
  didUri: IDidDetails['uri']
): DidIdentifier {
  return parseDidUri(didUri).identifier
}

/**
 * Returns true if both didA and didB refer to the same DID subject, i.e., whether they have the same identifier as specified in the method spec.
 *
 * @param didA A KILT DID uri as a string.
 * @param didB A second KILT DID uri as a string.
 * @returns Whether didA and didB refer to the same DID subject.
 */
export function isSameSubject(
  didA: IDidDetails['uri'],
  didB: IDidDetails['uri']
): boolean {
  // eslint-disable-next-line prefer-const
  let { identifier: identifierA, type: typeA } = parseDidUri(didA)
  // eslint-disable-next-line prefer-const
  let { identifier: identifierB, type: typeB } = parseDidUri(didB)
  // Skip key encoding part
  if (typeA === 'light') {
    identifierA = identifierA.substring(2)
  }
  if (typeB === 'light') {
    identifierB = identifierB.substring(2)
  }
  return identifierA === identifierB
}

const signatureAlgForKeyType: Record<VerificationKeyType, SigningAlgorithms> = {
  [VerificationKeyType.Ed25519]: SigningAlgorithms.Ed25519,
  [VerificationKeyType.Sr25519]: SigningAlgorithms.Sr25519,
  [VerificationKeyType.Ecdsa]: SigningAlgorithms.EcdsaSecp256k1,
}
const keyTypeForSignatureAlg = Object.entries(signatureAlgForKeyType).reduce(
  (obj, [key, value]) => {
    return { ...obj, [value]: key }
  },
  {}
) as Record<SigningAlgorithms, VerificationKeyType>

/**
 * Given the identifier of a key type, returns the identifier of the signature algorithm for which it is used.
 *
 * @param keyType Key type identifier.
 * @returns Signing algorithm identifier.
 */
export function getSigningAlgorithmForVerificationKeyType(
  keyType: VerificationKeyType
): SigningAlgorithms {
  return signatureAlgForKeyType[keyType]
}

/**
 * Given the identifier of a signature algorithm, returns the identifier of the key type required for it.
 *
 * @param signatureAlg Signature algorithm identifier.
 * @returns Key type identifier.
 */
export function getVerificationKeyTypeForSigningAlgorithm(
  signatureAlg: SigningAlgorithms
): VerificationKeyType {
  return keyTypeForSignatureAlg[signatureAlg]
}

const encryptionAlgForKeyType: Record<EncryptionKeyType, EncryptionAlgorithms> =
  {
    [EncryptionKeyType.X25519]: EncryptionAlgorithms.NaclBox,
  }

/**
 * Given the identifier of a key type, returns the identifier of the encryption algorithm for which it is used.
 *
 * @param keyType Key type identifier.
 * @returns Encryption algorithm indentifier.
 */
export function getEncryptionAlgorithmForEncryptionKeyType(
  keyType: EncryptionKeyType
): EncryptionAlgorithms {
  return encryptionAlgForKeyType[keyType]
}

const keyTypeForEncryptionAlg: Record<EncryptionAlgorithms, EncryptionKeyType> =
  {
    [EncryptionAlgorithms.NaclBox]: EncryptionKeyType.X25519,
  }

/**
 * Given the identifier of an encryption algorithm, returns the identifier of the key type required for it.
 *
 * @param encryptionAlg Encryption algorithm identifier.
 * @returns Key type identifier.
 */
export function getEncryptionKeyTypeForEncryptionAlgorithm(
  encryptionAlg: EncryptionAlgorithms
): EncryptionKeyType {
  return keyTypeForEncryptionAlg[encryptionAlg]
}

/**
 * Checks whether a DidKey is a verification key.
 *
 * @param key Representation of a DID key.
 * @returns True if the key is a verification key, false otherwise.
 */
export function isVerificationKey(key: NewDidKey | DidKey): boolean {
  return Object.values(VerificationKeyType).some((kt) => kt === key.type)
}

/**
 * Checks whether a DidKey is an encryption key.
 *
 * @param key Representation of a DID key.
 * @returns True if the key is a encryption key, false otherwise.
 */
export function isEncryptionKey(key: NewDidKey | DidKey): boolean {
  return Object.values(EncryptionKeyType).some((kt) => kt === key.type)
}

/**
 * Type guard assuring that a string (or other input) is a valid KILT DID uri.
 *
 * @param input Arbitrary input.
 * @param allowFragment Whether the uri is allowed to have a fragment (following '#').
 * @returns True if validation has passed.
 * @throws [[SDKError]] if validation fails.
 */
export function validateKiltDidUri(
  input: unknown,
  allowFragment = false
): input is IDidDetails['uri'] {
  if (typeof input !== 'string') {
    throw TypeError(`DID string expected, got ${typeof input}`)
  }
  const { identifier, type, fragment } = parseDidUri(
    input as IDidDetails['uri']
  )
  if (!allowFragment && fragment) {
    throw new SDKErrors.ERROR_INVALID_DID_FORMAT(input)
  }

  switch (type) {
    case 'full':
      if (!checkAddress(identifier, 38)[0]) {
        throw new SDKErrors.ERROR_ADDRESS_INVALID(identifier, 'DID identifier')
      }
      break
    case 'light':
      // Identifier includes the first two characters for the key type encoding
      if (!checkAddress(identifier.substring(2), 38)[0]) {
        throw new SDKErrors.ERROR_ADDRESS_INVALID(identifier, 'DID identifier')
      }
      break
    default:
      throw new SDKErrors.ERROR_UNSUPPORTED_DID(input)
  }
  return true
}

/**
 * Checks if a string is a valid URI according to RFC#3986.
 *
 * @param str String to be checked.
 * @returns Whether `str` is a valid URI.
 */
export function isUri(str: string): boolean {
  try {
    const url = new URL(str) // this actually accepts any URI but throws if it can't be parsed
    return url.href === str || encodeURI(decodeURI(str)) === str // make sure our URI has not been converted implictly by URL
  } catch {
    return false
  }
}

const UriFragmentRegex = /^[a-zA-Z0-9._~%+,;=*()'&$!@:/?-]+$/

/**
 * Checks if a string is a valid URI fragment according to RFC#3986.
 *
 * @param str String to be checked.
 * @returns Whether `str` is a valid URI fragment.
 */
export function isUriFragment(str: string): boolean {
  try {
    return UriFragmentRegex.test(str) && !!decodeURIComponent(str)
  } catch {
    return false
  }
}

/**
 * Performs sanity checks on service endpoint data, making sure that the following conditions are met:
 *   - The the `id` property is string containing a valid URI fragment according to RFC#3986, not a complete DID URI.
 *   - The if the `urls` property contains one or more strings, they must be valid URIs according to RFC#3986.
 *
 * @param endpoint A service endpoint object to check.
 * @returns Validation result and errors, if any.
 */
export function checkServiceEndpointSyntax(
  endpoint: DidServiceEndpoint
): [boolean, Error[] | undefined] {
  const errors: Error[] = []
  if (endpoint.id.startsWith('did:kilt')) {
    errors.push(
      new SDKErrors.ERROR_DID_ERROR(
        `This function requires only the URI fragment part (following '#') of the service ID, not the full DID URI, which is violated by id '${endpoint.id}'`
      )
    )
  }
  if (!isUriFragment(endpoint.id)) {
    errors.push(
      new SDKErrors.ERROR_DID_ERROR(
        `The service ID must be valid as a URI fragment according to RFC#3986, which '${endpoint.id}' is not. Make sure not to use disallowed characters (e.g. blankspace) or consider URL-encoding the desired id.`
      )
    )
  }
  endpoint.urls.forEach((url) => {
    if (!isUri(url)) {
      errors.push(
        new SDKErrors.ERROR_DID_ERROR(
          `A service URL must be a URI according to RFC#3986, which '${url}' (service id '${endpoint.id}') is not. Make sure not to use disallowed characters (e.g. blankspace) or consider URL-encoding resource locators beforehand.`
        )
      )
    }
  })
  return errors.length ? [false, errors] : [true, undefined]
}

/**
 * Performs size checks on service endpoint data, making sure that the following conditions are met:
 *   - The `endpoint.id` is at most 50 ASCII characters long.
 *   - The `endpoint.types` array has at most 1 service type, with a value that is at most 50 ASCII characters long.
 *   - The `endpoint.urls` array has at most 1 URL, with a value that is at most 200 ASCII characters long.
 *
 * @param api An api instance required for reading up-to-date size contraints from the blockchain runtime.
 * @param endpoint A service endpoint object to check.
 * @returns Validation result and errors, if any.
 */
export function checkServiceEndpointSizeConstraints(
  api: ApiPromise,
  endpoint: DidServiceEndpoint
): [boolean, Error[] | undefined] {
  const [
    maxServiceIdLength,
    maxNumberOfTypesPerService,
    maxNumberOfUrlsPerService,
    maxServiceTypeLength,
    maxServiceUrlLength,
  ] = [
    (api.consts.did.maxServiceIdLength as u32).toNumber(),
    (api.consts.did.maxNumberOfTypesPerService as u32).toNumber(),
    (api.consts.did.maxNumberOfUrlsPerService as u32).toNumber(),
    (api.consts.did.maxServiceTypeLength as u32).toNumber(),
    (api.consts.did.maxServiceUrlLength as u32).toNumber(),
  ]
  const errors: Error[] = []

  const idEncodedLength = stringToU8a(endpoint.id).length
  if (idEncodedLength > maxServiceIdLength) {
    errors.push(
      new SDKErrors.ERROR_DID_ERROR(
        `The service ID '${endpoint.id}' is too long (${idEncodedLength} bytes). Max number of bytes allowed for a service ID is ${maxServiceIdLength}.`
      )
    )
  }
  if (endpoint.types.length > maxNumberOfTypesPerService) {
    errors.push(
      new SDKErrors.ERROR_DID_ERROR(
        `The service with ID '${endpoint.id}' has too many types (${endpoint.types.length}). Max number of types allowed per service is ${maxNumberOfTypesPerService}.`
      )
    )
  }
  if (endpoint.urls.length > maxNumberOfUrlsPerService) {
    errors.push(
      new SDKErrors.ERROR_DID_ERROR(
        `The service with ID '${endpoint.id}' has too many URLs (${endpoint.urls.length}). Max number of URLs allowed per service is ${maxNumberOfUrlsPerService}.`
      )
    )
  }
  endpoint.types.forEach((type) => {
    const typeEncodedLength = stringToU8a(type).length
    if (typeEncodedLength > maxServiceTypeLength) {
      errors.push(
        new SDKErrors.ERROR_DID_ERROR(
          `The service with ID '${endpoint.id}' has the type '${type}' that is too long (${typeEncodedLength} bytes). Max number of bytes allowed for a service type is ${maxServiceTypeLength}.`
        )
      )
    }
  })
  endpoint.urls.forEach((url) => {
    const urlEncodedLength = stringToU8a(url).length
    if (urlEncodedLength > maxServiceUrlLength) {
      errors.push(
        new SDKErrors.ERROR_DID_ERROR(
          `The service with ID '${endpoint.id}' has the URL '${url}' that is too long (${urlEncodedLength} bytes). Max number of bytes allowed for a service URL is ${maxServiceUrlLength}.`
        )
      )
    }
  })
  return errors.length ? [false, errors] : [true, undefined]
}

/**
 * Compute the full key URI (did:kilt:<identifier>#<key_id> for a given DID key <key_id>.
 *
 * @param did The DID URI, with no trailing fragment (i.e., no "#" symbol).
 * @param keyId The key ID, without the leading subject's DID prefix.
 *
 * @returns The full public key URI, which includes the subject's DID and the provided key ID.
 */
export function assembleKeyUri(
  did: IDidDetails['uri'],
  keyId: DidKey['id']
): DidPublicKey['uri'] {
  if (parseDidUri(did).fragment) {
    throw new SDKErrors.ERROR_DID_ERROR(
      `Cannot assemble key URI from a DID that already has a fragment: ${did}`
    )
  }
  return `${did}#${keyId}`
}
