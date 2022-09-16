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
 * Validates a given address string against the External Address Format (SS58) with our Prefix of 38.
 *
 * @param input Address string to validate for correct Format.
 * @param name Contextual name of the address, e.g. "claim owner".
 */
export function validateAddress(input: unknown, name?: string): void {
  if (typeof input !== 'string') {
    throw new SDKErrors.AddressTypeError()
  }
  if (!checkAddress(input, ss58Format)[0]) {
    throw new SDKErrors.AddressInvalidError(input, name)
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
    validateAddress(input)
    return true
  } catch {
    return false
  }
}

/**
 * Validates the format of the given blake2b hash via regex.
 *
 * @param hash Hash string to validate for correct Format.
 * @param name Contextual name of the address, e.g. "claim owner".
 */
export function validateHash(hash: string, name: string): void {
  if (typeof hash !== 'string') {
    throw new SDKErrors.HashTypeError()
  }
  const blake2bPattern = new RegExp('(0x)[A-F0-9]{64}', 'i')
  if (!hash.match(blake2bPattern)) {
    throw new SDKErrors.HashMalformedError(hash, name)
  }
}
