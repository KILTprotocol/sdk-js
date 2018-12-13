import { default as naclSign } from '@polkadot/util-crypto/nacl/sign'
import { default as naclVerify } from '@polkadot/util-crypto/nacl/verify'
import { default as naclEncrypt } from '@polkadot/util-crypto/nacl/encrypt'
import { default as naclDecrypt } from '@polkadot/util-crypto/nacl/decrypt'
import { default as keccakAsU8a } from '@polkadot/util-crypto/keccak/asU8a'

export type Encrypted = {
  encrypted: Uint8Array;
  nonce: Uint8Array;
}

export default class Crypto {

  private constructor () { }

  public static sign (message: Uint8Array, secretKey: Uint8Array): Uint8Array {
    return naclSign(message, secretKey)
  }

  public static verify (message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): boolean {
    return naclVerify(message, signature, publicKey)
  }

  public static encrypt (message: Uint8Array, secret: Uint8Array, nonce?: Uint8Array): Encrypted {
    return naclEncrypt(message, secret, nonce)
  }

  public static decrypt (encrypted: Uint8Array, nonce: Uint8Array, secret: Uint8Array): Uint8Array | null {
    return naclDecrypt(encrypted, nonce, secret)
  }

  public static hash (value: Buffer | Uint8Array | string): Uint8Array {
    return keccakAsU8a(value)
  }
}
