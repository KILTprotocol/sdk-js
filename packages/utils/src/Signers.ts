/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { decodePair } from '@polkadot/keyring/pair/decode'
import {
  cryptoWaitReady,
  encodeAddress,
  randomAsHex,
  secp256k1Sign,
  sr25519Sign,
} from '@polkadot/util-crypto'
import type { Keypair } from '@polkadot/util-crypto/types'

import {
  createSigner as es256kSignerWrapped,
  cryptosuite as es256kSuite,
} from '@kiltprotocol/ecdsa-secp256k1-jcs-2023'
import {
  createSigner as ed25519SignerWrapped,
  cryptosuite as ed25519Suite,
} from '@kiltprotocol/eddsa-jcs-2022'
import type { SignerInterface } from '@kiltprotocol/jcs-data-integrity-proofs-common'
import { cryptosuite as sr25519Suite } from '@kiltprotocol/sr25519-jcs-2023'

import type { DidDocument, KeyringPair } from '@kiltprotocol/types'

export const ALGORITHMS = Object.freeze({
  ECRECOVER_SECP256K1_BLAKE2B: 'Ecrecover-Secp256k1-Blake2b', // could also be called ES256K-R-Blake2b
  ECRECOVER_SECP256K1_KECCAK: 'Ecrecover-Secp256k1-Keccak', // could also be called ES256K-R-Keccak
  ES256K: es256kSuite.requiredAlgorithm,
  SR25519: sr25519Suite.requiredAlgorithm,
  ED25519: ed25519Suite.requiredAlgorithm,
})

export const DID_PALLET_SUPPORTED_ALGORITHMS = Object.freeze([
  ALGORITHMS.ED25519,
  ALGORITHMS.ECRECOVER_SECP256K1_BLAKE2B,
  ALGORITHMS.SR25519,
])

/**
 * Signer that produces an ECDSA signature over a Blake2b-256 digest of the message using the secp256k1 curve.
 * The signature has a recovery bit appended to the end, allowing public key recovery.
 *
 * @param root0
 * @param root0.keyUri
 * @param root0.publicKey
 * @param root0.secretKey
 */
export async function polkadotEcdsaSigner({
  secretKey,
  keyUri,
}: {
  publicKey?: Uint8Array
  secretKey: Uint8Array
  keyUri: string
}): Promise<SignerInterface> {
  return {
    id: keyUri,
    algorithm: ALGORITHMS.ECRECOVER_SECP256K1_BLAKE2B,
    sign: async ({ data }) => {
      return secp256k1Sign(data, { secretKey }, 'blake2')
    },
  }
}

/**
 * Signer that produces an ECDSA signature over a Keccak-256 digest of the message using the secp256k1 curve.
 * The signature has a recovery bit appended to the end, allowing public key recovery.
 *
 * @param input
 * @param input.keyUri
 * @param input.publicKey
 * @param input.secretKey
 * @returns
 */
export async function ethereumEcdsaSigner({
  secretKey,
  keyUri,
}: {
  publicKey?: Uint8Array
  secretKey: Uint8Array
  keyUri: string
}): Promise<SignerInterface> {
  return {
    id: keyUri,
    algorithm: ALGORITHMS.ECRECOVER_SECP256K1_KECCAK,
    sign: async ({ data }) => {
      return secp256k1Sign(data, { secretKey }, 'keccak')
    },
  }
}

/**
 * Signer that produces an ES256K signature over the message.
 *
 * @param input
 * @param input.keyUri
 * @param input.publicKey
 * @param input.secretKey
 * @returns
 */
export async function es256kSigner({
  secretKey,
  keyUri,
}: {
  publicKey?: Uint8Array
  secretKey: Uint8Array
  keyUri: string
}): Promise<SignerInterface> {
  // only exists to map secretKey to seed
  return es256kSignerWrapped({ seed: secretKey, keyUri })
}

/**
 * Signer that produces an Ed25519 signature over the message.
 *
 * @param input
 * @param input.keyUri
 * @param input.publicKey
 * @param input.secretKey
 * @returns
 */
export async function ed25519Signer({
  secretKey,
  keyUri,
}: {
  publicKey?: Uint8Array
  secretKey: Uint8Array
  keyUri: string
}): Promise<SignerInterface> {
  // polkadot ed25519 private keys are a concatenation of private and public key for some reason
  return ed25519SignerWrapped({ seed: secretKey.slice(0, 32), keyUri })
}

/**
 * Signer that produces an Sr25519 signature over the message.
 *
 * @param input
 * @param input.keyUri
 * @param input.publicKey
 * @param input.secretKey
 * @returns
 */
export async function sr25519Signer({
  secretKey,
  keyUri,
  publicKey,
}: {
  publicKey: Uint8Array
  secretKey: Uint8Array
  keyUri: string
}): Promise<SignerInterface> {
  await cryptoWaitReady()
  return {
    id: keyUri,
    algorithm: ALGORITHMS.SR25519,
    sign: async ({ data }: { data: Uint8Array }) => {
      return sr25519Sign(data, { secretKey, publicKey })
    },
  }
}

