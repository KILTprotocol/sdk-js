/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { KiltAddress } from '@kiltprotocol/types'
import { checkAddress } from '@polkadot/util-crypto'
import * as SDKErrors from './SDKErrors.js'
import { ss58Format } from './ss58Format.js'

/**
 * Verifies a given address string against the External Address Format (SS58) with our Prefix of 38.
 *
 * @param input Address string to validate for correct Format.
 */
export function verifyKiltAddress(input: unknown): void {
  if (typeof input !== 'string') {
    throw new SDKErrors.AddressTypeError()
  }
  if (!checkAddress(input, ss58Format)[0]) {
    throw new SDKErrors.AddressInvalidError(input)
  }
}

/**
 * Type guard to check whether input is an SS58 address with our prefix of 38.
 *
 * @param input Address string to validate for correct format.
 * @returns True if input is a KiltAddress, false otherwise.
 */
export function isKiltAddress(input: unknown): input is KiltAddress {
  try {
    verifyKiltAddress(input)
    return true
  } catch {
    return false
  }
}

/**
 * Validates the format of a hex string via regex.
 *
 * @param input Hex string to validate for correct format.
 * @param byteLength Expected length of hex in bytes. Defaults to 32.
 * @param prefixed Whether the hex string is expected to be prefixed with '0x'. Defaults to true.
 */
export function verifyIsHex(
  input: unknown,
  byteLength = 32,
  prefixed = true
): void {
  if (typeof input !== 'string') {
    throw new SDKErrors.HashTypeError()
  }
  const hexStringPattern = new RegExp(
    `^${prefixed ? '0x' : ''}[A-F0-9]{${Math.round(byteLength) * 2}}$`,
    'i'
  )
  if (!input.match(hexStringPattern)) {
    throw new SDKErrors.HashMalformedError(input)
  }
}
