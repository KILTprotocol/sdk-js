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
import Identity from '../identity/Identity'
import AttestedClaim from '../attestedclaim/AttestedClaim'
import { hashObjectAsStr, verify } from '../crypto/Crypto'

export function validateAddress(
  address: Identity['address'],
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

export function validateHash(input: string, name: string): boolean {
  if (typeof input !== 'string') {
    throw new Error('Hash not of type string')
  }
  const blake2bPattern = new RegExp('(0x)[A-F0-9]{64}', 'i')
  if (!input.match(blake2bPattern)) {
    throw new Error(`Provided ${name} hash invalid or malformed \n
    Hash: ${input}`)
  }
  return true
}

export function validateNoncedHash(
  nonceHash: NonceHash,
  data: string | object,
  name: string
): boolean {
  if (!nonceHash || !nonceHash.hash || typeof nonceHash.hash !== 'string') {
    throw new Error('Nonce Hash incomplete')
  }
  const blake2bPattern = new RegExp('(0x)[A-F0-9]{64}', 'i')
  if (!nonceHash.hash.match(blake2bPattern)) {
    throw new Error(`Provided ${name} hash malformed \n
    Hash: ${nonceHash.hash} \n
    Nonce: ${nonceHash.nonce}`)
  }
  if (nonceHash.hash !== hashObjectAsStr(data, nonceHash.nonce)) {
    throw new Error(`Provided ${name} hash not corresponding to data \n
    Hash: ${nonceHash.hash} \n
    Nonce: ${nonceHash.nonce}`)
  }
  return true
}

export function validateLegitimations(
  legitimations: IAttestedClaim[]
): boolean {
  legitimations.forEach((legitimation: IAttestedClaim) => {
    // Use AttestedClaim.verify which requires quirying the chain or only verifyData?
    if (!AttestedClaim.verifyData(legitimation)) {
      throw new Error(`Provided Legitimations not verifiable`)
    }
  })
  return true
}

export function validateSignature(
  data: string,
  signature: string,
  signer: Identity['address']
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
