/**
 * @module SDK
 */
import { default as keccakAsU8a } from '@polkadot/util-crypto/keccak/asU8a'
import { default as naclDecrypt } from '@polkadot/util-crypto/nacl/decrypt'
import { default as naclEncrypt } from '@polkadot/util-crypto/nacl/encrypt'
import { default as naclSign } from '@polkadot/util-crypto/nacl/sign'
import { default as naclVerify } from '@polkadot/util-crypto/nacl/verify'
import nacl from 'tweetnacl'

export type EncryptedSymmetric = {
  encrypted: Uint8Array
  nonce: Uint8Array
}

export type EncryptedAsymmetric = {
  box: Uint8Array
  nonce: Uint8Array
}

export function sign(message: Uint8Array, secretKey: Uint8Array): Uint8Array {
  return naclSign(message, secretKey)
}

export function verify(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): boolean {
  return naclVerify(message, signature, publicKey)
}

export function encryptSymmetric(message: Uint8Array, secret: Uint8Array, nonce?: Uint8Array): EncryptedSymmetric {
  return naclEncrypt(message, secret, nonce)
}

export function decryptSymmetric(data: EncryptedSymmetric, secret: Uint8Array): Uint8Array | null {
  return naclDecrypt(data.encrypted, data.nonce, secret)
}

export function hash(value: Buffer | Uint8Array | string): Uint8Array {
  return keccakAsU8a(value)
}

export function encryptAsymmetric(message: Uint8Array, publicKeyA: Uint8Array, secretKeyB: Uint8Array): EncryptedAsymmetric {
  const nonce = nacl.randomBytes(24)
  const box = nacl.box(message, nonce, publicKeyA, secretKeyB)
  const encrypted = { box, nonce }
  return encrypted
}

export function decryptAsymmetric(data: EncryptedAsymmetric, publicKeyB: Uint8Array, secretKeyA: Uint8Array): Uint8Array | false {
  const decrypted = nacl.box.open(data.box, data.nonce, publicKeyB, secretKeyA)
  return decrypted
}