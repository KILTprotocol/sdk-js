/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { u8aToString } from '@polkadot/util'
import { blake2AsU8a, encodeAddress } from '@polkadot/util-crypto'
import type {
  DidUri,
  DidUrl,
  KeyringPair,
  KiltAddress,
  UriFragment,
  VerificationMethod,
} from '@kiltprotocol/types'
import { DataUtils, SDKErrors, ss58Format } from '@kiltprotocol/utils'
import { decode as multibaseDecode, encode as multibaseEncode } from 'multibase'

import type { DidVerificationMethodType } from './DidDetails/DidDetails.js'

// The latest version for KILT light DIDs.
const LIGHT_DID_LATEST_VERSION = 1

// The latest version for KILT full DIDs.
const FULL_DID_LATEST_VERSION = 1

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

type IDidParsingResult = {
  did: DidUri
  version: number
  type: 'light' | 'full'
  address: KiltAddress
  queryParameters?: Record<string, string>
  fragment?: UriFragment
  authKeyTypeEncoding?: string
  encodedDetails?: string
}

// Exports the params section of a DID URL as a map.
// If multiple keys are present, only the first one is returned.
function exportQueryParamsFromUri(didUri: DidUrl): Record<string, string> {
  const urlified = new URL(didUri)
  const params: Record<string, string> = {}
  urlified.searchParams.forEach((value, key) => {
    if (params[key] === undefined) {
      params[key] = value
    }
  })
  return params
}

/**
 * Parses a KILT DID uri and returns the information contained within in a structured form.
 *
 * @param didUri A KILT DID uri as a string.
 * @returns Object containing information extracted from the DID uri.
 */
