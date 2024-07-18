/**
 * Copyright (c) 2018-2024, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import type { Signer } from '@polkadot/api/types/index.js'
import { decodePair } from '@polkadot/keyring/pair/decode'
import {
  hexToU8a,
  u8aConcat,
  u8aIsWrapped,
  u8aToHex,
  u8aWrapBytes,
} from '@polkadot/util'
import {
  blake2AsU8a,
  encodeAddress,
  randomAsHex,
  secp256k1Sign,
} from '@polkadot/util-crypto'
import type { Keypair } from '@polkadot/util-crypto/types'

import {
  createSigner as ed25519Signer,
  cryptosuite as ed25519Suite,
} from '@kiltprotocol/eddsa-jcs-2022'
import {
  createSigner as es256kSigner,
  cryptosuite as es256kSuite,
} from '@kiltprotocol/es256k-jcs-2023'
import {
  createSigner as sr25519Signer,
  cryptosuite as sr25519Suite,
} from '@kiltprotocol/sr25519-jcs-2023'

import type {
  DidDocument,
  DidUrl,
  KeyringPair,
  SignerInterface,
  UriFragment,
} from '@kiltprotocol/types'
import { makeKeypairFromUri } from './Crypto.js'
import { DidError, NoSuitableSignerError } from './SDKErrors.js'

export const ALGORITHMS = Object.freeze({
  ECRECOVER_SECP256K1_BLAKE2B: 'Ecrecover-Secp256k1-Blake2b' as const, // could also be called ES256K-R-Blake2b
  ECRECOVER_SECP256K1_KECCAK: 'Ecrecover-Secp256k1-Keccak' as const, // could also be called ES256K-R-Keccak
  ES256K: es256kSuite.requiredAlgorithm,
  SR25519: sr25519Suite.requiredAlgorithm,
  ED25519: ed25519Suite.requiredAlgorithm,
})

export const DID_PALLET_SUPPORTED_ALGORITHMS = Object.freeze([
  ALGORITHMS.ED25519,
  ALGORITHMS.ECRECOVER_SECP256K1_BLAKE2B,
  ALGORITHMS.SR25519,
])

export type KnownAlgorithms = typeof ALGORITHMS[keyof typeof ALGORITHMS]
export type DidPalletSupportedAlgorithms =
  typeof DID_PALLET_SUPPORTED_ALGORITHMS[number]

export { ed25519Signer, es256kSigner, sr25519Signer }

/**
 * Signer that produces an ECDSA signature over a Blake2b-256 digest of the message using the secp256k1 curve.
 * The signature has a recovery bit appended to the end, allowing public key recovery.
 *
 * @param input Holds all function arguments.
 * @param input.id Sets the signer's id property.
 * @param input.secretKey A 32 byte ECDSA secret key on the secp256k1 curve.
 * @param input.publicKey The corresponding public key. May be omitted.
 * @returns A signer interface capable of making ECDSA signatures with recovery bit added.
 */
export async function polkadotEcdsaSigner<Id extends string>({
  secretKey,
  id,
}: {
  id: Id
  secretKey: Uint8Array
  publicKey?: Uint8Array
}): Promise<
  SignerInterface<typeof ALGORITHMS.ECRECOVER_SECP256K1_BLAKE2B, Id>
