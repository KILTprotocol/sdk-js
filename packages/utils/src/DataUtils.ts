/* eslint-disable import/prefer-default-export */
/**
 * @module DataUtils
 */

/**
 * Dummy comment needed for correct doc display, do not remove.
 */
import { SDKErrors } from '@kiltprotocol/errorhandling'
import { IPublicIdentity } from '@kiltprotocol/types'
import { checkAddress } from '@polkadot/util-crypto'
import { verify } from './Crypto'

/**
 *  Validates an given address string against the External Address Format (SS58) with our Prefix of 42.
 *
 * @param address Address string to validate for correct Format.
 * @param name Contextual name of the address, e.g. "claim owner".
 * @throws When address not of type string or of invalid Format.
 * @throws [[ERROR_ADDRESS_TYPE]].
 *
 * @returns Boolean whether the given address string checks out against the Format.
 */
export function validateAddress(
  address: IPublicIdentity['address'],
  name: string
): boolean {
  if (typeof address !== 'string') {
    throw SDKErrors.ERROR_ADDRESS_TYPE()
  }
  // KILT has registered ss58 prefix 38
  if (!checkAddress(address, 38)[0]) {
    throw SDKErrors.ERROR_ADDRESS_INVALID(address, name)
  }
  return true
}

/**
 *  Validates the format of the given blake2b hash via regex.
 *
 * @param hash Hash string to validate for correct Format.
 * @param name Contextual name of the address, e.g. "claim owner".
 * @throws When hash not of type string or of invalid Format.
 * @throws [[ERROR_HASH_TYPE]].
 *
 * @returns Boolean whether the given hash string checks out against the Format.
 */
export function validateHash(hash: string, name: string): boolean {
  if (typeof hash !== 'string') {
    throw SDKErrors.ERROR_HASH_TYPE()
  }
  const blake2bPattern = new RegExp('(0x)[A-F0-9]{64}', 'i')
  if (!hash.match(blake2bPattern)) {
    throw SDKErrors.ERROR_HASH_MALFORMED(hash, name)
  }
  return true
}

/**
 *  Validates the signature of the given signer address against the signed data.
 *
 * @param data The signed string of data.
 * @param signature The signature of the data to be validated.
 * @param signer Address of the signer identity.
 * @throws When parameters are of invalid type.
 * @throws When the signature could not be validated against the data.
 * @throws [[ERROR_SIGNATURE_DATA_TYPE]], [[ERROR_SIGNATURE_UNVERIFIABLE]].
 *
 * @returns Boolean whether the signature is valid for the given data.
 */
export function validateSignature(
  data: string,
  signature: string,
  signer: IPublicIdentity['address']
): boolean {
  if (
    typeof data !== 'string' ||
    typeof signature !== 'string' ||
    typeof signer !== 'string'
  ) {
    throw SDKErrors.ERROR_SIGNATURE_DATA_TYPE()
  }
  if (!verify(data, signature, signer)) {
    throw SDKErrors.ERROR_SIGNATURE_UNVERIFIABLE()
  }
  return true
}
