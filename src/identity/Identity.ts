/**
 * @module SDK
 */
import generate from '@polkadot/util-crypto/mnemonic/generate'
import toSeed from '@polkadot/util-crypto/mnemonic/toSeed'
import validate from '@polkadot/util-crypto/mnemonic/validate'
import * as u8a from '@polkadot/util/u8a'
// see node_modules/@polkadot/util-crypto/nacl/keypair/fromSeed.js
// as util-crypto is providing a wrapper only for signing keypair
// and not for box keypair, we use TweetNaCl directly
import nacl, { SignKeyPair, BoxKeyPair } from 'tweetnacl'
import * as Crypto from '../crypto/Crypto'

export default class Identity {
  get phrase(): string {
    return this._phrase
  }

  get signKeyPair(): SignKeyPair {
    return this._signKeyPair
  }

  get boxKeyPair(): BoxKeyPair {
    return this._boxKeyPair
  }

  get seed(): Uint8Array {
    return this._seed
  }

  get seedAsHex(): string {
    return this._seedAsHex
  }
  private static ADDITIONAL_ENTROPY_FOR_HASHING = new Uint8Array([1, 2, 3])

  // fromSeed is hashing its seed, therefore an independent secret key should be considered as derived
  private static createSignKeyPair(seed: Uint8Array) {
    return nacl.sign.keyPair.fromSeed(seed)
  }

  // As fromSeed() is not implemented here we do our own hashing in order to prohibit inferring the original seed from a secret key
  // To be sure that we don't generate the same hash by accidentally using the same hash algorithm we do some padding
  private static createBoxKeyPair(seed: Uint8Array) {
    const paddedSeed = new Uint8Array(
      seed.length + Identity.ADDITIONAL_ENTROPY_FOR_HASHING.length
    )
    paddedSeed.set(seed)
    paddedSeed.set(Identity.ADDITIONAL_ENTROPY_FOR_HASHING, seed.length)

    const hash = Crypto.hash(paddedSeed)
    return nacl.box.keyPair.fromSecretKey(hash)
  }

  private _phrase: string
  private _signKeyPair: SignKeyPair
  private _boxKeyPair: BoxKeyPair
  private _seed: Uint8Array
  private _seedAsHex: string

  constructor(phrase?: string) {
    if (phrase) {
      if (phrase.trim().split(/\s+/g).length < 12) {
        // https://www.npmjs.com/package/bip39
        throw Error(`Phrase '${phrase}' too long or malformed`)
      }
      this._phrase = phrase
    } else {
      this._phrase = generate()
    }

    if (!validate(this._phrase)) {
      throw Error(`Invalid phrase '${this._phrase}'`)
    }

    this._seed = toSeed(this._phrase)
    this._seedAsHex = u8a.u8aToHex(this._seed)

    // NB: use different secret keys for each key pair in order to avoid
    // compromising both key pairs at the same time if one key becomes public
    // Maybe use BIP32 and BIP44
    this._signKeyPair = Identity.createSignKeyPair(this._seed)
    this._boxKeyPair = Identity.createBoxKeyPair(this._seed)
  }
}
