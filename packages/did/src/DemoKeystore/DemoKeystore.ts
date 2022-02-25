/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { KeypairType } from '@polkadot/util-crypto/types'
import {
  randomAsU8a,
  cryptoWaitReady,
  naclBoxPairFromSecret,
  naclOpen,
  naclSeal,
  randomAsHex,
  blake2AsU8a,
  encodeAddress,
} from '@polkadot/util-crypto'
import { u8aEq } from '@polkadot/util'

import {
  KeyringPair,
  Keystore,
  KeystoreSigningData,
  NaclBoxCapable,
  RequestData,
  ResponseData,
} from '@kiltprotocol/types'
import { Crypto, Keyring, SDKErrors } from '@kiltprotocol/utils'

export enum SigningAlgorithms {
  Ed25519 = 'ed25519',
  Sr25519 = 'sr25519',
  EcdsaSecp256k1 = 'ecdsa-secp256k1',
}

export enum EncryptionAlgorithms {
  NaclBox = 'x25519-xsalsa20-poly1305',
}

const supportedAlgs = { ...EncryptionAlgorithms, ...SigningAlgorithms }

function signingSupported(alg: string): alg is SigningAlgorithms {
  return Object.values(SigningAlgorithms).some((i) => i === alg)
}
function encryptionSupported(alg: string): alg is EncryptionAlgorithms {
  return Object.values(EncryptionAlgorithms).some((i) => i === alg)
}

function encodeSigningPublicKeyToAddress(
  publicKey: Uint8Array,
  alg: SigningAlgorithms
): string {
  switch (alg) {
    case SigningAlgorithms.Ed25519:
    case SigningAlgorithms.Sr25519:
      return encodeAddress(publicKey, 38)
    case SigningAlgorithms.EcdsaSecp256k1: {
      // Taken from https://github.com/polkadot-js/common/blob/master/packages/keyring/src/pair/index.ts#L44
      const pk = publicKey.length > 32 ? blake2AsU8a(publicKey) : publicKey
      return encodeAddress(pk, 38)
    }
    default:
      throw SDKErrors.ERROR_KEYSTORE_ERROR(`Unsupport signing key alg ${alg}.`)
  }
}

export interface KeyGenOpts<T extends string> {
  alg: RequestData<T>['alg']
  seed?: string
}

export interface NaclKeypair {
  publicKey: Uint8Array
  secretKey: Uint8Array
}

export type KeyAddOpts<T extends string> = Pick<RequestData<T>, 'alg'> &
  NaclKeypair

const keypairTypeForAlg: Record<string, KeypairType> = {
  ed25519: 'ed25519',
  sr25519: 'sr25519',
  'ecdsa-secp256k1': 'ecdsa',
}
/**
 * Unsafe Keystore for Demo Purposes. Do not use to store sensible key material!
 */
