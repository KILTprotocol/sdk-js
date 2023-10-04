/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { decode as multibaseDecode, encode as multibaseEncode } from 'multibase'

import { blake2AsU8a, encodeAddress } from '@polkadot/util-crypto'
import { DataUtils, SDKErrors, ss58Format } from '@kiltprotocol/utils'

import type {
  DidDocumentV2,
  KeyringPair,
  KiltAddress,
} from '@kiltprotocol/types'

import type { DidKeyType } from './DidDetailsv2/DidDetailsV2.js'

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
  did: DidDocumentV2.DidUri
  version: number
  type: 'light' | 'full'
  address: KiltAddress
  fragment?: DidDocumentV2.UriFragment
  authKeyTypeEncoding?: string
  encodedDetails?: string
}

/**
 * Parses a KILT DID uri and returns the information contained within in a structured form.
 *
 * @param didUri A KILT DID uri as a string.
 * @returns Object containing information extracted from the DID uri.
 */
export function parse(
  didUri: DidDocumentV2.DidUri | DidDocumentV2.DidResourceUri
): IDidParsingResult {
  let matches = FULL_KILT_DID_REGEX.exec(didUri)?.groups
  if (matches) {
    const { version: versionString, fragment } = matches
    const address = matches.address as KiltAddress
    const version = versionString
      ? parseInt(versionString, 10)
      : FULL_DID_LATEST_VERSION
    return {
      did: didUri.replace(fragment || '', '') as DidDocumentV2.DidUri,
      version,
      type: 'full',
      address,
      fragment:
        fragment === '#' ? undefined : (fragment as DidDocumentV2.UriFragment),
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
      did: didUri.replace(fragment || '', '') as DidDocumentV2.DidUri,
      version,
      type: 'light',
      address,
      fragment:
        fragment === '#' ? undefined : (fragment as DidDocumentV2.UriFragment),
      encodedDetails,
      authKeyTypeEncoding: authKeyType,
    }
  }

  throw new SDKErrors.InvalidDidFormatError(didUri)
}

type DecodedVerificationMethod = {
  publicKey: Uint8Array
  keyType: DidKeyType
}

const multicodecPrefixes: Record<number, [DidKeyType, number]> = {
  0xe7: ['ecdsa', 33],
  0xec: ['x25519', 32],
  0xed: ['ed25519', 32],
  0xef: ['sr25519', 32],
}
const multicodecReversePrefixes: Record<DidKeyType, number> = {
  ecdsa: 0xe7,
  ed25519: 0xed,
  sr25519: 0xef,
  x25519: 0xec,
}

/**
 * Decode a multibase, multicodec representation of a verification method into its fundamental components: the public key and the key type.
 *
 * @param publicKeyMultibase The verification method's public key multibase.
 * @returns The decoded public key and [DidKeyType].
 */
export function multibaseKeyToDidKey(
  publicKeyMultibase: DidDocumentV2.VerificationMethod['publicKeyMultibase']
): DecodedVerificationMethod {
  const decodedMulticodecPublicKey = multibaseDecode(publicKeyMultibase)
  const [keyTypeFlag, publicKey] = [
    decodedMulticodecPublicKey.subarray(0, 1)[0],
    decodedMulticodecPublicKey.subarray(1),
  ]
  const [keyType, expectedPublicKeyLength] = multicodecPrefixes[keyTypeFlag]
  if (keyType !== undefined && publicKey.length === expectedPublicKeyLength) {
    return {
      keyType,
      publicKey,
    }
  }
  // TODO: Change to proper error
  throw new Error('Invalid encoding of the verification method.')
}

export function keypairToMultibaseKey({
  type,
  publicKey,
}: Pick<KeyringPair, 'publicKey'> & {
  type: DidKeyType
}): DidDocumentV2.VerificationMethod['publicKeyMultibase'] {
  const multiCodecPublicKeyPrefix = multicodecReversePrefixes[type]
  if (multiCodecPublicKeyPrefix === undefined) {
    // TODO: Proper error
    throw new Error(`Invalid key type provided: ${type}.`)
  }
  const expectedPublicKeySize = multicodecPrefixes[multiCodecPublicKeyPrefix][1]
  if (publicKey.length !== expectedPublicKeySize) {
    // TODO: Proper error
    throw new Error(
      `Provided public key does not match the expected length: ${expectedPublicKeySize}.`
    )
  }
  const multiCodecPublicKey = [multiCodecPublicKeyPrefix, ...publicKey]
  return Buffer.from(
    multibaseEncode('base58btc', Buffer.from(multiCodecPublicKey))
  ).toString() as `z${string}`
}

