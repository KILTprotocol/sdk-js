/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { blake2AsU8a, checkAddress, encodeAddress } from '@polkadot/util-crypto'
import { stringToU8a } from '@polkadot/util'
import { ApiPromise } from '@polkadot/api'

import {
  DidIdentifier,
  DidKey,
  DidResourceUri,
  NewDidVerificationKey,
  DidServiceEndpoint,
  DidUri,
  DidVerificationKey,
  EncryptionAlgorithms,
  EncryptionKeyType,
  encryptionKeyTypes,
  NewDidKey,
  SigningAlgorithms,
  UriFragment,
  VerificationKeyType,
  verificationKeyTypes,
  NewDidEncryptionKey,
  DidEncryptionKey,
  KiltAddress,
} from '@kiltprotocol/types'
import { SDKErrors, ss58Format } from '@kiltprotocol/utils'

/// The latest version for KILT light DIDs.
export const LIGHT_DID_LATEST_VERSION = 1

/// The latest version for KILT full DIDs.
export const FULL_DID_LATEST_VERSION = 1

export const KILT_DID_PREFIX = 'did:kilt:'

// NOTICE: The following regex patterns must be kept in sync with DidUri type in @kiltprotocol/types

// Matches the following full DIDs
// - did:kilt:<kilt_address>
// - did:kilt:<kilt_address>#<fragment>
const FULL_KILT_DID_REGEX =
  /^did:kilt:(?<address>4[1-9a-km-zA-HJ-NP-Z]{47})(?<fragment>#[^#\n]+)?$/

// Matches the following light DIDs
// - did:kilt:light:00<kilt_address>
// - did:kilt:light:01<kilt_address>:<encoded_details>
// - did:kilt:light:10<kilt_address>#<fragment>
// - did:kilt:light:99<kilt_address>:<encoded_details>#<fragment>
const LIGHT_KILT_DID_REGEX =
  /^did:kilt:light:(?<authKeyType>[0-9]{2})(?<address>4[1-9a-km-zA-HJ-NP-Z]{47,48})(:(?<encodedDetails>.+?))?(?<fragment>#[^#\n]+)?$/

export const defaultKeySelectionCallback = <T>(keys: T[]): Promise<T | null> =>
  Promise.resolve(keys[0] || null)

function isKiltAddress(input: string): input is KiltAddress {
  return checkAddress(input, ss58Format)[0]
}

/**
 * Extracts the KILT address from the DID identifier, even if it is the light DID.
 *
 * @param identifier The identifier of light or full DID.
 * @returns The KILT address.
 */
export function getAddressFromIdentifier(
  identifier: DidIdentifier
): KiltAddress {
  const isAddress = isKiltAddress(identifier)
  const address = isAddress ? identifier : identifier.substring(2)
  return address as KiltAddress
}

export type IDidParsingResult = {
  did: DidUri
  version: number
  type: 'light' | 'full'
  identifier: DidIdentifier
  address: KiltAddress
  fragment?: UriFragment
  authKeyTypeEncoding?: string
  encodedDetails?: string
}

/**
 * Parses a KILT DID uri and returns the information contained within in a structured form.
 *
 * @param didUri A KILT DID uri as a string.
 * @returns Object containing information extracted from the DID uri.
 */
export function parseDidUri(
  didUri: DidUri | DidResourceUri
): IDidParsingResult {
  let matches = FULL_KILT_DID_REGEX.exec(didUri)?.groups
  if (matches) {
    const { version: versionString, fragment } = matches
    const address = matches.address as KiltAddress
    const version = versionString
      ? parseInt(versionString, 10)
      : FULL_DID_LATEST_VERSION
    return {
      did: didUri.replace(fragment || '', '') as DidUri,
      version,
      type: 'full',
      identifier: address,
      address,
      fragment: fragment === '#' ? undefined : (fragment as UriFragment),
    }
  }

  // If it fails to parse full DID, try with light DID
  matches = LIGHT_KILT_DID_REGEX.exec(didUri)?.groups
  if (matches) {
    const {
      authKeyType,
      version: versionString,
      encodedDetails,
      fragment,
    } = matches
    const address = matches.address as KiltAddress
    const version = versionString
      ? parseInt(versionString, 10)
      : LIGHT_DID_LATEST_VERSION
    const identifier = `${authKeyType}${address}` as DidIdentifier
    return {
      did: didUri.replace(fragment || '', '') as DidUri,
      version,
      type: 'light',
      identifier,
      address,
      fragment: fragment === '#' ? undefined : (fragment as UriFragment),
      encodedDetails,
      authKeyTypeEncoding: authKeyType,
    }
  }

  throw new SDKErrors.InvalidDidFormatError(didUri)
}

/**
 * Parses a KILT DID uri and returns its unique identifier.
 *
 * @param didUri A KILT DID uri as a string.
 * @returns The identifier contained within the DID uri.
 */
export function getIdentifierFromKiltDid(didUri: DidUri): DidIdentifier {
  return parseDidUri(didUri).identifier
}

/**
 * Returns true if both didA and didB refer to the same DID subject, i.e., whether they have the same identifier as specified in the method spec.
 *
 * @param didA A KILT DID uri as a string.
 * @param didB A second KILT DID uri as a string.
 * @returns Whether didA and didB refer to the same DID subject.
 */
export function isSameSubject(didA: DidUri, didB: DidUri): boolean {
  return parseDidUri(didA).address === parseDidUri(didB).address
}

const signatureAlgForKeyType: Record<VerificationKeyType, SigningAlgorithms> = {
  ed25519: 'ed25519',
  sr25519: 'sr25519',
  ecdsa: 'ecdsa-secp256k1',
}
const keyTypeForSignatureAlg = Object.entries(signatureAlgForKeyType).reduce(
  (obj, [key, value]) => ({ ...obj, [value]: key }),
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
    x25519: 'x25519-xsalsa20-poly1305',
  }

/**
 * Given the identifier of a key type, returns the identifier of the encryption algorithm for which it is used.
 *
 * @param keyType Key type identifier.
 * @returns Encryption algorithm identifier.
 */
export function getEncryptionAlgorithmForEncryptionKeyType(
  keyType: EncryptionKeyType
): EncryptionAlgorithms {
  return encryptionAlgForKeyType[keyType]
}

const keyTypeForEncryptionAlg: Record<EncryptionAlgorithms, EncryptionKeyType> =
  {
    'x25519-xsalsa20-poly1305': 'x25519',
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
export function isVerificationKey(
  key: Partial<NewDidKey | DidKey> & Pick<NewDidKey | DidKey, 'type'>
): key is NewDidVerificationKey | DidVerificationKey {
  return verificationKeyTypes.some((kt) => kt === key.type)
}

/**
 * Checks whether a DidKey is an encryption key.
 *
 * @param key Representation of a DID key.
 * @returns True if the key is an encryption key, false otherwise.
 */
export function isEncryptionKey(
  key: Partial<NewDidKey | DidKey> & Pick<NewDidKey | DidKey, 'type'>
): key is NewDidEncryptionKey | DidEncryptionKey {
  return encryptionKeyTypes.some((kt) => kt === key.type)
}

export type EncodedVerificationKey =
  | { sr25519: Uint8Array }
  | { ed25519: Uint8Array }
  | { ecdsa: Uint8Array }

export type EncodedEncryptionKey = { x25519: Uint8Array }

export type EncodedKey = EncodedVerificationKey | EncodedEncryptionKey

export type EncodedSignature = EncodedVerificationKey

/**
 * Type guard assuring that a string (or other input) is a valid KILT DID uri.
 *
 * @param input Arbitrary input.
 * @param allowFragment Whether the uri is allowed to have a fragment (following '#').
 * @returns True if validation has passed.
 */
export function validateKiltDidUri(
  input: unknown,
  allowFragment = false
): input is DidUri | DidResourceUri {
  if (typeof input !== 'string') {
    throw new TypeError(`DID string expected, got ${typeof input}`)
  }
  const { address, fragment } = parseDidUri(input as DidUri)
  if (!allowFragment && fragment) {
    throw new SDKErrors.InvalidDidFormatError(input)
  }
  if (!isKiltAddress(address)) {
    throw new SDKErrors.AddressInvalidError(address, 'DID identifier')
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
    return url.href === str || encodeURI(decodeURI(str)) === str // make sure our URI has not been converted implicitly by URL
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
 * Remove the `#` prefix from the UriFragment string, typically an ID.
 *
 * @param id The input ID to strip.
 * @returns The string without the prefix.
 */
export function stripFragment(id: UriFragment): string {
  return id.replace(/^#/, '')
}

/**
 * Performs sanity checks on service endpoint data, making sure that the following conditions are met:
 *   - The `id` property is a string containing a valid URI fragment according to RFC#3986, not a complete DID URI.
 *   - If the `uris` property contains one or more strings, they must be valid URIs according to RFC#3986.
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
      new SDKErrors.DidError(
        `This function requires only the URI fragment part (following '#') of the service ID, not the full DID URI, which is violated by id "${endpoint.id}"`
      )
    )
  }
  if (!isUriFragment(stripFragment(endpoint.id))) {
    errors.push(
      new SDKErrors.DidError(
        `The service ID must be valid as a URI fragment according to RFC#3986, which "${endpoint.id}" is not. Make sure not to use disallowed characters (e.g. whitespace) or consider URL-encoding the desired id.`
      )
    )
  }
  endpoint.serviceEndpoint.forEach((uri) => {
    if (!isUri(uri)) {
      errors.push(
        new SDKErrors.DidError(
          `A service URI must be a URI according to RFC#3986, which "${uri}" (service id "${endpoint.id}") is not. Make sure not to use disallowed characters (e.g. whitespace) or consider URL-encoding resource locators beforehand.`
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
 *   - The `endpoint.uris` array has at most 1 URI, with a value that is at most 200 ASCII characters long.
 *
 * @param api An api instance required for reading up-to-date size constraints from the blockchain runtime.
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
    api.consts.did.maxServiceIdLength.toNumber(),
    api.consts.did.maxNumberOfTypesPerService.toNumber(),
    api.consts.did.maxNumberOfUrlsPerService.toNumber(),
    api.consts.did.maxServiceTypeLength.toNumber(),
    api.consts.did.maxServiceUrlLength.toNumber(),
  ]
  const errors: Error[] = []

  const idEncodedLength = stringToU8a(stripFragment(endpoint.id)).length
  if (idEncodedLength > maxServiceIdLength) {
    errors.push(
      new SDKErrors.DidError(
        `The service ID "${endpoint.id}" is too long (${idEncodedLength} bytes). Max number of bytes allowed for a service ID is ${maxServiceIdLength}.`
      )
    )
  }
  if (endpoint.type.length > maxNumberOfTypesPerService) {
    errors.push(
      new SDKErrors.DidError(
        `The service with ID "${endpoint.id}" has too many types (${endpoint.type.length}). Max number of types allowed per service is ${maxNumberOfTypesPerService}.`
      )
    )
  }
  if (endpoint.serviceEndpoint.length > maxNumberOfUrlsPerService) {
    errors.push(
      new SDKErrors.DidError(
        `The service with ID "${endpoint.id}" has too many URIs (${endpoint.serviceEndpoint.length}). Max number of URIs allowed per service is ${maxNumberOfUrlsPerService}.`
      )
    )
  }
  endpoint.type.forEach((type) => {
    const typeEncodedLength = stringToU8a(type).length
    if (typeEncodedLength > maxServiceTypeLength) {
      errors.push(
        new SDKErrors.DidError(
          `The service with ID "${endpoint.id}" has the type "${type}" that is too long (${typeEncodedLength} bytes). Max number of bytes allowed for a service type is ${maxServiceTypeLength}.`
        )
      )
    }
  })
  endpoint.serviceEndpoint.forEach((uri) => {
    const uriEncodedLength = stringToU8a(uri).length
    if (uriEncodedLength > maxServiceUrlLength) {
      errors.push(
        new SDKErrors.DidError(
          `The service with ID "${endpoint.id}" has the URI "${uri}" that is too long (${uriEncodedLength} bytes). Max number of bytes allowed for a service URI is ${maxServiceUrlLength}.`
        )
      )
    }
  })
  return errors.length ? [false, errors] : [true, undefined]
}

export function getAddressByKey({
  publicKey,
  type,
}: Pick<DidVerificationKey, 'publicKey' | 'type'>): KiltAddress {
  switch (type) {
    case 'ed25519':
    case 'sr25519':
      return encodeAddress(publicKey, ss58Format)
    case 'ecdsa': {
      // Taken from https://github.com/polkadot-js/common/blob/master/packages/keyring/src/pair/index.ts#L44
      const pk = publicKey.length > 32 ? blake2AsU8a(publicKey) : publicKey
      return encodeAddress(pk, ss58Format)
    }
    default:
      throw new SDKErrors.DidBuilderError(`Unsupported key type "${type}"`)
  }
}

/**
 * Builds the URI a light DID will have after it’s stored on the blockchain.
 *
 * @param didOrAddress The URI of the light DID.
 * @param version The version of the DID URI to use.
 * @returns The expected full DID URI.
 */
export function getFullDidUri(
  didOrAddress: DidUri | KiltAddress,
  version = FULL_DID_LATEST_VERSION
): DidUri {
  const address = isKiltAddress(didOrAddress)
    ? didOrAddress
    : parseDidUri(didOrAddress as DidUri).address
  const versionString = version === 1 ? '' : `v${version}`
  return `${KILT_DID_PREFIX}${versionString}${address}` as DidUri
}

export function getFullDidUriByKey(
  key: Pick<DidVerificationKey, 'publicKey' | 'type'>
): DidUri {
  const address = getAddressByKey(key)
  return getFullDidUri(address)
}
