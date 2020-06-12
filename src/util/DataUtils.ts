/* eslint-disable import/prefer-default-export */
/**
 * @module DataUtils
 */

/**
 * Dummy comment needed for correct doc display, do not remove.
 */
import { checkAddress } from '@polkadot/util-crypto'
import IAttestedClaim from '../types/AttestedClaim'
import { NonceHash } from '../types/RequestForAttestation'
import AttestedClaim from '../attestedclaim/AttestedClaim'
import { hashObjectAsStr, verify } from '../crypto/Crypto'
import PublicIdentity from '../identity/PublicIdentity'
import {
  ERROR_ADDRESS_INVALID,
  ERROR_ADDRESS_TYPE,
  ERROR_HASH_TYPE,
  ERROR_HASH_MALFORMED,
  ERROR_NONCE_HASH_MALFORMED,
  ERROR_NONCE_HASH_INVALID,
  ERROR_LEGITIMATIONS_UNVERIFIABLE,
  ERROR_SIGNATURE_DATA_TYPE,
  ERROR_SIGNATURE_UNVERIFIABLE,
} from '../errorhandling/ObjectErrors'

/**
 *  Validates an given address string against the External Address Format (SS58) with our Prefix of 42.
 *
 * @param address Address string to validate for correct Format.
 * @param name Contextual name of the address, e.g. "claim owner".
 * @throws When address not of type string or of invalid Format.
 *
 * @returns Boolean whether the given address string checks out against the Format.
 */
export function validateAddress(
  address: PublicIdentity['address'],
  name: string
): boolean {
  if (typeof address !== 'string') {
    throw ERROR_ADDRESS_TYPE
  }
  if (!checkAddress(address, 42)[0]) {
    throw ERROR_ADDRESS_INVALID(address, name)
  }
  return true
}

/**
 *  Validates the format of the given blake2b hash via regex.
 *
 * @param hash Hash string to validate for correct Format.
 * @param name Contextual name of the address, e.g. "claim owner".
 * @throws When hash not of type string or of invalid Format.
 *
 * @returns Boolean whether the given hash string checks out against the Format.
 */
export function validateHash(hash: string, name: string): boolean {
  if (typeof hash !== 'string') {
    throw ERROR_HASH_TYPE
  }
  const blake2bPattern = new RegExp('(0x)[A-F0-9]{64}', 'i')
  if (!hash.match(blake2bPattern)) {
    throw ERROR_HASH_MALFORMED(hash, name)
  }
  return true
}

/**
 *  Validates the format via regex and the data integrity of the given blake2b nonceHash.
 *
 * @param nonceHash NonceHash to validate for correct format and data integrity.
 * @param data String, object, number or boolean type data to verify the integrity.
 * @param name Contextual name of the address, e.g. "claim owner".
 * @throws When nonceHash is of wrong format or has incorrectly set properties.
 * @throws When the nonceHash does not validate against the given data.
 *
 * @returns Boolean whether the given NonceHash checks out against the Format and it's hashed data.
 */
export function validateNonceHash(
  nonceHash: NonceHash,
  data: string | object | number | boolean,
  name: string
): boolean {
  if (!nonceHash || typeof nonceHash.hash !== 'string') {
    throw ERROR_NONCE_HASH_MALFORMED
  }
  validateHash(nonceHash.hash, name)
  if (
    nonceHash.nonce &&
    nonceHash.hash !== hashObjectAsStr(data, nonceHash.nonce)
  ) {
    throw ERROR_NONCE_HASH_INVALID(nonceHash, name)
  }
  return true
}

/**
 *  Verifies the data of each element of the given Array of IAttestedClaims.
 *
 * @param legitimations Array of IAttestedClaims to validate.
 * @throws When one of the IAttestedClaims data is unable to be verified.
 *
 * @returns Boolean whether each element of the given Array of IAttestedClaims is verifiable.
 */
export function validateLegitimations(
  legitimations: IAttestedClaim[]
): boolean {
  legitimations.forEach((legitimation: IAttestedClaim) => {
    if (!AttestedClaim.verifyData(legitimation)) {
      throw ERROR_LEGITIMATIONS_UNVERIFIABLE
    }
  })
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
 *
 * @returns Boolean whether the signature is valid for the given data.
 */
export function validateSignature(
  data: string,
  signature: string,
  signer: PublicIdentity['address']
): boolean {
  if (
    typeof data !== 'string' ||
    typeof signature !== 'string' ||
    typeof signer !== 'string'
  ) {
    throw ERROR_SIGNATURE_DATA_TYPE
  }
  if (!verify(data, signature, signer)) {
    throw ERROR_SIGNATURE_UNVERIFIABLE
  }
  return true
}
