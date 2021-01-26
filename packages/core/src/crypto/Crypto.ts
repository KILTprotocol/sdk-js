/**
 * Crypto provides KILT with the utility types and methods useful for cryptographic operations, such as signing/verifying, encrypting/decrypting and hashing.
 *
 * The utility types and methods are wrappers for existing Polkadot functions and imported throughout KILT's protocol for various cryptographic needs.
 *
 * @packageDocumentation
 * @module Crypto
 * @preferred
 */

import { decodeAddress, encodeAddress } from '@polkadot/keyring'
import { KeyringPair } from '@polkadot/keyring/types'
import {
  isString,
  stringToU8a,
  u8aConcat,
  u8aToHex,
  u8aToString,
  u8aToU8a,
} from '@polkadot/util'
import { blake2AsHex, signatureVerify } from '@polkadot/util-crypto'
import { blake2AsU8a } from '@polkadot/util-crypto/blake2/asU8a'
import { naclDecrypt } from '@polkadot/util-crypto/nacl/decrypt'
import { naclEncrypt } from '@polkadot/util-crypto/nacl/encrypt'
import nacl from 'tweetnacl'
import { v4 as uuid } from 'uuid'
import jsonabc from '../util/jsonabc'

export { encodeAddress, decodeAddress, u8aToHex, u8aConcat }

export type CryptoInput = Buffer | Uint8Array | string

export type Address = string

export type EncryptedSymmetric = {
  encrypted: Uint8Array
  nonce: Uint8Array
}

export type EncryptedAsymmetric = {
  box: Uint8Array
  nonce: Uint8Array
}

export type EncryptedSymmetricString = {
  encrypted: string
  nonce: string
}

export type EncryptedAsymmetricString = {
  box: string
  nonce: string
}

export function coToUInt8(
  input: CryptoInput,
  rawConvert?: boolean
): Uint8Array {
  if (rawConvert && isString(input)) {
    return stringToU8a(input)
  }
  return u8aToU8a(input)
}

export function sign(
  message: CryptoInput,
  signKeyPair: KeyringPair
): Uint8Array {
  return signKeyPair.sign(coToUInt8(message), { withType: true })
}

export function signStr(
  message: CryptoInput,
  signKeyPair: KeyringPair
): string {
  return u8aToHex(sign(message, signKeyPair))
}

export function verify(
  message: CryptoInput,
  signature: CryptoInput,
  address: Address
): boolean {
  return signatureVerify(message, signature, address).isValid === true
}

export function encryptSymmetric(
  message: CryptoInput,
  secret: CryptoInput,
  nonce?: CryptoInput
): EncryptedSymmetric {
  return naclEncrypt(
    coToUInt8(message, true),
    coToUInt8(secret),
    nonce ? coToUInt8(nonce) : undefined
  )
}

export function encryptSymmetricAsStr(
  message: CryptoInput,
  secret: CryptoInput,
  inputNonce?: CryptoInput
): EncryptedSymmetricString {
  const result = naclEncrypt(
    coToUInt8(message, true),
    coToUInt8(secret),
    inputNonce ? coToUInt8(inputNonce) : undefined
  )
  const nonce: string = u8aToHex(result.nonce)
  const encrypted: string = u8aToHex(result.encrypted)
  return { encrypted, nonce }
}

export function decryptSymmetric(
  data: EncryptedSymmetric | EncryptedSymmetricString,
  secret: CryptoInput
): Uint8Array | null {
  return naclDecrypt(
    coToUInt8(data.encrypted),
    coToUInt8(data.nonce),
    coToUInt8(secret)
  )
}

export function decryptSymmetricStr(
  data: EncryptedSymmetric | EncryptedSymmetricString,
  secret: CryptoInput
): string | null {
  const result = naclDecrypt(
    coToUInt8(data.encrypted),
    coToUInt8(data.nonce),
    coToUInt8(secret)
  )
  return result ? u8aToString(result) : null
}

export function hash(value: CryptoInput, bitLength?: number): Uint8Array {
  return blake2AsU8a(value, bitLength)
}

export function hashStr(value: CryptoInput): string {
  return u8aToHex(hash(value))
}

