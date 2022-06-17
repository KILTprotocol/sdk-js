/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { IIdentity } from '@kiltprotocol/types'
import { checkAddress } from '@polkadot/util-crypto'
import * as SDKErrors from './SDKErrors.js'
import { verify } from './Crypto.js'

/**
 *  Validates an given address string against the External Address Format (SS58) with our Prefix of 38.
 *
 * @param address Address string to validate for correct Format.
 * @param name Contextual name of the address, e.g. "claim owner".
 * @throws [[ERROR_ADDRESS_TYPE]] when address not of type string or of invalid Format.
 *
 * @returns Boolean whether the given address string checks out against the Format.
 */
export function validateAddress(
  address: IIdentity['address'],
  name: string
): boolean {
  if (typeof address !== 'string') {
    throw new SDKErrors.ERROR_ADDRESS_TYPE()
  }
  // KILT has registered ss58 prefix 38
  if (!checkAddress(address, 38)[0]) {
    throw new SDKErrors.ERROR_ADDRESS_INVALID(address, name)
  }
  return true
}

/**
 *  Validates the format of the given blake2b hash via regex.
 *
 * @param hash Hash string to validate for correct Format.
 * @param name Contextual name of the address, e.g. "claim owner".
 * @throws [[ERROR_HASH_TYPE]] when hash not of type string or of invalid Format.
 *
 * @returns Boolean whether the given hash string checks out against the Format.
 */
export function validateHash(hash: string, name: string): boolean {
  if (typeof hash !== 'string') {
    throw new SDKErrors.ERROR_HASH_TYPE()
  }
  const blake2bPattern = new RegExp('(0x)[A-F0-9]{64}', 'i')
  if (!hash.match(blake2bPattern)) {
    throw new SDKErrors.ERROR_HASH_MALFORMED(hash, name)
  }
  return true
}

/**
 *  Validates the signature of the given signer address against the signed data.
 *
 * @param data The signed string of data.
 * @param signature The signature of the data to be validated.
 * @param signer Address of the signer identity.
 * @throws [[ERROR_SIGNATURE_DATA_TYPE]] when parameters are of invalid type.
 * @throws [[ERROR_SIGNATURE_UNVERIFIABLE]] when the signature could not be validated against the data.
 *
 * @returns Boolean whether the signature is valid for the given data.
 */
export function validateSignature(
  data: string,
  signature: string,
  signer: IIdentity['address']
): boolean {
  if (
    typeof data !== 'string' ||
    typeof signature !== 'string' ||
    typeof signer !== 'string'
  ) {
    throw new SDKErrors.ERROR_SIGNATURE_DATA_TYPE()
  }
  if (!verify(data, signature, signer)) {
    throw new SDKErrors.ERROR_SIGNATURE_UNVERIFIABLE()
  }
  return true
}
