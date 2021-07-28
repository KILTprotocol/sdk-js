/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { Keyring } from '@polkadot/keyring'
import nacl from 'tweetnacl'
import { randomAsU8a, cryptoWaitReady } from '@polkadot/util-crypto'
import {
  Keystore,
  KeystoreSigningData,
  RequestData,
  ResponseData,
} from '../types'

export type SubstrateKeyTypes = Keyring['type']
export type EncryptionAlgorithms = 'x25519-xsalsa20-poly1305'

const encryptionSupport = new Set<EncryptionAlgorithms>([
  'x25519-xsalsa20-poly1305',
])
const signingSupport = new Set<SubstrateKeyTypes>([
  'ed25519',
  'sr25519',
  'ecdsa',
  'ethereum',
])

const supportedAlgs = new Set([...signingSupport, ...encryptionSupport])

function signingSupported(alg: string): alg is SubstrateKeyTypes {
  return signingSupport.has(alg as SubstrateKeyTypes)
}
function encryptionSupported(alg: string): alg is EncryptionAlgorithms {
  return encryptionSupport.has(alg as EncryptionAlgorithms)
}
// function isSupported(
//   alg: string
// ): alg is SubstrateKeyTypes | EncryptionAlgorithms {
//   return encryptionSupport.has(alg as EncryptionAlgorithms)
// }

/**
 * Unsafe Keystore for Demo Purposes. Do not use to store sensible key material!
 */
export class DemoKeystore
  implements Keystore<SubstrateKeyTypes, EncryptionAlgorithms> {
  private keyring: Keyring
  private signingPublicKeys: Record<string, Uint8Array> = {}
  private encryptionKeypairs: Record<string, nacl.BoxKeyPair> = {}

  constructor() {
    this.keyring = new Keyring()
  }

  private async generateSigningKeypair<T extends SubstrateKeyTypes>({
    keyId,
    alg,
  }: Pick<RequestData<T>, 'keyId' | 'alg'>): Promise<{
    publicKey: Uint8Array
    keyId: string
    alg: T
  }> {
    if (this.signingPublicKeys[keyId]) throw new Error('id already used')
    await cryptoWaitReady()
    const keypair = this.keyring.addFromSeed(
      randomAsU8a(32),
      { name: keyId },
      alg
    )
    this.signingPublicKeys[keyId] = keypair.publicKey
    return { keyId, alg, publicKey: keypair.publicKey }
  }

  private async generateEncryptionKeypair<T extends EncryptionAlgorithms>({
    keyId,
    alg,
  }: Pick<RequestData<T>, 'keyId' | 'alg'>): Promise<{
    publicKey: Uint8Array
    keyId: string
    alg: T
  }> {
    if (this.encryptionKeypairs[keyId]) throw new Error('id already used')
    const keypair = nacl.box.keyPair()
    this.encryptionKeypairs[keyId] = keypair
    return { keyId, alg, publicKey: keypair.publicKey }
  }

  async generateKeypair<T extends SubstrateKeyTypes & EncryptionAlgorithms>({
    keyId,
    alg,
  }: Pick<RequestData<T>, 'keyId' | 'alg'>): Promise<{
    publicKey: Uint8Array
    keyId: string
    alg: T
  }> {
    if (signingSupported(alg)) {
      return this.generateSigningKeypair({ keyId, alg })
    }
    if (encryptionSupported(alg)) {
      return this.generateEncryptionKeypair({ keyId, alg })
    }
    throw new Error('alg not supported')
  }

  async sign<A extends SubstrateKeyTypes>({
    keyId,
    alg,
    data,
  }: KeystoreSigningData<A>): Promise<ResponseData<A>> {
    if (!signingSupported(alg)) throw new Error('alg not supported')
    const publicKey = this.signingPublicKeys[keyId]
    if (!publicKey)
      return Promise.reject(new Error(`unknown signing key with id ${keyId}`))
    const keypair = this.keyring.getPair(publicKey)
    if (alg !== keypair.type)
      return Promise.reject(
        new Error(`key with id ${keyId} cannot be used with alg ${alg}`)
      )
    const signature = keypair.sign(data, { withType: false })
    return { alg, data: signature }
  }

  async encrypt<A extends EncryptionAlgorithms>({
    data,
    alg,
    keyId,
    peerPublicKey,
  }: RequestData<A> & { peerPublicKey: Uint8Array }): Promise<
    ResponseData<A> & { nonce: Uint8Array }
  > {
    if (!encryptionSupported(alg)) throw new Error('alg not supported')
    const keypair = this.encryptionKeypairs[keyId]
    if (!keypair)
      return Promise.reject(
        new Error(`unknown encryption key with id ${keyId}`)
      )
    if (alg !== 'x25519-xsalsa20-poly1305')
      return Promise.reject(
        new Error(`key with id ${keyId} cannot be used with alg ${alg}`)
      )
    const nonce = nacl.randomBytes(24)
    const encrypted = nacl.box(data, nonce, peerPublicKey, keypair.secretKey)
    return { data: encrypted, alg, nonce }
  }

  async decrypt<A extends EncryptionAlgorithms>({
    keyId,
    alg,
    data,
    peerPublicKey,
    nonce,
  }: RequestData<A> & {
    peerPublicKey: Uint8Array
    nonce: Uint8Array
  }): Promise<ResponseData<A>> {
    if (!encryptionSupported(alg)) throw new Error('alg not supported')
    const keypair = this.encryptionKeypairs[keyId]
    if (!keypair)
      return Promise.reject(
        new Error(`unknown encryption key with id ${keyId}`)
      )
    if (alg !== 'x25519-xsalsa20-poly1305')
      return Promise.reject(
        new Error(`key with id ${keyId} cannot be used with alg ${alg}`)
      )
    const decrypted = nacl.box.open(
      data,
      nonce,
      peerPublicKey,
      keypair.secretKey
    )
    if (!decrypted)
      return Promise.reject(new Error('failed to decrypt with given key'))
    return { data: decrypted, alg }
  }

  // eslint-disable-next-line class-methods-use-this
  async supportedAlgs(): Promise<
    Set<SubstrateKeyTypes | EncryptionAlgorithms>
  > {
    return supportedAlgs
  }

  async getKeyIds(): Promise<string[]> {
    return [
      ...Object.keys(this.signingPublicKeys),
      ...Object.keys(this.encryptionKeypairs),
    ]
  }

  async hasKeys(keyIds: string[]): Promise<boolean[]> {
    return keyIds.map(
      (id) => !!(this.signingPublicKeys[id] || this.encryptionKeypairs)
    )
  }
}
