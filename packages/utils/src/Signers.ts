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
import { cryptosuite as sr25519Suite } from '@kiltprotocol/sr25519-jcs-2023'

import type {
  SignerInterface,
  DidDocument,
  DidUrl,
  KeyringPair,
  UriFragment,
} from '@kiltprotocol/types'

import { DidError } from './SDKErrors.js'

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
 * @param input Holds all function arguments.
 * @param input.keyUri Sets the signer's id property.
 * @param input.secretKey A 32 byte ECDSA secret key on the secp256k1 curve.
 * @param input.publicKey The corresponding public key. May be omitted.
 * @returns A signer interface capable of making ECDSA signatures with recovery bit added.
 */
export async function polkadotEcdsaSigner<Id extends string>({
  secretKey,
  keyUri, // TODO: I think this should just be called id
}: {
  keyUri: Id
  secretKey: Uint8Array
  publicKey?: Uint8Array
}): Promise<
  SignerInterface<typeof ALGORITHMS.ECRECOVER_SECP256K1_BLAKE2B, Id>
> {
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
 * @param input Holds all function arguments.
 * @param input.keyUri Sets the signer's id property.
 * @param input.secretKey A 32 byte ECDSA secret key on the secp256k1 curve.
 * @param input.publicKey The corresponding public key. May be omitted.
 * @returns A signer interface capable of making ECDSA signatures with recovery bit added.
 */
export async function ethereumEcdsaSigner<Id extends string>({
  secretKey,
  keyUri,
}: {
  keyUri: Id
  secretKey: Uint8Array
  publicKey?: Uint8Array
}): Promise<SignerInterface<typeof ALGORITHMS.ECRECOVER_SECP256K1_KECCAK, Id>> {
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
 * @param input Holds all function arguments.
 * @param input.keyUri Sets the signer's id property.
 * @param input.secretKey A 32 byte ECDSA secret key on the secp256k1 curve.
 * @param input.publicKey The corresponding public key. May be omitted.
 * @returns A signer interface capable of making ES256K signatures.
 */
export async function es256kSigner<Id extends string>({
  secretKey,
  keyUri,
}: {
  keyUri: Id
  secretKey: Uint8Array
  publicKey?: Uint8Array
}): Promise<SignerInterface<typeof ALGORITHMS.ES256K, Id>> {
  // only exists to map secretKey to seed
  return es256kSignerWrapped({ seed: secretKey, keyUri }) as Promise<
    SignerInterface<typeof ALGORITHMS.ES256K, Id>
  >
}

/**
 * Signer that produces an Ed25519 signature over the message.
 *
 * @param input Holds all function arguments.
 * @param input.keyUri Sets the signer's id property.
 * @param input.secretKey A 32 byte Ed25519 secret key. Some key representations append the public key to the private key; to allow these, all bytes after the 32nd byte will be dropped.
 * @param input.publicKey The corresponding public key. May be omitted.
 * @returns A signer interface capable of making Ed25519 signatures.
 */
export async function ed25519Signer<Id extends string>({
  secretKey,
  keyUri,
}: {
  keyUri: Id
  secretKey: Uint8Array
  publicKey?: Uint8Array
}): Promise<SignerInterface<typeof ALGORITHMS.ED25519, Id>> {
  // polkadot ed25519 private keys are a concatenation of private and public key for some reason
  return ed25519SignerWrapped({
    seed: secretKey.slice(0, 32),
    keyUri,
  }) as Promise<SignerInterface<typeof ALGORITHMS.ED25519, Id>>
}

/**
 * Signer that produces an Sr25519 signature over the message.
 *
 * @param input Holds all function arguments.
 * @param input.keyUri Sets the signer's id property.
 * @param input.secretKey A 64 byte Sr25519 secret key.
 * @param input.publicKey The corresponding 32 byte public key.
 * @returns A signer interface capable of making Sr25519 signatures.
 */
export async function sr25519Signer<Id extends string>({
  secretKey,
  keyUri,
  publicKey,
}: {
  publicKey: Uint8Array
  secretKey: Uint8Array
  keyUri: Id
}): Promise<SignerInterface<typeof ALGORITHMS.SR25519, Id>> {
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
 * Creates a signer interface based on an existing keypair and an algorithm descriptor.
 *
 * @param input Holds all function arguments.
 * @param input.keyUri Sets the signer's id property.
 * @param input.keypair A polkadot {@link KeyringPair} or combination of `secretKey` & `publicKey`.
 * @param input.algorithm An algorithm identifier from the {@link ALGORITHMS} map.
 * @returns A signer interface.
 */
export async function signerFromKeypair<Alg extends string, Id extends string>({
  keyUri,
  keypair,
  algorithm,
}: {
  keypair: Keypair | KeyringPair
  algorithm: Alg
  keyUri?: Id
}): Promise<SignerInterface<Alg, Id>> {
  const makeSigner = signerFactory[algorithm] as (x: {
    secretKey: Uint8Array
    publicKey: Uint8Array
    keyUri: Id
  }) => Promise<SignerInterface<Alg, Id>>
  if (typeof makeSigner !== 'function') {
    throw new Error(`unknown algorithm ${algorithm}`)
  }

  if (!('secretKey' in keypair) && 'encodePkcs8' in keypair) {
    const id = keyUri ?? (keypair.address as Id)
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
    keyUri: keyUri ?? (encodeAddress(publicKey, 38) as Id),
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
 * Based on an existing keypair and its type, creates all available signers that work with this key type.
 *
 * @param input Holds all function arguments.
 * @param input.keyUri Sets the signer's id property.
 * @param input.keypair A polkadot {@link KeyringPair} or combination of `secretKey` & `publicKey`.
 * @param input.type If `keypair` is not a {@link KeyringPair}, provide the key type here; otherwise, this is ignored.
 * @returns An array of signer interfaces based on the keypair and type.
 */
export async function getSignersForKeypair<Id extends string>({
  keyUri,
  keypair,
  type = (keypair as KeyringPair).type,
}: {
  keyUri?: Id
  keypair: Keypair | KeyringPair
  type?: string
}): Promise<Array<SignerInterface<string, Id>>> {
  if (!type) {
    throw new Error('type is required if keypair.type is not given')
  }
  const algorithms = algsForKeyType(type)
  return Promise.all(
    algorithms.map<Promise<SignerInterface<string, Id>>>(async (algorithm) => {
      return signerFromKeypair({ keypair, keyUri, algorithm })
    })
  )
}

export interface SignerSelector {
  (signer: SignerInterface): boolean // TODO: allow async
}

/**
 * Filters signer interfaces, returning only those accepted by all selectors.
 *
 * @param signers An array of signer interfaces.
 * @param selectors One or more selector callbacks, receiving a signer as input and returning `true` in case it meets selection criteria.
 * @returns An array of those signers for which all selectors returned `true`.
 */
export async function selectSigners<
  SelectedSigners extends AllSigners, // eslint-disable-line no-use-before-define
  AllSigners extends SignerInterface = SignerInterface
>(
  signers: readonly AllSigners[],
  ...selectors: readonly SignerSelector[]
): Promise<SelectedSigners[]> {
  return signers.filter((signer): signer is SelectedSigners => {
    return selectors.every((selector) => selector(signer))
  })
}

/**
 * Finds a suiteable signer interfaces in an array of signers, returning the first signer accepted by all selectors.
 *
 * @param signers An array of signer interfaces.
 * @param selectors One or more selector callbacks, receiving a signer as input and returning `true` in case it meets selection criteria.
 * @returns The first signer for which all selectors returned `true`, or `undefined` if none meet selection criteria.
 */
export async function selectSigner<
  SelectedSigner extends AllSigners, // eslint-disable-line no-use-before-define
  AllSigners extends SignerInterface = SignerInterface
>(
  signers: readonly AllSigners[],
  ...selectors: readonly SignerSelector[]
): Promise<SelectedSigner | undefined> {
  return signers.find((signer): signer is SelectedSigner => {
    return selectors.every((selector) => selector(signer))
  })
}

/**
 * Select signers based on (key) ids.
 *
 * @param ids Allowed signer/key ids to filter for.
 * @returns A selector identifying signers whose id property is in `ids`.
 */
function byId(ids: readonly string[]): SignerSelector {
  return ({ id }) => ids.includes(id)
}
/**
 * Select signers based on algorithm identifiers.
 *
 * @param algorithms Allowed algorithms to filter for.
 * @returns A selector identifying signers whose algorithm property is in `algorithms`.
 */
function byAlgorithm(algorithms: readonly string[]): SignerSelector {
  return (signer) =>
    algorithms.some(
      (algorithm) => algorithm.toLowerCase() === signer.algorithm.toLowerCase()
    )
}
/**
 * Select signers based on the association of key ids with a given DID.
 *
 * @param didDocument DidDocument of the DID, on which the signer id must be listed as a verification method.
 * @param options Additional optional filter criteria.
 * @param options.verificationRelationship If set, the signer id must be listed under this verification relationship on the DidDocument.
 * @param options.controller If set, only verificationMethods with this controller are considered.
 * @returns A selector identifying signers whose id is associated with the DidDocument.
 */
function byDid(
  didDocument: DidDocument,
  {
    controller,
    verificationRelationship,
  }: { verificationRelationship?: string; controller?: string } = {}
): SignerSelector {
  let eligibleVMs = didDocument.verificationMethod
  // TODO: not super happy about this throwing; can I attach a diagnostics property to the returned function instead that will inform why this will never select a signer?
  if (!Array.isArray(eligibleVMs) || eligibleVMs.length === 0) {
    throw new DidError(
      `DID ${didDocument.id} not fit for signing: No verification methods are associated with the signer DID document. It may be that this DID has been deactivated.`
    )
  }
  if (controller) {
    eligibleVMs = eligibleVMs.filter(
      ({ controller: ctr }) => controller === ctr
    )
  }
  // helps deal with relative DID URLs as ids
  function absoluteId(id: string): DidUrl {
    if (id.startsWith(didDocument.id)) {
      return id as DidUrl
    }
    if (id.startsWith('#')) {
      return `${didDocument.id}${id as UriFragment}`
    }
    return `${didDocument.id}#${id}`
  }
  let eligibleIds = eligibleVMs.map(({ id }) => absoluteId(id))
  if (typeof verificationRelationship === 'string') {
    if (
      !Array.isArray(didDocument[verificationRelationship]) ||
      didDocument[verificationRelationship].length === 0
    ) {
      throw new DidError(
        `DID ${didDocument.id} not fit for signing: No verification methods available for the requested verification relationship ("${verificationRelationship}").`
      )
    }
    eligibleIds = eligibleIds.filter((eligibleId) =>
      didDocument[verificationRelationship].some?.(
        (VrId: string) => VrId === eligibleId || absoluteId(VrId) === eligibleId // TODO: check if leading equality check does indeed help increase performance
      )
    )
  }
  if (eligibleIds.length === 0) {
    throw new DidError(
      `DID ${
        didDocument.id
      } not fit for signing: The verification methods associated with this DID's document do not match the requested controller and/or verification relationship: ${JSON.stringify(
        { controller, verificationRelationship }
      )}.`
    )
  }
  return ({ id }) => {
    return eligibleIds.includes(id as DidUrl)
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
