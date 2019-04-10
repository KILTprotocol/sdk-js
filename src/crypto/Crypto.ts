/**
 * @module Crypto
 */
import { decodeAddress, encodeAddress } from '@polkadot/keyring/address'
import {
  isString,
  stringToU8a,
  u8aConcat,
  u8aToHex,
  u8aToString,
  u8aToU8a,
} from '@polkadot/util'
import blake2AsU8a from '@polkadot/util-crypto/blake2/asU8a'
import { default as naclDecrypt } from '@polkadot/util-crypto/nacl/decrypt'
import { default as naclEncrypt } from '@polkadot/util-crypto/nacl/encrypt'
import { default as naclSign } from '@polkadot/util-crypto/nacl/sign'
import { default as naclVerify } from '@polkadot/util-crypto/nacl/verify'
import nacl, { SignKeyPair } from 'tweetnacl'

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
  signKeyPair: SignKeyPair
): Uint8Array {
  const { secretKey, publicKey } = signKeyPair
  return naclSign(coToUInt8(message), {
    secretKey: coToUInt8(secretKey),
    publicKey: coToUInt8(publicKey),
  })
}

export function signStr(
  message: CryptoInput,
  signKeyPair: SignKeyPair
): string {
  const { secretKey, publicKey } = signKeyPair
  return u8aToHex(
    naclSign(coToUInt8(message), {
      secretKey: coToUInt8(secretKey),
      publicKey: coToUInt8(publicKey),
    })
  )
}

export function verify(
  message: CryptoInput,
  signature: CryptoInput,
  address: Address
): boolean {
  const publicKey = decodeAddress(address)
  return naclVerify(
    coToUInt8(message),
    coToUInt8(signature),
    coToUInt8(publicKey)
  )
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