export function hashObjectAsStr(
  value: Record<string, any> | string | number | boolean,
  nonce?: string
): string {
  let input =
    // eslint-disable-next-line no-nested-ternary
    typeof value === 'object' && value !== null
      ? JSON.stringify(jsonabc.sortObj(value))
      : // eslint-disable-next-line no-nested-ternary
      typeof value === 'number' && value !== null
      ? value.toString()
      : typeof value === 'boolean' && value !== null
      ? JSON.stringify(value)
      : value
  if (nonce) {
    input = nonce + input
  }
  return hashStr(input)
}

export function encryptAsymmetric(
  message: CryptoInput,
  publicKeyA: CryptoInput,
  secretKeyB: CryptoInput
): EncryptedAsymmetric {
  const nonce = nacl.randomBytes(24)
  const box = nacl.box(
    coToUInt8(message, true),
    nonce,
    coToUInt8(publicKeyA),
    coToUInt8(secretKeyB)
  )
  return { box, nonce }
}

export function encryptAsymmetricAsStr(
  message: CryptoInput,
  publicKeyA: CryptoInput,
  secretKeyB: CryptoInput
): EncryptedAsymmetricString {
  const encrypted = encryptAsymmetric(message, publicKeyA, secretKeyB)
  const box: string = u8aToHex(encrypted.box)
  const nonce: string = u8aToHex(encrypted.nonce)
  return { box, nonce }
}

export function decryptAsymmetric(
  data: EncryptedAsymmetric | EncryptedAsymmetricString,
  publicKeyB: CryptoInput,
  secretKeyA: CryptoInput
): Uint8Array | false {
  const decrypted = nacl.box.open(
    coToUInt8(data.box),
    coToUInt8(data.nonce),
    coToUInt8(publicKeyB),
    coToUInt8(secretKeyA)
  )
  return decrypted || false
}

export function decryptAsymmetricAsStr(
  data: EncryptedAsymmetric | EncryptedAsymmetricString,
  publicKeyB: CryptoInput,
  secretKeyA: CryptoInput
): string | false {
  const result = decryptAsymmetric(
    data,
    coToUInt8(publicKeyB),
    coToUInt8(secretKeyA)
  )
  return result ? u8aToString(result) : false
}

export interface Hasher {
  (value: string, nonce?: string): string
}

export interface HashingOptions {
  nonces?: Record<string, string>
  nonceGenerator?: (key: string) => string
  hasher?: Hasher
}

export const saltedBlake2b256: Hasher = (value, nonce) =>
  blake2AsHex((nonce || '') + value, 256)

/**
 * Configurable computation of salted over an array of statements. Can be used to validate/reproduce salted hashes
 * by means of an optional nonce map.
 *
 * @param statements An array of statement strings to be hashed.
 * @param options Optional hasher arguments.
 * @param options.nonces An optional map or array of nonces. If present, it should comprise all keys of `statements`, as those will be used map nonces to statements.
 * @param options.nonceGenerator An optional nonce generator. Will be used if `options.nonces` is not defined to generate a (new) nonce for each statement. The statement key is passed as its first argument. If no `nonces` or `nonceGenerator` are given this function returns unsalted hashes.
 * @param options.hasher The hasher to be used. Computes a hash from a statement and an optional nonce. Required but defaults to 256 bit blake2 over `${nonce}${statement}`.
 * @returns An array of objects for each statement which contain a statement, its digest, salted hash and nonce.
 */
export function hashStatements(
  statements: string[],
  options: HashingOptions = {}
): Array<{
  digest: string
  statement: string
  saltedHash: string
  nonce: string
}> {
  // apply defaults
  const defaults = {
    hasher: saltedBlake2b256,
    nonceGenerator: () => uuid(),
  }
  const hasher = options.hasher || defaults.hasher
  const nonceGenerator = options.nonceGenerator || defaults.nonceGenerator
  // set source for nonces
  const { nonces } = options
  const getNonce: HashingOptions['nonceGenerator'] =
    typeof nonces === 'object' ? (key) => nonces[key] : nonceGenerator
  // iterate over statements to produce salted hashes
  return statements.map((statement) => {
    // generate unsalted digests from statements as a first step
    const digest = hasher(statement)
    // if nonces were passed, they would be mapped to the statement via its digest
    const nonce = getNonce(digest)
    // to simplify validation, the salted hash is computed over unsalted hash (nonce key) & nonce
    const saltedHash = hasher(digest, nonce)
    return { digest, saltedHash, nonce, statement }
  })
}
