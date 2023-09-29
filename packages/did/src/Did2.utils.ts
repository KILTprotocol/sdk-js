/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { blake2AsU8a, encodeAddress } from '@polkadot/util-crypto'
import { DataUtils, SDKErrors, ss58Format } from '@kiltprotocol/utils'

import type { DidDocumentV2, KiltAddress } from '@kiltprotocol/types'

import type { VerificationKeyType } from './DidDetailsv2/DidDetailsV2.js'

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
    fragment &&
    (expectType === 'Did' ||
      // for backwards compatibility with previous implementations, `false` maps to `Did` while `true` maps to `undefined`.
      (typeof expectType === 'boolean' && expectType === false))
  ) {
    throw new SDKErrors.DidError(
      'Expected a Kilt DidUri but got a DidResourceUri (containing a #fragment)'
    )
  }

  if (!fragment && expectType === 'ResourceUri') {
    throw new SDKErrors.DidError(
      'Expected a Kilt DidResourceUri (containing a #fragment) but got a DidUri'
    )
  }

  DataUtils.verifyKiltAddress(address)
}

/**
 * Internal: derive the address part of the DID when it is created from authentication key.
 *
 * @param input The authentication key.
 * @param input.publicKey The public key.
 * @param input.type The type of the key.
 * @returns The expected address of the DID.
 */
export function getAddressByKey({
  publicKey,
  type,
}: {
  publicKey: Uint8Array
  type: VerificationKeyType
}): KiltAddress {
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
 * @param key The key that will be used as DID authentication key.
 * @param key.publicKey The public key.
 * @param key.type The type of the key.
 * @returns The expected full DID URI.
 */
export function getFullDidUriFromKey(key: {
  publicKey: Uint8Array
  type: VerificationKeyType
}): DidDocumentV2.DidUri {
  const address = getAddressByKey(key)
  return getFullDidUri(address)
}