export function parse(didUri: DidUri | DidUrl): IDidParsingResult {
  // Then we check if it conforms to either a full or a light DID URL.
  let matches = FULL_KILT_DID_REGEX.exec(didUri)?.groups
  if (matches) {
    const { version: versionString, fragment } = matches
    const address = matches.address as KiltAddress
    const version = versionString
      ? parseInt(versionString, 10)
      : FULL_DID_LATEST_VERSION
    const queryParameters = (() => {
      try {
        const queryParams = exportQueryParamsFromUri(didUri as DidUrl)
        return Object.keys(queryParams).length > 0 ? queryParams : undefined
      } catch {
        throw new SDKErrors.InvalidDidFormatError(didUri)
      }
    })()
    return {
      did: didUri.replace(fragment || '', '') as DidUri,
      version,
      type: 'full',
      address,
      queryParameters,
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
    const queryParameters = (() => {
      try {
        const queryParams = exportQueryParamsFromUri(didUri as DidUrl)
        return Object.keys(queryParams).length > 0 ? queryParams : undefined
      } catch {
        throw new SDKErrors.InvalidDidFormatError(didUri)
      }
    })()
    return {
      did: didUri.replace(fragment || '', '') as DidUri,
      version,
      type: 'light',
      address,
      queryParameters,
      fragment: fragment === '#' ? undefined : (fragment as UriFragment),
      encodedDetails,
      authKeyTypeEncoding: authKeyType,
    }
  }

  throw new SDKErrors.InvalidDidFormatError(didUri)
}

type DecodedVerificationMethod = {
  publicKey: Uint8Array
  keyType: DidVerificationMethodType
}

const MULTICODEC_ECDSA_PREFIX = 0xe7
const MULTICODEC_X25519_PREFIX = 0xec
const MULTICODEC_ED25519_PREFIX = 0xed
const MULTICODEC_SR25519_PREFIX = 0xef

const multicodecPrefixes: Record<number, [DidVerificationMethodType, number]> =
  {
    [MULTICODEC_ECDSA_PREFIX]: ['ecdsa', 33],
    [MULTICODEC_X25519_PREFIX]: ['x25519', 32],
    [MULTICODEC_ED25519_PREFIX]: ['ed25519', 32],
    [MULTICODEC_SR25519_PREFIX]: ['sr25519', 32],
  }
const multicodecReversePrefixes: Record<DidVerificationMethodType, number> = {
  ecdsa: MULTICODEC_ECDSA_PREFIX,
  x25519: MULTICODEC_X25519_PREFIX,
  ed25519: MULTICODEC_ED25519_PREFIX,
  sr25519: MULTICODEC_SR25519_PREFIX,
}

/**
 * Decode a Multikey representation of a verification method into its fundamental components: the public key and the key type.
 *
 * @param publicKeyMultibase The verification method's public key in Multikey format (i.e., multicodec-prefixed, then multibase encoded).
 * @returns The decoded public key and [[DidKeyType]].
 */
export function multibaseKeyToDidKey(
  publicKeyMultibase: VerificationMethod['publicKeyMultibase']
): DecodedVerificationMethod {
  const decodedMulticodecPublicKey = multibaseDecode(publicKeyMultibase)
  const [keyTypeFlag, publicKey] = [
    decodedMulticodecPublicKey.subarray(0, 1)[0],
    decodedMulticodecPublicKey.subarray(1),
  ]
  const [keyType, expectedPublicKeyLength] = multicodecPrefixes[keyTypeFlag]
  if (keyType === undefined) {
    throw new SDKErrors.DidError(
      `Cannot decode key type for multibase key "${publicKeyMultibase}".`
    )
  }
  if (publicKey.length !== expectedPublicKeyLength) {
    throw new SDKErrors.DidError(
      `Key of type "${keyType}" is expected to be ${expectedPublicKeyLength} bytes long. Provided key is ${publicKey.length} bytes long instead.`
    )
  }
  return {
    keyType,
    publicKey,
  }
}

/**
 * Calculate the Multikey representation of a keypair given its type and public key.
 *
 * @param keypair The input keypair to encode as Multikey.
 * @param keypair.type The keypair [[DidKeyType]].
 * @param keypair.publicKey The keypair public key.
 * @returns The Multikey representation (i.e., multicodec-prefixed, then multibase encoded) of the provided keypair.
 */
export function keypairToMultibaseKey({
  type,
  publicKey,
}: Pick<KeyringPair, 'publicKey'> & {
  type: DidVerificationMethodType
}): VerificationMethod['publicKeyMultibase'] {
  const multiCodecPublicKeyPrefix = multicodecReversePrefixes[type]
  if (multiCodecPublicKeyPrefix === undefined) {
    throw new SDKErrors.DidError(
      `The provided key type "${type}" is not supported.`
    )
  }
  const expectedPublicKeySize = multicodecPrefixes[multiCodecPublicKeyPrefix][1]
  if (publicKey.length !== expectedPublicKeySize) {
    throw new SDKErrors.DidError(
      `Key of type "${type}" is expected to be ${expectedPublicKeySize} bytes long. Provided key is ${publicKey.length} bytes long instead.`
    )
  }
  const multiCodecPublicKey = [multiCodecPublicKeyPrefix, ...publicKey]
  return u8aToString(
    multibaseEncode('base58btc', Uint8Array.from(multiCodecPublicKey))
  ) as `z${string}`
}

/**
 * Convert a DID key to a `MultiKey` verification method.
 *
 * @param controller The verification method controller's DID URI.
 * @param id The verification method ID.
 * @param key The DID key to export as a verification method.
 * @param key.keyType The key type.
 * @param key.publicKey The public component of the key.
 * @returns The provided key encoded as a [[VerificationMethod]].
 */
export function didKeyToVerificationMethod(
  controller: VerificationMethod['controller'],
  id: VerificationMethod['id'],
  { keyType, publicKey }: DecodedVerificationMethod
): VerificationMethod {
  const multiCodecPublicKeyPrefix = multicodecReversePrefixes[keyType]
  if (multiCodecPublicKeyPrefix === undefined) {
    throw new SDKErrors.DidError(
      `Provided key type "${keyType}" not supported.`
    )
  }
  const expectedPublicKeySize = multicodecPrefixes[multiCodecPublicKeyPrefix][1]
  if (publicKey.length !== expectedPublicKeySize) {
    throw new SDKErrors.DidError(
      `Key of type "${keyType}" is expected to be ${expectedPublicKeySize} bytes long. Provided key is ${publicKey.length} bytes long instead.`
    )
  }
  const multiCodecPublicKey = [multiCodecPublicKeyPrefix, ...publicKey]
  return {
    controller,
    id,
    type: 'Multikey',
    publicKeyMultibase: u8aToString(
      multibaseEncode('base58btc', Uint8Array.from(multiCodecPublicKey))
    ) as `z${string}`,
  }
}

/**
 * Returns true if both didA and didB refer to the same DID subject, i.e., whether they have the same identifier as specified in the method spec.
 *
 * @param didA A KILT DID uri as a string.
 * @param didB A second KILT DID uri as a string.
 * @returns Whether didA and didB refer to the same DID subject.
 */
export function isSameSubject(didA: DidUri, didB: DidUri): boolean {
  return parse(didA).address === parse(didB).address
}

/**
 * Checks that a string (or other input) is a valid KILT DID with or without a trailing fragment.
 * Throws otherwise.
 *
 * @param input Arbitrary input.
 * @param expectType `Uri` if the URI is expected to have a fragment (following '#'), `Url` if it is expected not to have one. Default allows both.
 */
export function validateIdentifier(
  input: unknown,
  expectType?: 'Uri' | 'Url'
): void {
  if (typeof input !== 'string') {
    throw new TypeError(`DID string expected, got ${typeof input}`)
  }
  const { address, fragment } = parse(input as DidUri)

  if (
    fragment &&
    (expectType === 'Uri' ||
      // for backwards compatibility with previous implementations, `false` maps to `Did` while `true` maps to `undefined`.
      (typeof expectType === 'boolean' && expectType === false))
  ) {
    throw new SDKErrors.DidError(
      'Expected a Kilt DidUri but got a DidUrl (containing a #fragment)'
    )
  }

  if (!fragment && expectType === 'Url') {
    throw new SDKErrors.DidError(
      'Expected a Kilt DidUrl (containing a #fragment) but got a DidUri'
    )
  }

  DataUtils.verifyKiltAddress(address)
}

/**
 * Internal: derive the address part of the DID when it is created from the provided authentication verification method.
 *
 * @param input The authentication verification method.
 * @param input.publicKeyMultibase The `publicKeyMultibase` value of the verification method.
 * @returns The expected address of the DID.
 */
export function getAddressFromVerificationMethod({
  publicKeyMultibase,
}: Pick<VerificationMethod, 'publicKeyMultibase'>): KiltAddress {
  const { keyType: type, publicKey } = multibaseKeyToDidKey(publicKeyMultibase)
  if (type === 'ed25519' || type === 'sr25519') {
    return encodeAddress(publicKey, ss58Format)
  }

  // Otherwise it’s ecdsa.
  // Taken from https://github.com/polkadot-js/common/blob/master/packages/keyring/src/pair/index.ts#L44
  const address = publicKey.length > 32 ? blake2AsU8a(publicKey) : publicKey
  return encodeAddress(address, ss58Format)
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
  const address = DataUtils.isKiltAddress(didOrAddress)
    ? didOrAddress
    : parse(didOrAddress as DidUri).address
  const versionString = version === 1 ? '' : `v${version}`
  return `did:kilt:${versionString}${address}` as DidUri
}

/**
 * Builds the URI of a full DID if it is created with the authentication verification method derived from the provided public key.
 *
 * @param verificationMethod The DID verification method.
 * @returns The expected full DID URI.
 */
export function getFullDidUriFromVerificationMethod(
  verificationMethod: Pick<VerificationMethod, 'publicKeyMultibase'>
): DidUri {
  const address = getAddressFromVerificationMethod(verificationMethod)
  return getFullDidUri(address)
}