> {
  return {
    id,
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
 * @param input.id Sets the signer's id property.
 * @param input.secretKey A 32 byte ECDSA secret key on the secp256k1 curve.
 * @param input.publicKey The corresponding public key. May be omitted.
 * @returns A signer interface capable of making ECDSA signatures with recovery bit added.
 */
export async function ethereumEcdsaSigner<Id extends string>({
  secretKey,
  id,
}: {
  id: Id
  secretKey: Uint8Array
  publicKey?: Uint8Array
}): Promise<SignerInterface<typeof ALGORITHMS.ECRECOVER_SECP256K1_KECCAK, Id>> {
  return {
    id,
    algorithm: ALGORITHMS.ECRECOVER_SECP256K1_KECCAK,
    sign: async ({ data }) => {
      return secp256k1Sign(data, { secretKey }, 'keccak')
    },
  }
}

/**
 * Extracts a keypair from a pjs KeyringPair via a roundtrip of pkcs8 en- and decoding.
 *
 * @param pair The pair, where the private key is inaccessible.
 * @returns The private key as a byte sequence.
 */
function extractPk(pair: Pick<KeyringPair, 'encodePkcs8'>): Keypair {
  const encoded = pair.encodePkcs8()
  const { secretKey, publicKey } = decodePair(undefined, encoded, 'none')
  return { secretKey, publicKey }
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
 * @param input.id Sets the signer's id property.
 * @param input.keypair A polkadot {@link KeyringPair} or combination of `secretKey` & `publicKey`.
 * @param input.algorithm An algorithm identifier from the {@link ALGORITHMS} map.
 * @returns A signer interface.
 */
export async function signerFromKeypair<
  Alg extends KnownAlgorithms,
  Id extends string
>({
  id,
  keypair,
  algorithm,
}: {
  keypair: Keypair | KeyringPair
  algorithm: Alg
  id?: Id
}): Promise<SignerInterface<Alg, Id>> {
  const makeSigner = signerFactory[algorithm] as (x: {
    secretKey: Uint8Array
    publicKey: Uint8Array
    id: Id
  }) => Promise<SignerInterface<Alg, Id>>
  if (typeof makeSigner !== 'function') {
    throw new Error(`unknown algorithm ${algorithm}`)
  }

  if ('secretKey' in keypair && 'publicKey' in keypair) {
    const { secretKey, publicKey } = keypair
    return makeSigner({
      secretKey,
      publicKey,
      id: id ?? (encodeAddress(publicKey, 38) as Id),
    })
  }

  if ('encodePkcs8' in keypair) {
    const { secretKey, publicKey } = extractPk(keypair)
    return makeSigner({
      secretKey,
      publicKey,
      id: id ?? (keypair.address as Id),
    })
  }

  throw new Error('')
}

function algsForKeyType(keyType: string): KnownAlgorithms[] {
  switch (keyType.toLowerCase()) {
    case 'ed25519':
      return [ALGORITHMS.ED25519]
    case 'sr25519':
      return [ALGORITHMS.SR25519]
    case 'ecdsa':
    case 'ethereum':
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
 * @param input.id Sets the signer's id property.
 * @param input.keypair A polkadot {@link KeyringPair} or combination of `secretKey` & `publicKey`.
 * @param input.type If `keypair` is not a {@link KeyringPair}, provide the key type here; otherwise, this is ignored.
 * @returns An array of signer interfaces based on the keypair and type.
 */
export async function getSignersForKeypair<Id extends string>({
  id,
  keypair,
  type,
}: {
  id?: Id
  keypair:
    | Keypair
    | KeyringPair
    | {
        secretKeyMultibase: `z${string}`
        publicKeyMultibase: `z${string}`
      }
  type?: string
}): Promise<Array<SignerInterface<KnownAlgorithms, Id>>> {
  let pair: KeyringPair | (Keypair & { type: string })
  if ('publicKeyMultibase' in keypair) {
    throw new Error('not implemented')
    // const { publicKey, keyType } = multibaseKeyToDidKey(
    //   keypair.publicKeyMultibase
    // )
    // const { publicKey: secretKey } = decodeMultikeyVerificationMethod({
    //   publicKeyMultibase: keypair.secretKeyMultibase,
    // })
    // pair = { publicKey, secretKey, type: keyType }
  } else if ('type' in keypair) {
    pair = keypair
  } else if (type) {
    pair = { ...keypair, type }
  } else {
    throw new Error('type is required if keypair.type is not given')
  }
  const algorithms = algsForKeyType(pair.type)
  return Promise.all(
    algorithms.map(async (algorithm) => {
      return signerFromKeypair({ keypair: pair, id, algorithm })
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
export function selectSigners<
  SelectedSigners extends AllSigners, // eslint-disable-line no-use-before-define
  AllSigners extends SignerInterface = SignerInterface
>(
  signers: readonly AllSigners[],
  ...selectors: readonly SignerSelector[]
): SelectedSigners[] {
  return signers.filter((signer): signer is SelectedSigners =>
    selectors.every((selector) => selector(signer))
  )
}

/**
 * Finds a suiteable signer interfaces in an array of signers, returning the first signer accepted by all selectors.
 *
 * @param signers An array of signer interfaces.
 * @param selectors One or more selector callbacks, receiving a signer as input and returning `true` in case it meets selection criteria.
 * @returns The first signer for which all selectors returned `true`, or `undefined` if none meet selection criteria.
 */
export function selectSigner<
  SelectedSigner extends AllSigners, // eslint-disable-line no-use-before-define
  AllSigners extends SignerInterface = SignerInterface
>(
  signers: readonly AllSigners[],
  ...selectors: readonly SignerSelector[]
): SelectedSigner | undefined {
  return signers.find((signer): signer is SelectedSigner =>
    selectors.every((selector) => selector(signer))
  )
}

/**
 * Select signers based on (key) ids.
 *
 * @param ids Allowed signer/key ids to filter for.
 * @returns A selector identifying signers whose id property is in `ids`.
 */
function bySignerId(ids: readonly string[]): SignerSelector {
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
  bySignerId,
  byAlgorithm,
  byDid,
  verifiableOnChain,
}

const TYPE_PREFIX = {
  [ALGORITHMS.ED25519]: new Uint8Array([0]),
  [ALGORITHMS.SR25519]: new Uint8Array([1]),
  [ALGORITHMS.ECRECOVER_SECP256K1_BLAKE2B]: new Uint8Array([2]),
  [ALGORITHMS.ECRECOVER_SECP256K1_KECCAK]: new Uint8Array([2]),
}

/**
 * Simplifies signing transactions using SignerInterface signers by wrapping it in a Polkadot signer interface.
 *
 * @example const signedTx = await tx.signAsync(<address>, {signer: getExtrinsicSigner(<signers>)})
 *
 * @param signers An array of SignerInterface signers.
 * @param hasher The hasher used in signing extrinsics.
 * Must match the hasher used by the chain in order to produce verifiable extrinsic signatures.
 * Defaults to blake2b.
 * @param updatesCallback Receives updates from the caller of the signer on the status of the extrinsic submission.
 * @returns An object implementing polkadot's `signRaw` interface.
 */
export function getPolkadotSigner(
  signers: readonly SignerInterface[],
  hasher: (data: Uint8Array) => Uint8Array = blake2AsU8a,
  updatesCallback?: Signer['update']
): Signer {
  let id = -1
  return {
    update: updatesCallback,
    signRaw: async ({ data, address, type }) => {
      const signer = await selectSigner(
        signers,
        bySignerId([address]),
        verifiableOnChain()
      )
      if (!signer) {
        throw new NoSuitableSignerError(
          `no suitable signer available for blockchain account ${address}`,
          {
            signerRequirements: {
              id: address,
              algorithms: DID_PALLET_SUPPORTED_ALGORITHMS,
            },
            availableSigners: signers,
          }
        )
      }
      let signData = hexToU8a(data)
      if (type === 'payload') {
        // for signing blockchain transactions, the data is hashed according to the following logic
        if (signData.length > 256) {
          signData = hasher(signData)
        }
      } else if (!u8aIsWrapped(signData, false)) {
        // signing raw bytes requires them to be wrapped
        signData = u8aWrapBytes(signData)
      }
      const signature = await signer.sign({ data: signData })
      // The signature is expected to be a SCALE enum, we must add a type prefix representing the signature algorithm
      const prefixed = u8aConcat(TYPE_PREFIX[signer.algorithm], signature)
      id += 1
      return {
        id,
        signature: u8aToHex(prefixed),
      }
    },
  }
}

export function generateKeypair<T extends string = 'ed25519'>(args?: {
  seed?: string
  type?: T
}): Keypair & { type: T }
export function generateKeypair({
  seed = randomAsHex(32),
  type = 'ed25519',
}: {
  seed?: string
  type?: string
} = {}): Keypair & { type: string } {
  let typeForKeyring = type as KeyringPair['type']
  switch (type.toLowerCase()) {
    case 'secp256k1':
      typeForKeyring = 'ecdsa'
      break
    case 'x25519':
      typeForKeyring = 'ed25519'
      break
    default:
  }

  const keyRingPair = makeKeypairFromUri(
    seed.toLowerCase(),
    typeForKeyring as any
  )
  const { secretKey, publicKey } = extractPk(keyRingPair)
  return { secretKey, publicKey, type }
}
