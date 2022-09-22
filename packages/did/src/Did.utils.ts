/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { blake2AsU8a, encodeAddress } from '@polkadot/util-crypto'

import {
  DidResourceUri,
  DidUri,
  DidVerificationKey,
  EncryptionAlgorithms,
  EncryptionKeyType,
  KiltAddress,
  UriFragment,
} from '@kiltprotocol/types'
import { DataUtils, SDKErrors, ss58Format } from '@kiltprotocol/utils'

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
export function parse(didUri: DidUri | DidResourceUri): IDidParsingResult {
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
  return parse(didA).address === parse(didB).address
}

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
export function validateUri(
  input: unknown,
  expectType?: 'Did' | 'ResourceUri'
): void {
  if (typeof input !== 'string') {
    throw new TypeError(`DID string expected, got ${typeof input}`)
  }
  const { address, fragment } = parse(input as DidUri)
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

  DataUtils.verifyKiltAddress(address)
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
  const address = DataUtils.isKiltAddress(didOrAddress)
    ? didOrAddress
    : parse(didOrAddress as DidUri).address
  const versionString = version === 1 ? '' : `v${version}`
  return `did:kilt:${versionString}${address}` as DidUri
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