export function didKeyToVerificationMethod(
  controller: DidDocumentV2.VerificationMethod['controller'],
  id: DidDocumentV2.VerificationMethod['id'],
  { keyType, publicKey }: DecodedVerificationMethod
): DidDocumentV2.VerificationMethod {
  const multiCodecPublicKeyPrefix = multicodecReversePrefixes[keyType]
  if (multiCodecPublicKeyPrefix === undefined) {
    // TODO: Proper error
    throw new Error(`Invalid key type provided: ${keyType}.`)
  }
  const expectedPublicKeySize = multicodecPrefixes[multiCodecPublicKeyPrefix][1]
  if (publicKey.length !== expectedPublicKeySize) {
    // TODO: Proper error
    throw new Error(
      `Provided public key does not match the expected length: ${expectedPublicKeySize}.`
    )
  }
  const multiCodecPublicKey = [multiCodecPublicKeyPrefix, ...publicKey]
  return {
    controller,
    id,
    type: 'MultiKey',
    publicKeyMultibase: Buffer.from(
      multibaseEncode('base58btc', Buffer.from(multiCodecPublicKey))
    ).toString() as `z${string}`,
  }
}

/**
 * Returns true if both didA and didB refer to the same DID subject, i.e., whether they have the same identifier as specified in the method spec.
 *
 * @param didA A KILT DID uri as a string.
 * @param didB A second KILT DID uri as a string.
 * @returns Whether didA and didB refer to the same DID subject.
 */
export function isSameSubject(
  didA: DidDocumentV2.DidUri,
  didB: DidDocumentV2.DidUri
): boolean {
  return parse(didA).address === parse(didB).address
}

/**
 * Checks that a string (or other input) is a valid KILT DID uri with or without a URI fragment.
 * Throws otherwise.
 *
 * @param input Arbitrary input.
 * @param expectType `ResourceUri` if the URI is expected to have a fragment (following '#'), `Did` if it is expected not to have one. Default allows both.
 */
export function validateUri(
  input: unknown,
  expectType?: 'Did' | 'ResourceUri'
): void {
  if (typeof input !== 'string') {
    throw new TypeError(`DID string expected, got ${typeof input}`)
  }
  const { address, fragment } = parse(input as DidDocumentV2.DidUri)

  if (
    fragment !== undefined &&
    (expectType === 'Did' ||
      // for backwards compatibility with previous implementations, `false` maps to `Did` while `true` maps to `undefined`.
      (typeof expectType === 'boolean' && expectType === false))
  ) {
    throw new SDKErrors.DidError(
      'Expected a Kilt DidUri but got a DidResourceUri (containing a #fragment)'
    )
  }

  if (fragment === undefined && expectType === 'ResourceUri') {
    throw new SDKErrors.DidError(
      'Expected a Kilt DidResourceUri (containing a #fragment) but got a DidUri'
    )
  }

  DataUtils.verifyKiltAddress(address)
}

// TODO: Fix JSDoc
export function getAddressFromVerificationMethod({
  publicKeyMultibase,
}: Pick<DidDocumentV2.VerificationMethod, 'publicKeyMultibase'>): KiltAddress {
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
  didOrAddress: DidDocumentV2.DidUri | KiltAddress,
  version = FULL_DID_LATEST_VERSION
): DidDocumentV2.DidUri {
  const address = DataUtils.isKiltAddress(didOrAddress)
    ? didOrAddress
    : parse(didOrAddress as DidDocumentV2.DidUri).address
  const versionString = version === 1 ? '' : `v${version}`
  return `did:kilt:${versionString}${address}` as DidDocumentV2.DidUri
}

/**
 * Builds the URI of a full DID if it is created with the authentication key provided.
 *
 * @param verificationMethod The DID verification method.
 * @returns The expected full DID URI.
 */
export function getFullDidUriFromVerificationMethod(
  verificationMethod: Pick<
    DidDocumentV2.VerificationMethod,
    'publicKeyMultibase'
  >
): DidDocumentV2.DidUri {
  const address = getAddressFromVerificationMethod(verificationMethod)
  return getFullDidUri(address)
}
