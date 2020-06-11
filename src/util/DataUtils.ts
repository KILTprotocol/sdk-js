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
import { PublicIdentity } from '..'

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
    throw new Error('Address not of type string')
  }
  if (!checkAddress(address, 42)[0]) {
    throw new Error(`Provided ${name} address invalid \n
    Address: ${address}`)
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
    throw new Error('Hash not of type string')
  }
  const blake2bPattern = new RegExp('(0x)[A-F0-9]{64}', 'i')
  if (!hash.match(blake2bPattern)) {
    throw new Error(`Provided ${name} hash invalid or malformed \n
    Hash: ${hash}`)
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
    throw new Error('Nonce Hash incomplete')
  }
  validateHash(nonceHash.hash, name)
  if (
    nonceHash.nonce &&
    nonceHash.hash !== hashObjectAsStr(data, nonceHash.nonce)
  ) {
    throw new Error(`Provided ${name} hash not corresponding to data \n
    Hash: ${nonceHash.hash} \n
    Nonce: ${nonceHash.nonce}`)
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
      throw new Error(`Provided Legitimations not verifiable`)
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
    throw new Error('data, signature or signer not of type string')
  }
  if (!verify(data, signature, signer)) {
    throw new Error(`Provided signature invalid`)
  }
  return true
}
