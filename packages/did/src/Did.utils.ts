/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import {
  blake2AsU8a,
  encodeAddress,
  base58Decode,
  base58Encode,
} from '@polkadot/util-crypto'
import type {
  Did,
  DidUrl,
  KeyringPair,
  KiltAddress,
  UriFragment,
  VerificationMethod,
} from '@kiltprotocol/types'
import { DataUtils, SDKErrors, ss58Format } from '@kiltprotocol/utils'

import type { DidVerificationMethodType } from './DidDetails/DidDetails.js'
import { parseDocumentFromLightDid } from './DidDetails/LightDidDetails.js'

// The latest version for KILT light DIDs.
const LIGHT_DID_LATEST_VERSION = 1

// The latest version for KILT full DIDs.
const FULL_DID_LATEST_VERSION = 1

// NOTICE: The following regex patterns must be kept in sync with `Did` type in @kiltprotocol/types

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
  did: Did
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
// If no query params are present, returns undefined.
function exportQueryParamsFromDidUrl(
  did: DidUrl
): Record<string, string> | undefined {
  try {
    const urlified = new URL(did)
    return urlified.searchParams.size > 0
      ? Object.fromEntries(urlified.searchParams)
      : undefined
  } catch {
    throw new SDKErrors.InvalidDidFormatError(did)
  }
}

/**
 * Parses a KILT DID or a DID URL and returns the information contained within in a structured form.
 *
 * @param did A KILT DID or a DID URL as a string.
 * @returns Object containing information extracted from the input string.
 */
export function parse(did: Did | DidUrl): IDidParsingResult {
  // Then we check if it conforms to either a full or a light DID.
  let matches = FULL_KILT_DID_REGEX.exec(did)?.groups
  if (matches) {
    const { version: versionString, fragment } = matches
    const address = matches.address as KiltAddress
    const version = versionString
      ? parseInt(versionString, 10)
      : FULL_DID_LATEST_VERSION
    const queryParameters = exportQueryParamsFromDidUrl(did as DidUrl)
    return {
      did: did.replace(fragment || '', '') as Did,
      version,
      type: 'full',
      address,
      queryParameters,
      fragment: fragment === '#' ? undefined : (fragment as UriFragment),
    }
  }

  // If it fails to parse full DID, try with light DID
  matches = LIGHT_KILT_DID_REGEX.exec(did)?.groups
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
    const queryParameters = exportQueryParamsFromDidUrl(did as DidUrl)
    return {
      did: did.replace(fragment || '', '') as Did,
      version,
      type: 'light',
      address,
      queryParameters,
      fragment: fragment === '#' ? undefined : (fragment as UriFragment),
      encodedDetails,
      authKeyTypeEncoding: authKeyType,
    }
  }

  throw new SDKErrors.InvalidDidFormatError(did)
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
 * @returns The decoded public key and {@link DidVerificationMethodType}.
 */
export function multibaseKeyToDidKey(
  publicKeyMultibase: VerificationMethod['publicKeyMultibase']
): DecodedVerificationMethod {
  if (!publicKeyMultibase.startsWith('z')) {
    throw new SDKErrors.DidError(`invalid format for '${publicKeyMultibase}'`)
  }
  publicKeyMultibase.slice(1)
  const decodedMulticodecPublicKey = base58Decode(publicKeyMultibase)
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
 * @param keypair.type The keypair {@link DidVerificationMethodType}.
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

  const encodedPublicKey = base58Encode(Uint8Array.from(multiCodecPublicKey))

  return `z${encodedPublicKey}`
}

/**
 * Convert a DID key to a `MultiKey` verification method.
 *
 * @param controller The verification method controller's DID.
 * @param id The verification method ID.
 * @param key The DID key to export as a verification method.
 * @param key.keyType The key type.
 * @param key.publicKey The public component of the key.
 * @returns The provided key encoded as a {@link VerificationMethod}.
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

  const encodedPublicKey = base58Encode(Uint8Array.from(multiCodecPublicKey))
  const prefixedEncodedPublicKey = `z${encodedPublicKey}`

  return {
    controller,
    id,
    type: 'Multikey',
    publicKeyMultibase: prefixedEncodedPublicKey as `z${string}`,
  }
}

/**
 * Returns true if both didA and didB refer to the same DID subject, i.e., whether they have the same identifier as specified in the method spec.
 *
 * @param didA A KILT DID  as a string.
 * @param didB A second KILT DID  as a string.
 * @returns Whether didA and didB refer to the same DID subject.
 */
export function isSameSubject(didA: Did, didB: Did): boolean {
  return parse(didA).address === parse(didB).address
}

/**
 * Checks that a string (or other input) is a valid KILT DID with or without a trailing fragment.
 * Throws otherwise.
 *
 * @param input Arbitrary input.
 * @param expectType `Did` if the the input is expected to have a fragment (following '#'), `DidUrl` if it is expected not to have one. Default allows both.
 */
export function validateDid(
  input: unknown,
  expectType?: 'Did' | 'DidUrl'
): void {
  if (typeof input !== 'string') {
    throw new TypeError(`DID string expected, got ${typeof input}`)
  }
  const { address, fragment, type } = parse(input as DidUrl)

  if (
    fragment &&
    (expectType === 'Did' ||
      // for backwards compatibility with previous implementations, `false` maps to `Did` while `true` maps to `undefined`.
      (typeof expectType === 'boolean' && expectType === false))
  ) {
    throw new SDKErrors.DidError(
      'Expected a Kilt Did but got a DidUrl (containing a #fragment)'
    )
  }

  if (!fragment && expectType === 'DidUrl') {
    throw new SDKErrors.DidError(
      'Expected a Kilt DidUrl (containing a #fragment) but got a Did'
    )
  }

  DataUtils.verifyKiltAddress(address)

  // Check if the encoded details represent something that can be decoded, or just random jargon, in which case the DID is not really a valid one.
  if (type === 'light') {
    try {
      parseDocumentFromLightDid(input as Did, false)
    } catch {
      throw new SDKErrors.DidError(
        `The provided light DID "${input}" contains incorrect base58-encoded details.`
      )
    }
  }
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
 * Builds the full DID a light DID will have after it’s stored on the blockchain.
 *
 * @param didOrAddress The light DID. Internally it’s used with the DID "address" as well.
 * @param version The version of the DID to use.
 * @returns The expected full DID.
 */
export function getFullDid(
  didOrAddress: Did | KiltAddress,
  version = FULL_DID_LATEST_VERSION
): Did {
  const address = DataUtils.isKiltAddress(didOrAddress)
    ? didOrAddress
    : parse(didOrAddress as Did).address
  const versionString = version === 1 ? '' : `v${version}`
  return `did:kilt:${versionString}${address}` as Did
}

/**
 * Builds the  of a full DID if it is created with the authentication verification method derived from the provided public key.
 *
 * @param verificationMethod The DID verification method.
 * @returns The expected full DID.
 */
export function getFullDidFromVerificationMethod(
  verificationMethod: Pick<VerificationMethod, 'publicKeyMultibase'>
): Did {
  const address = getAddressFromVerificationMethod(verificationMethod)
  return getFullDid(address)
}
