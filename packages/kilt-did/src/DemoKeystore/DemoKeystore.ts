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
  KeyRelationship,
  Keystore,
  KeystoreSigningData,
  RequestData,
  ResponseData,
} from '@kiltprotocol/types'
import { KeyringPair } from '@polkadot/keyring/types'
import { BlockchainUtils } from '@kiltprotocol/chain-helpers'
import { KeypairType } from '@polkadot/util-crypto/types'
import { u8aEq } from '@polkadot/util'
import { getKiltDidFromIdentifier } from '../Did.utils'
import { DidDetails, DidDetailsUtils } from '../DidDetails'
import { DefaultResolver, DidUtils } from '..'
import { PublicKeyRoleAssignment } from '../types'

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
  seed?: string
}

export interface NaclKeypair {
  publicKey: Uint8Array
  secretKey: Uint8Array
}

export type KeyAddOpts<T extends string> = Pick<RequestData<T>, 'alg'> &
  NaclKeypair

const KeypairTypeForAlg: Record<string, string> = {
  ed25519: 'ed25519',
  sr25519: 'sr25519',
  'ecdsa-secp256k1': 'ecdsa',
  'x25519-xsalsa20-poly1305': 'x25519',
}

function getKeypairTypeForAlg(alg: string): KeypairType {
  return KeypairTypeForAlg[alg.toLowerCase()] as KeypairType
}

/**
 * Unsafe Keystore for Demo Purposes. Do not use to store sensible key material!
 */
