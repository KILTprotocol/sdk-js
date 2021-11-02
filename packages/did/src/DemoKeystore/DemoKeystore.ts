/**
 * Copyright 2018-2021 BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

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
import { Crypto, Keyring } from '@kiltprotocol/utils'
import {
  KeyRelationship,
  KeyringPair,
  Keystore,
  KeystoreSigningData,
  NaclBoxCapable,
  RequestData,
  ResponseData,
} from '@kiltprotocol/types'
import { BlockchainUtils } from '@kiltprotocol/chain-helpers'
import { KeypairType } from '@polkadot/util-crypto/types'
import { u8aEq } from '@polkadot/util'
import { getKiltDidFromIdentifier } from '../Did.utils'
import { FullDidDetails, LightDidDetails } from '../DidDetails'
import { DefaultResolver, DidUtils } from '..'
import { PublicKeyRoleAssignment } from '../types'
import { newFullDidDetailsfromKeys } from '../DidDetails/FullDidDetails.utils'

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

/**
 * Unsafe Keystore for Demo Purposes. Do not use to store sensible key material!
 */
export class DemoKeystore
  implements Keystore<SigningAlgorithms, EncryptionAlgorithms>, NaclBoxCapable {
  private signingKeyring: Keyring = new Keyring()
  private encryptionKeypairs: Map<string, NaclKeypair> = new Map()

  private getSigningKeyPair(publicKey: Uint8Array, alg: string): KeyringPair {
    if (!signingSupported(alg))
      throw new Error(`alg ${alg} is not supported for signing`)
    const keyType = DemoKeystore.getKeypairTypeForAlg(alg)
    try {
      const keypair = this.signingKeyring.getPair(publicKey)
      if (keypair && keyType === keypair.type) return keypair
    } catch {
      throw Error(`no key ${Crypto.u8aToHex(publicKey)} for alg ${alg}`)
    }
    throw Error(`no key ${Crypto.u8aToHex(publicKey)} for alg ${alg}`)
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
    const { secretKey, publicKey } = naclBoxKeypairFromSecret(
      seed ? blake2AsU8a(seed, 32 * 8) : randomAsU8a(32)
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
    throw new Error(`alg ${alg} is not supported`)
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
      throw new Error('public key already stored')
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
    const keypair = naclBoxKeypairFromSecret(secretKey)
    const { publicKey } = keypair
    const publicKeyHex = Crypto.u8aToHex(publicKey)
    if (this.encryptionKeypairs.has(publicKeyHex))
      throw new Error('public key already used')
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
    throw new Error(`alg ${alg} is not supported`)
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
      return Promise.reject(new Error('failed to decrypt with given key'))
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

  public static getKeypairTypeForAlg(alg: string): KeypairType {
    return KeypairTypeForAlg[alg.toLowerCase()] as KeypairType
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
  signingKeyType = SigningAlgorithms.Ed25519
): Promise<FullDidDetails> {
  const did = getKiltDidFromIdentifier(
    encodeAddress(blake2AsU8a(mnemonicOrHexSeed, 32 * 8), 38),
    'full'
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

  return newFullDidDetailsfromKeys({
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
      EncryptionAlgorithms.NaclBox,
      'x25519'
    ),
  })
}

export async function createLightDidFromSeed(
  keystore: DemoKeystore,
  mnemonicOrHexSeed: string,
  signingKeyType = SigningAlgorithms.Sr25519
): Promise<LightDidDetails> {
  const authenticationPublicKey = await keystore.generateKeypair({
    alg: signingKeyType,
    seed: mnemonicOrHexSeed,
  })

  return new LightDidDetails({
    authenticationKey: {
      publicKey: authenticationPublicKey.publicKey,
      type: authenticationPublicKey.alg,
    },
  })
}

export async function createOnChainDidFromSeed(
  paymentAccount: KeyringPair,
  keystore: DemoKeystore,
  mnemonicOrHexSeed: string,
  signingKeyType = SigningAlgorithms.Ed25519
): Promise<FullDidDetails> {
  const makeKey = (
    seed: string,
    alg: SigningAlgorithms | EncryptionAlgorithms
  ) =>
    keystore
      .generateKeypair({
        alg,
        seed,
      })
      .then((key) => ({ ...key, type: DemoKeystore.getKeypairTypeForAlg(alg) }))

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
      EncryptionAlgorithms.NaclBox
    ),
  }

  const { extrinsic, did } = await DidUtils.writeDidFromPublicKeys(
    keystore,
    paymentAccount.address,
    keys
  )
  await BlockchainUtils.signAndSubmitTx(extrinsic, paymentAccount, {
    reSign: true,
    resolveOn: BlockchainUtils.IS_IN_BLOCK,
  })
  const queried = await DefaultResolver.resolveDoc(did)
  if (queried) {
    return queried.details as FullDidDetails
  }
  throw Error(`failed to write Did${did}`)
}
