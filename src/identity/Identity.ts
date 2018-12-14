/**
 * @module SDK
 */
import * as mnemonic from '@polkadot/util-crypto/mnemonic'
import * as nacl from '@polkadot/util-crypto/nacl'
import { KeypairType } from '@polkadot/util-crypto/types'
import * as u8a from '@polkadot/util/u8a'

export default class Identity {
  private _phrase: string
  private _keyPair: KeypairType
  private _seed: Uint8Array
  private _seedAsHex: string

  constructor (phrase?: string) {
    if (phrase) {
      if (phrase.trim().split(/\s+/g).length < 12) {
        // https://www.npmjs.com/package/bip39
        throw Error(`Phrase '${phrase}' too long or malformed`)
      }
      this._phrase = phrase
    } else {
      this._phrase = mnemonic.mnemonicGenerate()
    }

    if (!mnemonic.mnemonicValidate(this._phrase)) {
      throw Error(`Invalid phrase '${this._phrase}'`)
    }

    this._seed = mnemonic.mnemonicToSeed(this._phrase)
    this._seedAsHex = u8a.u8aToHex(this._seed)
    this._keyPair = nacl.naclKeypairFromSeed(this._seed)
  }

  get phrase (): string {
    return this._phrase
  }

  get publicKey (): Uint8Array {
    return this._keyPair.publicKey
  }

  get secretKey (): Uint8Array {
    return this._keyPair.secretKey
  }

  get seed (): Uint8Array {
    return this._seed
  }

  get seedAsHex (): string {
    return this._seedAsHex
  }

  get publicKeyAsHex (): string {
    return u8a.u8aToHex(this._keyPair.publicKey)
  }
}