function extractPk(pair: KeyringPair): Uint8Array {
  const pw = randomAsHex()
  const encoded = pair.encodePkcs8(pw)
  const { secretKey } = decodePair(pw, encoded)
  return secretKey
}

const signerFactory = {
  [ALGORITHMS.ED25519]: ed25519Signer,
  [ALGORITHMS.SR25519]: sr25519Signer,
  [ALGORITHMS.ES256K]: es256kSigner,
  [ALGORITHMS.ECRECOVER_SECP256K1_BLAKE2B]: polkadotEcdsaSigner,
  [ALGORITHMS.ECRECOVER_SECP256K1_KECCAK]: ethereumEcdsaSigner,
}

/**
 * @param root0
 * @param root0.keypair
 * @param root0.algorithm
 * @param root0.keyUri
 */
export async function signerFromKeypair({
  keypair,
  keyUri,
  algorithm,
}: {
  keypair: Keypair | KeyringPair
  algorithm: string
  keyUri?: string
}): Promise<SignerInterface> {
  const makeSigner: (x: {
    secretKey: Uint8Array
    publicKey: Uint8Array
    keyUri: string
  }) => Promise<SignerInterface> = signerFactory[algorithm]
  if (typeof makeSigner !== 'function') {
    throw new Error(`unknown algorithm ${algorithm}`)
  }

  if (!('secretKey' in keypair) && 'encodePkcs8' in keypair) {
    const id = keyUri ?? keypair.address
    return {
      id,
      algorithm,
      sign: async (signData) => {
        // TODO: can probably be optimized; but care must be taken to respect keyring locking
        const secretKey = extractPk(keypair)
        const { sign } = await makeSigner({
          secretKey,
          publicKey: keypair.publicKey,
          keyUri: id,
        })
        return sign(signData)
      },
    }
  }

  const { secretKey, publicKey } = keypair
  return makeSigner({
    secretKey,
    publicKey,
    keyUri: keyUri ?? encodeAddress(publicKey, 38),
  })
}

function algsForKeyType(keyType: string): string[] {
  switch (keyType.toLowerCase()) {
    case 'ed25519':
      return [ALGORITHMS.ED25519]
    case 'sr25519':
      return [ALGORITHMS.SR25519]
    case 'ecdsa':
    case 'secpk256k1':
      return [
        ALGORITHMS.ES256K,
        ALGORITHMS.ECRECOVER_SECP256K1_BLAKE2B,
        ALGORITHMS.ECRECOVER_SECP256K1_KECCAK,
      ]
    default:
      return []
  }
}

/**
 * @param root0
 * @param root0.keypair
 * @param root0.type
 * @param root0.keyUri
 */
export async function getSignersForKeypair({
  keypair,
  type = (keypair as KeyringPair).type,
  keyUri,
}: {
  keypair: Keypair | KeyringPair
  type?: string
  keyUri?: string
}): Promise<SignerInterface[]> {
  if (!type) {
    throw new Error('type is required if keypair.type is not given')
  }
  const algorithms = algsForKeyType(type)
  return Promise.all(
    algorithms.map<Promise<SignerInterface>>(async (algorithm) => {
      return signerFromKeypair({ keypair, keyUri, algorithm })
    })
  )
}

export interface SignerSelector {
  (signer: SignerInterface): boolean
}

/**
 * @param signers
 * @param selectors
 */
export async function selectSigners(
  signers: readonly SignerInterface[],
  ...selectors: readonly SignerSelector[]
): Promise<SignerInterface[]> {
  return signers.filter((signer) => {
    return selectors.every((selector) => selector(signer))
  })
}

/**
 * @param signers
 * @param selectors
 */
export async function selectSigner(
  signers: readonly SignerInterface[],
  ...selectors: readonly SignerSelector[]
): Promise<SignerInterface | undefined> {
  return signers.find((signer) => {
    return selectors.every((selector) => selector(signer))
  })
}

function byId(id: string): SignerSelector {
  return (signer) => signer.id === id
}

function byAlgorithm(algorithms: readonly string[]): SignerSelector {
  return (signer) =>
    algorithms.some(
      (algorithm) => algorithm.toLowerCase() === signer.algorithm.toLowerCase()
    )
}

function byDid(
  didDocument: DidDocument,
  {
    controller,
    verificationRelationship,
  }: { verificationRelationship?: string; controller?: string } = {}
): SignerSelector {
  return (signer) => {
    const vm = didDocument.verificationMethod?.find(
      ({ id }) => id === signer.id || didDocument.id + id === signer.id // deal with relative DID URLs as ids
    )
    if (!vm) {
      return false
    }
    if (controller && controller !== vm.controller) {
      return false
    }
    if (
      typeof verificationRelationship === 'string' &&
      didDocument[verificationRelationship]?.some?.(
        (id: string) => id === signer.id || didDocument.id + id === signer.id // deal with relative DID URLs as ids
      ) !== true
    ) {
      return false
    }
    return true
  }
}

function verifiableOnChain(): SignerSelector {
  return byAlgorithm(DID_PALLET_SUPPORTED_ALGORITHMS)
}

export const select = {
  byId,
  byAlgorithm,
  byDid,
  verifiableOnChain,
}
