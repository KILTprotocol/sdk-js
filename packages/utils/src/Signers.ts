/**
 * Copyright (c) 2018-2023, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import { createSigner as ed25519Signer } from '@kiltprotocol/eddsa-jcs-2022'
import { createSigner as sr25519Signer } from '@kiltprotocol/sr25519-jcs-2023'
import { createSigner as es256kSigner } from '@kiltprotocol/ecdsa-secp256k1-jcs-2023'
import type { SignerInterface } from '@kiltprotocol/jcs-data-integrity-proofs-common'
import { KeyringPair } from '@kiltprotocol/types'
import {
  encodeAddress,
  randomAsHex,
  secp256k1Sign,
} from '@polkadot/util-crypto'
import { Keypair } from '@polkadot/util-crypto/types'
import { decodePair } from '@polkadot/keyring/pair/decode'

/**
 * Signer that produces an ECDSA signature over a Blake2b-256 digest of the message using the secp256k1 curve.
 * The signature has a recovery bit appended to the end, allowing public key recovery.
 *
 * @param root0
 * @param root0.seed
 * @param root0.keyUri
 */
export async function polkadotEcdsaSigner({
  seed,
  keyUri,
}: {
  seed: Uint8Array
  keyUri: string
}): Promise<SignerInterface> {
  return {
    id: keyUri,
    algorithm: 'Ecrecover-Secp256k1-Blake2b', // could also be called ES256K-R-Blake2b
    sign: async ({ data }) => {
      return secp256k1Sign(data, { secretKey: seed }, 'blake2')
    },
  }
}

/**
 * Signer that produces an ECDSA signature over a Keccak-256 digest of the message using the secp256k1 curve.
 * The signature has a recovery bit appended to the end, allowing public key recovery.
 *
 * @param input
 * @param input.seed
 * @param input.keyUri
 * @returns
 */
export async function ethereumEcdsaSigner({
  seed,
  keyUri,
}: {
  seed: Uint8Array
  keyUri: string
}): Promise<SignerInterface> {
  return {
    id: keyUri,
    algorithm: 'Ecrecover-Secp256k1-Keccak', // could also be called ES256K-R-Keccak
    sign: async ({ data }) => {
      return secp256k1Sign(data, { secretKey: seed }, 'keccak')
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
  Ed25519: ed25519Signer,
  Sr25519: sr25519Signer,
  Es256K: es256kSigner,
  'Ecrecover-Secp256k1-Blake2b': polkadotEcdsaSigner,
  'Ecrecover-Secp256k1-Keccak': ethereumEcdsaSigner,
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
    seed: Uint8Array
    keyUri: string
  }) => Promise<SignerInterface> = signerFactory[algorithm]
  if (typeof makeSigner !== 'function') {
    throw new Error('unknown algorithm')
  }

  if (!('secretKey' in keypair) && 'encodePkcs8' in keypair) {
    const id = keyUri ?? keypair.address
    return {
      id,
      algorithm,
      sign: async (signData) => {
        // TODO: can probably be optimized; but care must be taken to respect keyring locking
        const secretKey = extractPk(keypair)
        const { sign } = await makeSigner({ seed: secretKey, keyUri: id })
        return sign(signData)
      },
    }
  }

  const { secretKey, publicKey } = keypair
  return makeSigner({
    seed: secretKey,
    keyUri: keyUri ?? encodeAddress(publicKey, 38),
  })
}

function algsForKeyType(keyType: string): string[] {
  switch (keyType.toLowerCase()) {
    case 'ed25519':
      return ['Ed25519']
    case 'sr25519':
      return ['Sr25519']
    case 'ecdsa':
    case 'secpk256k1':
      return [
        'Ecrecover-Secp256k1-Blake2b',
        'Ecrecover-Secp256k1-Keccak',
        'ES256K',
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