export class DemoKeystore
  implements Keystore<SubstrateKeyTypes, EncryptionAlgorithms> {
  private signingKeyring: Keyring = new Keyring()
  private encryptionKeypairs: Map<string, NaclKeypair> = new Map()

  private async generateSigningKeypair<T extends SubstrateKeyTypes>(
    opts: KeyGenOpts<T>
  ): Promise<{
    publicKey: Uint8Array
    alg: T
  }> {
    const { seed, alg } = opts
    await cryptoWaitReady()

    const keypairType = getKeypairTypeForAlg(alg)
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
    const { secretKey, publicKey } = naclBoxKeypairFromSecret(
      seed ? blake2AsU8a(seed, 32 * 8) : randomAsU8a(32)
    )
    return this.addEncryptionKeypair({ alg, secretKey, publicKey })
  }

  public async generateKeypair<
    T extends SubstrateKeyTypes | EncryptionAlgorithms
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
    throw new Error(`alg ${alg} is not supported`)
  }

  private async addSigningKeypair<T extends SubstrateKeyTypes>({
    alg,
    publicKey,
    secretKey,
  }: KeyAddOpts<T>): Promise<{
    publicKey: Uint8Array
    alg: T
  }> {
    await cryptoWaitReady()
    if (this.signingKeyring.publicKeys.some((i) => u8aEq(publicKey, i)))
      throw new Error('public key already stored')
    const keypairType = getKeypairTypeForAlg(alg)
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
    const keypair = naclBoxKeypairFromSecret(secretKey)
    const { publicKey } = keypair
    const publicKeyHex = Crypto.u8aToHex(publicKey)
    if (this.encryptionKeypairs.has(publicKeyHex))
      throw new Error('public key already used')
    this.encryptionKeypairs.set(publicKeyHex, keypair)
    return { alg, publicKey }
  }

  public async addKeypair<T extends SubstrateKeyTypes | EncryptionAlgorithms>({
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
    throw new Error(`alg ${alg} is not supported`)
  }

  public async sign<A extends SubstrateKeyTypes>({
    publicKey,
    alg,
    data,
  }: KeystoreSigningData<A>): Promise<ResponseData<A>> {
    if (!signingSupported(alg))
      throw new Error(`alg ${alg} is not supported for signing`)
    const keyType = getKeypairTypeForAlg(alg)
    const keypair = this.signingKeyring.getPair(publicKey)
    if (!keypair || keyType !== keypair.type)
      return Promise.reject(
        new Error(`no key ${Crypto.u8aToHex(publicKey)} for alg ${alg}`)
      )
    const signature = keypair.sign(data, { withType: false })
    return { alg, data: signature }
  }

  private getEncryptionKeyPair(
    publicKey: Uint8Array,
    alg: string
  ): NaclKeypair {
    if (!encryptionSupported(alg))
      throw new Error(`alg ${alg} is not supported for encryption`)
    const publicKeyHex = Crypto.u8aToHex(publicKey)
    const keypair = this.encryptionKeypairs.get(publicKeyHex)
    if (!keypair) throw Error(`no key ${publicKeyHex} for alg ${alg}`)
    return keypair
  }

  public async encrypt<A extends EncryptionAlgorithms>({
    data,
    alg,
    publicKey,
    peerPublicKey,
  }: RequestData<A> & { peerPublicKey: Uint8Array }): Promise<
    ResponseData<A> & { nonce: Uint8Array }
  > {
    const keypair = this.getEncryptionKeyPair(publicKey, alg)
    const { nonce, sealed } = naclSeal(data, keypair.secretKey, peerPublicKey)
    return { data: sealed, alg, nonce }
  }

  public async decrypt<A extends EncryptionAlgorithms>({
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

  public async getKeys(): Promise<Uint8Array[]> {
    return [
      ...this.signingKeyring.publicKeys,
      ...[...this.encryptionKeypairs.values()].map((i) => i.publicKey),
    ]
  }

  public async hasKeys(keys: Uint8Array[]): Promise<boolean[]> {
    const knownKeys = await this.getKeys()
    return keys.map((key) => knownKeys.some((i) => u8aEq(key, i)))
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
    const seed = derivation
      ? `${mnemonicOrHexSeed}//${derivation}`
      : mnemonicOrHexSeed
    const keyId = `${did}#${blake2AsHex(seed, 64)}`
    const { publicKey } = await keystore.generateKeypair<any>({
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

  return DidDetailsUtils.newDidDetailsfromKeys({
    [KeyRelationship.authentication]: await generateKeypairForDid(
      '',
      signingKeyType,
      signingKeyType
    ),
    [KeyRelationship.assertionMethod]: await generateKeypairForDid(
      'assertionMethod',
      signingKeyType,
      signingKeyType
    ),
    [KeyRelationship.capabilityDelegation]: await generateKeypairForDid(
      'capabilityDelegation',
      signingKeyType,
      signingKeyType
    ),
    [KeyRelationship.keyAgreement]: await generateKeypairForDid(
      'keyAgreement',
      'x25519-xsalsa20-poly1305',
      'x25519'
    ),
  })
}

export async function createOnChainDidFromSeed(
  paymentAccount: KeyringPair,
  keystore: DemoKeystore,
  mnemonicOrHexSeed: string,
  signingKeyType: SubstrateKeyTypes = 'ed25519'
): Promise<DidDetails> {
  const makeKey = (seed: string, alg: string) =>
    keystore
      .generateKeypair({
        alg: signingKeyType,
        seed,
      })
      .then((key) => ({ ...key, type: getKeypairTypeForAlg(alg) }))

  const keys: PublicKeyRoleAssignment = {
    [KeyRelationship.authentication]: await makeKey(
      mnemonicOrHexSeed,
      signingKeyType
    ),
    [KeyRelationship.assertionMethod]: await makeKey(
      `${mnemonicOrHexSeed}//assertionMethod`,
      signingKeyType
    ),
    [KeyRelationship.capabilityDelegation]: await makeKey(
      `${mnemonicOrHexSeed}//capabilityDelegation`,
      signingKeyType
    ),
    [KeyRelationship.keyAgreement]: await makeKey(
      `${mnemonicOrHexSeed}//keyAgreement`,
      'x25519-xsalsa20-poly1305'
    ),
  }

  const { submittable, did } = await DidUtils.writeDidfromPublicKeys(
    keystore,
    keys
  )
  await BlockchainUtils.signAndSubmitTx(submittable, paymentAccount, {
    reSign: true,
    resolveOn: BlockchainUtils.IS_IN_BLOCK,
  })
  const queried = await DefaultResolver.resolve({ did })
  if (queried) {
    return queried as DidDetails
  }
  throw Error(`failed to write Did${did}`)
}
