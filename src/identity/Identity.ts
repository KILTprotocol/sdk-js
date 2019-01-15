/**
 * @module Identity
 */
import pair from '@polkadot/keyring/pair'
import { KeyringPair } from '@polkadot/keyring/types'
import generate from '@polkadot/util-crypto/mnemonic/generate'
import toSeed from '@polkadot/util-crypto/mnemonic/toSeed'
import validate from '@polkadot/util-crypto/mnemonic/validate'
import * as stringUtil from '@polkadot/util/string'
import * as u8aUtil from '@polkadot/util/u8a'
import padEnd from 'lodash/padEnd'
// see node_modules/@polkadot/util-crypto/nacl/keypair/fromSeed.js
// as util-crypto is providing a wrapper only for signing keypair
// and not for box keypair, we use TweetNaCl directly
import nacl, { BoxKeyPair, SignKeyPair } from 'tweetnacl'
import Crypto from '../crypto'

export default class Identity {
  get phrase(): string | undefined {
    return this._phrase
  }

  get address(): string {
    return this._address
  }

  get signKeyPair(): SignKeyPair {
    return this._signKeyPair
  }

  get signKeyringPair(): KeyringPair {
    return this._signKeyringPair
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

  get signPublicKeyAsHex(): string {
    return u8aUtil.u8aToHex(this._signKeyPair.publicKey)
  }

  get signSecretKeyAsHex(): string {
    return u8aUtil.u8aToHex(this._signKeyPair.secretKey)
  }

  get boxPublicKeyAsHex(): string {
    return u8aUtil.u8aToHex(this._boxKeyPair.publicKey)
  }

  get boxSecretKeyAsHex(): string {
    return u8aUtil.u8aToHex(this._boxKeyPair.secretKey)
  }

  public static buildFromMnemonic(phraseArg?: string) {
    let phrase = phraseArg
    if (phrase) {
      if (phrase.trim().split(/\s+/g).length < 12) {
        // https://www.npmjs.com/package/bip39
        throw Error(`Phrase '${phrase}' too long or malformed`)
      }
    } else {
      phrase = generate()
    }

    if (!validate(phrase)) {
      throw Error(`Invalid phrase '${phrase}'`)
    }

    const seed = toSeed(phrase)
    return new Identity(seed, phrase)
  }

  public static buildFromSeedString(seedArg: string) {
    const padded = padEnd(seedArg, 32, ' ')
    const asU8a = stringUtil.stringToU8a(padded)
    return new Identity(asU8a)
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

  private _phrase?: string
  private _address: string
  private _signKeyPair: SignKeyPair
  private _signKeyringPair: KeyringPair
  private _boxKeyPair: BoxKeyPair
  private _seed: Uint8Array
  private _seedAsHex: string

  private constructor(seed: Uint8Array, phrase?: string) {
    this._phrase = phrase
    this._seed = seed
    this._seedAsHex = u8aUtil.u8aToHex(this._seed)

    // NB: use different secret keys for each key pair in order to avoid
    // compromising both key pairs at the same time if one key becomes public
    // Maybe use BIP32 and BIP44
    this._signKeyPair = Identity.createSignKeyPair(this._seed)
    this._signKeyringPair = pair({
      publicKey: this._signKeyPair.publicKey,
      secretKey: this._signKeyPair.secretKey,
    })

    this._address = this._signKeyringPair.address()

    this._boxKeyPair = Identity.createBoxKeyPair(this._seed)
  }
}
