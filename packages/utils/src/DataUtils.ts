/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { isHex } from '@polkadot/util'
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

// re-exporting isHex
export { isHex } from '@polkadot/util'

/**
 * Validates the format of a hex string via regex.
 *
 * @param input Hex string to validate for correct format.
 * @param bitLength Expected length of hex in bits.
 */
export function verifyIsHex(input: unknown, bitLength?: number): void {
  if (!isHex(input, bitLength)) {
    throw new SDKErrors.HashMalformedError(
      typeof input === 'string' ? input : undefined
    )
  }
}
