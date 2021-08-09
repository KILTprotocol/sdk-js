/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { Keyring } from '@polkadot/keyring'
import {
  randomAsU8a,
  cryptoWaitReady,
  naclBoxKeypairFromSecret,
  naclOpen,
  naclSeal,
  randomAsHex,
  blake2AsU8a,
  blake2AsHex,
  encodeAddress,
} from '@polkadot/util-crypto'
import { Crypto } from '@kiltprotocol/utils'
import {
  Keystore,
  KeystoreSigningData,
  RequestData,
  ResponseData,
} from '@kiltprotocol/types'
import { getKiltDidFromIdentifier } from '../Did.utils'
import { DidDetails, DidDetailsUtils } from '../DidDetails'

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

export interface KeyGenOpts<T extends string> {
  alg: RequestData<T>['alg']
  keyId?: RequestData<T>['keyId']
  seed?: string
}

export interface NaclKeypair {
  publicKey: Uint8Array
  secretKey: Uint8Array
}

export type KeyAddOpts<T extends string> = Pick<
  RequestData<T>,
  'keyId' | 'alg'
> &
  NaclKeypair

/**
 * Unsafe Keystore for Demo Purposes. Do not use to store sensible key material!
 */
export class DemoKeystore
  implements Keystore<SubstrateKeyTypes, EncryptionAlgorithms> {
  private keyring: Keyring
  private signingPublicKeys: Record<string, Uint8Array> = {}
  private encryptionKeypairs: Record<string, NaclKeypair> = {}

  constructor() {
    this.keyring = new Keyring()
  }

  private async generateSigningKeypair<T extends SubstrateKeyTypes>(
    opts: KeyGenOpts<T>
  ): Promise<{
    publicKey: Uint8Array
    keyId: string
    alg: T
  }> {
    const { seed, alg } = opts
    await cryptoWaitReady()

    const keypair = this.keyring.addFromUri(seed || randomAsHex(32), {}, alg)

    const keyId = opts.keyId || Crypto.u8aToHex(keypair.publicKey)
    if (this.signingPublicKeys[keyId])
      throw new Error(`id ${keyId} already used`)

    this.signingPublicKeys[keyId] = keypair.publicKey
    return { keyId, alg, publicKey: keypair.publicKey }
  }

  private async generateEncryptionKeypair<T extends EncryptionAlgorithms>(
    opts: KeyGenOpts<T>
  ): Promise<{
    publicKey: Uint8Array
    keyId: string
    alg: T
  }> {
    const { seed, alg } = opts
    const { secretKey, publicKey } = naclBoxKeypairFromSecret(
      seed ? blake2AsU8a(seed, 32 * 8) : randomAsU8a(32)
    )
    const keyId = opts.keyId || Crypto.u8aToHex(publicKey)
    return this.addEncryptionKeypair({ keyId, alg, secretKey, publicKey })
  }

  public async generateKeypair<
    T extends SubstrateKeyTypes | EncryptionAlgorithms
  >({
    keyId,
    alg,
    seed,
  }: KeyGenOpts<T>): Promise<{
    publicKey: Uint8Array
    keyId: string
    alg: T
  }> {
    if (signingSupported(alg)) {
      return this.generateSigningKeypair({ keyId, alg, seed })
    }
    if (encryptionSupported(alg)) {
      return this.generateEncryptionKeypair({ keyId, alg, seed })
    }
    throw new Error('alg not supported')
  }

  private async addSigningKeypair<T extends SubstrateKeyTypes>({
    keyId,
    alg,
    publicKey,
    secretKey,
  }: KeyAddOpts<T>): Promise<{
    publicKey: Uint8Array
    keyId: string
    alg: T
  }> {
    if (this.signingPublicKeys[keyId]) throw new Error('id already used')
    await cryptoWaitReady()
    const keypair = this.keyring.addFromPair(
      { publicKey, secretKey },
      { name: keyId },
      alg
    )
    this.signingPublicKeys[keyId] = keypair.publicKey
    return { keyId, alg, publicKey: keypair.publicKey }
  }

  private async addEncryptionKeypair<T extends EncryptionAlgorithms>({
    keyId,
    alg,
    secretKey,
  }: KeyAddOpts<T>): Promise<{
    publicKey: Uint8Array
    keyId: string
    alg: T
  }> {
    if (this.encryptionKeypairs[keyId]) throw new Error('id already used')
    const keypair = naclBoxKeypairFromSecret(secretKey)
    this.encryptionKeypairs[keyId] = keypair
    return { keyId, alg, publicKey: keypair.publicKey }
  }

  public async addKeypair<T extends SubstrateKeyTypes | EncryptionAlgorithms>({
    keyId,
    alg,
    publicKey,
    secretKey,
  }: KeyAddOpts<T>): Promise<{
    publicKey: Uint8Array
    keyId: string
    alg: T
  }> {
    if (signingSupported(alg)) {
      return this.addSigningKeypair({ keyId, alg, publicKey, secretKey })
    }
    if (encryptionSupported(alg)) {
      return this.addEncryptionKeypair({ keyId, alg, publicKey, secretKey })
    }
    throw new Error('alg not supported')
  }

  public async sign<A extends SubstrateKeyTypes>({
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

  public async encrypt<A extends EncryptionAlgorithms>({
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
    const { nonce, sealed } = naclSeal(data, keypair.secretKey, peerPublicKey)
    return { data: sealed, alg, nonce }
  }

  public async decrypt<A extends EncryptionAlgorithms>({
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
    const decrypted = naclOpen(data, nonce, peerPublicKey, keypair.secretKey)
    if (!decrypted)
      return Promise.reject(new Error('failed to decrypt with given key'))
    return { data: decrypted, alg }
  }

  // eslint-disable-next-line class-methods-use-this
  public async supportedAlgs(): Promise<
    Set<SubstrateKeyTypes | EncryptionAlgorithms>
  > {
    return supportedAlgs
  }

  public async getKeyIds(): Promise<string[]> {
    return [
      ...Object.keys(this.signingPublicKeys),
      ...Object.keys(this.encryptionKeypairs),
    ]
  }

  public async hasKeys(keyIds: string[]): Promise<boolean[]> {
    return keyIds.map(
      (id) => !!(this.signingPublicKeys[id] || this.encryptionKeypairs)
    )
  }
}

/**
 * Creates DidDetails for use in local testing. Will not work on-chain bc identifiers are generated ad-hoc.
 *
 * @param keystore
 * @param mnemonicOrHexSeed
 * @param signingKeyType
 */
export async function createLocalDemoDidFromSeed(
  keystore: DemoKeystore,
  mnemonicOrHexSeed: string,
  signingKeyType = 'ed25519'
): Promise<DidDetails> {
  const did = getKiltDidFromIdentifier(
    encodeAddress(blake2AsU8a(mnemonicOrHexSeed, 32 * 8), 38)
  )

  const generateKeypairForDid = async (
    derivation: string,
    alg: string,
    keytype: string
  ) => {
    const seed = `${mnemonicOrHexSeed}//${derivation}`
    const keyId = `${did}#${blake2AsHex(seed, 64)}`
    const { publicKey } = await keystore.generateKeypair<any>({
      keyId,
      alg,
      seed,
    })
    return {
      id: keyId,
      controller: did,
      type: keytype,
      publicKeyHex: Crypto.u8aToHex(publicKey),
    }
  }

  return DidDetailsUtils.newDidfromKeyRecords({
    authentication: await generateKeypairForDid(
      'authentication',
      signingKeyType,
      signingKeyType
    ),
    assertionMethod: await generateKeypairForDid(
      'assertionMethod',
      signingKeyType,
      signingKeyType
    ),
    capabilityDelegation: await generateKeypairForDid(
      'capabilityDelegation',
      signingKeyType,
      signingKeyType
    ),
    keyAgreement: await generateKeypairForDid(
      'keyAgreement',
      'x25519-xsalsa20-poly1305',
      'x25519'
    ),
  })
}