export class DemoKeystore
  implements Keystore<SigningAlgorithms, EncryptionAlgorithms>, NaclBoxCapable
{
  private signingKeyring: Keyring = new Keyring()
  private encryptionKeypairs: Map<string, NaclKeypair> = new Map()

  private static getKeypairTypeForAlg(alg: string): KeypairType {
    return keypairTypeForAlg[alg]
  }

  private getSigningKeyPair(publicKey: Uint8Array, alg: string): KeyringPair {
    if (!signingSupported(alg))
      throw SDKErrors.ERROR_KEYSTORE_ERROR(
        `alg ${alg} is not supported for signing`
      )
    const keyType = DemoKeystore.getKeypairTypeForAlg(alg)
    try {
      const encodedAddress = encodeSigningPublicKeyToAddress(publicKey, alg)
      const keypair = this.signingKeyring.getPair(encodedAddress)
      if (keypair && keyType === keypair.type) return keypair
    } catch {
      throw SDKErrors.ERROR_KEYSTORE_ERROR(
        `no key ${Crypto.u8aToHex(publicKey)} for alg ${alg}`
      )
    }
    throw SDKErrors.ERROR_KEYSTORE_ERROR(
      `no key ${Crypto.u8aToHex(publicKey)} for alg ${alg}`
    )
  }

  private getEncryptionKeyPair(
    publicKey: Uint8Array,
    alg: string
  ): NaclKeypair {
    if (!encryptionSupported(alg))
      throw SDKErrors.ERROR_KEYSTORE_ERROR(
        `alg ${alg} is not supported for encryption`
      )
    const publicKeyHex = Crypto.u8aToHex(publicKey)
    const keypair = this.encryptionKeypairs.get(publicKeyHex)
    if (!keypair) throw Error(`no key ${publicKeyHex} for alg ${alg}`)
    return keypair
  }

  private async generateSigningKeypair<T extends SigningAlgorithms>(
    opts: KeyGenOpts<T>
  ): Promise<{
    publicKey: Uint8Array
    alg: T
  }> {
    const { seed, alg } = opts
    await cryptoWaitReady()

    const keypairType = DemoKeystore.getKeypairTypeForAlg(alg)
    const keypair = this.signingKeyring.addFromUri(
      seed || randomAsHex(32),
      {},
      keypairType as KeypairType
    )

    return { alg, publicKey: keypair.publicKey }
  }

  private async generateEncryptionKeypair<T extends EncryptionAlgorithms>(
    opts: KeyGenOpts<T>
  ): Promise<{
    publicKey: Uint8Array
    alg: T
  }> {
    const { seed, alg } = opts
    const { secretKey, publicKey } = naclBoxPairFromSecret(
      seed ? blake2AsU8a(seed, 256) : randomAsU8a(32)
    )
    return this.addEncryptionKeypair({ alg, secretKey, publicKey })
  }

  public async generateKeypair<
    T extends SigningAlgorithms | EncryptionAlgorithms
  >({
    alg,
    seed,
  }: KeyGenOpts<T>): Promise<{
    publicKey: Uint8Array
    alg: T
  }> {
    if (signingSupported(alg)) {
      return this.generateSigningKeypair({ alg, seed })
    }
    if (encryptionSupported(alg)) {
      return this.generateEncryptionKeypair({ alg, seed })
    }
    throw SDKErrors.ERROR_KEYSTORE_ERROR(`alg ${alg} is not supported`)
  }

  private async addSigningKeypair<T extends SigningAlgorithms>({
    alg,
    publicKey,
    secretKey,
  }: KeyAddOpts<T>): Promise<{
    publicKey: Uint8Array
    alg: T
  }> {
    await cryptoWaitReady()
    if (this.signingKeyring.publicKeys.some((i) => u8aEq(publicKey, i)))
      throw SDKErrors.ERROR_KEYSTORE_ERROR('public key already stored')
    const keypairType = DemoKeystore.getKeypairTypeForAlg(alg)
    const keypair = this.signingKeyring.addFromPair(
      { publicKey, secretKey },
      {},
      keypairType
    )
    return { alg, publicKey: keypair.publicKey }
  }

  private async addEncryptionKeypair<T extends EncryptionAlgorithms>({
    alg,
    secretKey,
  }: KeyAddOpts<T>): Promise<{
    publicKey: Uint8Array
    alg: T
  }> {
    const keypair = naclBoxPairFromSecret(secretKey)
    const { publicKey } = keypair
    const publicKeyHex = Crypto.u8aToHex(publicKey)
    if (this.encryptionKeypairs.has(publicKeyHex))
      throw SDKErrors.ERROR_KEYSTORE_ERROR('public key already used')
    this.encryptionKeypairs.set(publicKeyHex, keypair)
    return { alg, publicKey }
  }

  public async addKeypair<T extends SigningAlgorithms | EncryptionAlgorithms>({
    alg,
    publicKey,
    secretKey,
  }: KeyAddOpts<T>): Promise<{
    publicKey: Uint8Array
    alg: T
  }> {
    if (signingSupported(alg)) {
      return this.addSigningKeypair({ alg, publicKey, secretKey })
    }
    if (encryptionSupported(alg)) {
      return this.addEncryptionKeypair({ alg, publicKey, secretKey })
    }
    throw SDKErrors.ERROR_KEYSTORE_ERROR(`alg ${alg} is not supported`)
  }

  public async sign<A extends SigningAlgorithms>({
    publicKey,
    alg,
    data,
  }: KeystoreSigningData<A>): Promise<ResponseData<A>> {
    const keypair = this.getSigningKeyPair(publicKey, alg)
    const signature = keypair.sign(data, { withType: false })
    return { alg, data: signature }
  }

  public async encrypt<A extends 'x25519-xsalsa20-poly1305'>({
    data,
    alg,
    publicKey,
    peerPublicKey,
  }: RequestData<A> & { peerPublicKey: Uint8Array }): Promise<
    ResponseData<A> & { nonce: Uint8Array }
  > {
    const keypair = this.getEncryptionKeyPair(publicKey, alg)
    // this is an alias for tweetnacl nacl.box
    const { nonce, sealed } = naclSeal(data, keypair.secretKey, peerPublicKey)
    return { data: sealed, alg, nonce }
  }

  public async decrypt<A extends 'x25519-xsalsa20-poly1305'>({
    publicKey,
    alg,
    data,
    peerPublicKey,
    nonce,
  }: RequestData<A> & {
    peerPublicKey: Uint8Array
    nonce: Uint8Array
  }): Promise<ResponseData<A>> {
    const keypair = this.getEncryptionKeyPair(publicKey, alg)
    // this is an alias for tweetnacl nacl.box.open
    const decrypted = naclOpen(data, nonce, peerPublicKey, keypair.secretKey)
    if (!decrypted)
      return Promise.reject(
        SDKErrors.ERROR_KEYSTORE_ERROR('failed to decrypt with given key')
      )
    return { data: decrypted, alg }
  }

  // eslint-disable-next-line class-methods-use-this
  public async supportedAlgs(): Promise<
    Set<SigningAlgorithms | EncryptionAlgorithms>
  > {
    return new Set(Object.values(supportedAlgs))
  }

  public async hasKeys(
    keys: Array<Pick<RequestData<string>, 'alg' | 'publicKey'>>
  ): Promise<boolean[]> {
    const knownKeys = [
      ...this.signingKeyring.publicKeys,
      ...[...this.encryptionKeypairs.values()].map((i) => i.publicKey),
    ]
    return keys.map((key) => knownKeys.some((i) => u8aEq(key.publicKey, i)))
  }
}
