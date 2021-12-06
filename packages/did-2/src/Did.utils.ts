/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { IDidDetails } from '@kiltprotocol/types'
import { SDKErrors } from '@kiltprotocol/utils'
import { checkAddress } from '@polkadot/util-crypto'
import type { IDidParsingResult } from './types'

export const KILT_DID_PREFIX = 'did:kilt:'

// Matches the following full DIDs
// - did:kilt:<kilt_address>
// - did:kilt:<kilt_address>#<fragment>
export const FULL_KILT_DID_REGEX =
  /^did:kilt:(?<identifier>4[1-9a-km-zA-HJ-NP-Z]{47})(?<fragment>#[^#\n]+)?$/

// Matches the following light DIDs
// - did:kilt:light:00<kilt_address>
// - did:kilt:light:01<kilt_address>:<encoded_details>
// - did:kilt:light:10<kilt_address>#<fragment>
// - did:kilt:light:99<kilt_address>:<encoded_details>#<fragment>
export const LIGHT_KILT_DID_REGEX =
  /^did:kilt:light:(?<auth_key_type>[0-9]{2})(?<identifier>4[1-9a-km-zA-HJ-NP-Z]{47,48})(?<encoded_details>:.+?)?(?<fragment>#[^#\n]+)?$/

// TODO: add parameter about key encoding
function getLightDidFromIdentifier(identifier: string, didVersion = 1): string {
  const versionString = didVersion === 1 ? '' : `:v${didVersion}`
  return KILT_DID_PREFIX.concat(`light${versionString}:${identifier}`)
}

function getFullDidFromIdentifier(identifier: string, didVersion = 1): string {
  const versionString = didVersion === 1 ? '' : `v${didVersion}:`
  return KILT_DID_PREFIX.concat(`${versionString}${identifier}`)
}

export function getKiltDidFromIdentifier(
  identifier: string,
  didType: 'full' | 'light',
  didVersion = 1
): string {
  if (identifier.startsWith(KILT_DID_PREFIX)) {
    if (
      FULL_KILT_DID_REGEX.exec(identifier) ||
      LIGHT_KILT_DID_REGEX.exec(identifier)
    ) {
      return identifier
    }
    throw SDKErrors.ERROR_INVALID_DID_FORMAT
  }

  switch (didType) {
    case 'full':
      return getFullDidFromIdentifier(identifier, didVersion)
    case 'light':
      return getLightDidFromIdentifier(identifier, didVersion)
    default:
      throw SDKErrors.ERROR_UNSUPPORTED_DID(didType)
  }
}

export function parseDidUrl(didUrl: string): IDidParsingResult {
  let matches = FULL_KILT_DID_REGEX.exec(didUrl)?.groups
  if (matches && matches.identifier) {
    const version = matches.version ? parseInt(matches.version, 10) : 1
    return {
      did: getKiltDidFromIdentifier(matches.identifier, 'full', version),
      version,
      type: 'full',
      identifier: matches.identifier,
      fragment: matches.fragment?.substring(1),
    }
  }

  // If it fails to parse full DID, try with light DID
  matches = LIGHT_KILT_DID_REGEX.exec(didUrl)?.groups
  if (matches && matches.identifier && matches.auth_key_type) {
    const version = matches.version ? parseInt(matches.version, 10) : 1
    const lightDidIdentifier = matches.auth_key_type.concat(matches.identifier)
    return {
      did: getKiltDidFromIdentifier(lightDidIdentifier, 'light', version),
      version,
      type: 'light',
      identifier: matches.auth_key_type.concat(matches.identifier),
      fragment: matches.fragment?.substring(1),
      encodedDetails: matches.encoded_details?.substring(1),
    }
  }

  throw SDKErrors.ERROR_INVALID_DID_FORMAT(didUrl)
}

export function validateKiltDid(
  input: unknown,
  allowFragment = false
): input is IDidDetails['did'] {
  if (typeof input !== 'string') {
    throw TypeError(`DID string expected, got ${typeof input}`)
  }
  const { identifier, type, fragment } = parseDidUrl(input)
  if (!allowFragment && fragment) {
    throw SDKErrors.ERROR_INVALID_DID_FORMAT(input)
  }

  switch (type) {
    case 'full':
      if (!checkAddress(identifier, 38)[0]) {
        throw SDKErrors.ERROR_ADDRESS_INVALID(identifier, 'DID identifier')
      }
      break
    case 'light':
      // Identifier includes the first two characters for the key type encoding
      if (!checkAddress(identifier.substring(2), 38)[0]) {
        throw SDKErrors.ERROR_ADDRESS_INVALID(identifier, 'DID identifier')
      }
      break
    default:
      throw SDKErrors.ERROR_UNSUPPORTED_DID(input)
  }
  return true
}
