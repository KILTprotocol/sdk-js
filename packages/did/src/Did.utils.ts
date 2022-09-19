/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { blake2AsU8a, checkAddress, encodeAddress } from '@polkadot/util-crypto'

import {
  DidResourceUri,
  DidServiceEndpoint,
  DidUri,
  DidVerificationKey,
  EncryptionAlgorithms,
  EncryptionKeyType,
  SigningAlgorithms,
  UriFragment,
  VerificationKeyType,
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

function isKiltAddress(input: string): input is KiltAddress {
  return checkAddress(input, ss58Format)[0]
}

export type IDidParsingResult = {
  did: DidUri
  version: number
  type: 'light' | 'full'
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
    return {
      did: didUri.replace(fragment || '', '') as DidUri,
      version,
      type: 'light',
      address,
      fragment: fragment === '#' ? undefined : (fragment as UriFragment),
      encodedDetails,
      authKeyTypeEncoding: authKeyType,
    }
  }

  throw new SDKErrors.InvalidDidFormatError(didUri)
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

export const signatureAlgForKeyType: Record<
  VerificationKeyType,
  SigningAlgorithms
> = Object.freeze({
  ed25519: 'ed25519',
  sr25519: 'sr25519',
  ecdsa: 'ecdsa-secp256k1',
})

export const keyTypeForSignatureAlg = Object.freeze(
  Object.entries(signatureAlgForKeyType).reduce(
    (obj, [key, value]) => ({ ...obj, [value]: key }),
    {}
  )
) as Record<SigningAlgorithms, VerificationKeyType>

export const encryptionAlgForKeyType: Record<
  EncryptionKeyType,
  EncryptionAlgorithms
> = Object.freeze({
  x25519: 'x25519-xsalsa20-poly1305',
})

export const keyTypeForEncryptionAlg: Record<
  EncryptionAlgorithms,
  EncryptionKeyType
> = Object.freeze({
  'x25519-xsalsa20-poly1305': 'x25519',
})

export type EncodedVerificationKey =
  | { sr25519: Uint8Array }
  | { ed25519: Uint8Array }
  | { ecdsa: Uint8Array }

export type EncodedEncryptionKey = { x25519: Uint8Array }

export type EncodedKey = EncodedVerificationKey | EncodedEncryptionKey

export type EncodedSignature = EncodedVerificationKey

/**
 * Checks that a string (or other input) is a valid KILT DID uri with or without a URI fragment.
 * Throws otherwise.
 *
 * @param input Arbitrary input.
 * @param expectType `ResourceUri` if the URI is expected to have a fragment (following '#'), `Did` if it is expected not to have one. Default allows both.
 */
export function validateKiltDidUri(
  input: unknown,
  expectType?: 'Did' | 'ResourceUri'
): void {
  if (typeof input !== 'string') {
    throw new TypeError(`DID string expected, got ${typeof input}`)
  }
  const { address, fragment } = parseDidUri(input as DidUri)
  switch (expectType) {
    // for backwards compatibility with previous implementations, `false` maps to `Did` while `true` maps to `undefined`.
    // @ts-ignore
    case false:
    case 'Did':
      if (fragment)
        throw new SDKErrors.DidError(
          'Expected a Kilt DidUri but got a DidResourceUri (containing a #fragment)'
        )
      break
    case 'ResourceUri':
      if (!fragment)
        throw new SDKErrors.DidError(
          'Expected a Kilt DidResourceUri (containing a #fragment) but got a DidUri'
        )
      break
    default:
      break
  }

  if (!isKiltAddress(address)) {
    throw new SDKErrors.AddressInvalidError(address, 'DID')
  }
}

export function isKiltDidUri(
  input: unknown,
  expectType: 'ResourceUri'
): input is DidResourceUri
export function isKiltDidUri(input: unknown, expectType: 'Did'): input is DidUri
export function isKiltDidUri(input: unknown): input is DidUri | DidResourceUri

/**
 * Type guard assuring that a string (or other input) is a valid KILT DID uri with or without a URI fragment.
 *
 * @param input Arbitrary input.
 * @param expectType `ResourceUri` if the URI is expected to have a fragment (following '#'), `Did` if it is expected not to have one. Default allows both.
 * @returns True if validation has passed, false otherwise.
 */
export function isKiltDidUri(
  input: unknown,
  expectType?: 'Did' | 'ResourceUri'
): input is DidUri | DidResourceUri {
  try {
    validateKiltDidUri(input, expectType)
    return true
  } catch {
    return false
  }
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
 */
export function checkServiceEndpointSyntax(endpoint: DidServiceEndpoint): void {
  const { id, serviceEndpoint } = endpoint
  if (id.startsWith('did:kilt')) {
    throw new SDKErrors.DidError(
      `This function requires only the URI fragment part (following '#') of the service ID, not the full DID URI, which is violated by id "${id}"`
    )
  }
  if (!isUriFragment(stripFragment(id))) {
    throw new SDKErrors.DidError(
      `The service ID must be valid as a URI fragment according to RFC#3986, which "${id}" is not. Make sure not to use disallowed characters (e.g. whitespace) or consider URL-encoding the desired id.`
    )
  }
  serviceEndpoint.forEach((uri) => {
    if (!isUri(uri)) {
      throw new SDKErrors.DidError(
        `A service URI must be a URI according to RFC#3986, which "${uri}" (service id "${id}") is not. Make sure not to use disallowed characters (e.g. whitespace) or consider URL-encoding resource locators beforehand.`
      )
    }
  })
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
 * @param didOrAddress The URI of the light DID. Internally it’s used with the DID "address" as well.
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

/**
 * Builds the URI of a full DID if it is created with the authentication key provided.
 *
 * @param key The key that will be used as DID authentication key.
 * @returns The expected full DID URI.
 */
export function getFullDidUriFromKey(
  key: Pick<DidVerificationKey, 'publicKey' | 'type'>
): DidUri {
  const address = getAddressByKey(key)
  return getFullDidUri(address)
}
