/**
 * Crypto provides KILT with the utility types and methods useful for cryptographic operations, such as signing/verifying, encrypting/decrypting and hashing.
 * ***
 * The utility types and methods are wrappers for existing Polkadot functions and imported throughout KILT's protocol for various cryptographic needs.
 * @module Crypto
 * @preferred
 */

/**
 * Dummy comment needed for correct doc display, do not remove
 */
import { decodeAddress, encodeAddress } from '@polkadot/keyring'
import { KeyringPair } from '@polkadot/keyring/types'
import createPair from '@polkadot/keyring/pair'
import {
  isString,
  stringToU8a,
  u8aConcat,
  u8aToHex,
  u8aToString,
  u8aToU8a,
} from '@polkadot/util'
import blake2AsU8a from '@polkadot/util-crypto/blake2/asU8a'
import naclDecrypt from '@polkadot/util-crypto/nacl/decrypt'
import naclEncrypt from '@polkadot/util-crypto/nacl/encrypt'
import nacl from 'tweetnacl'
import * as jsonabc from 'jsonabc'

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
  return signKeyPair.sign(coToUInt8(message))
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
  const publicKey = decodeAddress(address)
  const keyringPair = createPair('ed25519', { publicKey })

  return keyringPair.verify(coToUInt8(message), coToUInt8(signature))
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
  value: object | string,
  nonce?: string
): string {
  let input =
    typeof value === 'object' && value !== null
      ? JSON.stringify(jsonabc.sortObj(value))
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
  return decrypted
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
