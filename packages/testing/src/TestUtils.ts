/**
 * Copyright (c) 2018-2022, BOTLabs GmbH.
 *
 * This source code is licensed under the BSD 4-Clause "Original" license
 * found in the LICENSE file in the root directory of this source tree.
 */

import {
  blake2AsHex,
  blake2AsU8a,
  naclBoxPairFromSecret,
  randomAsHex,
} from '@polkadot/util-crypto'
import { KeypairType } from '@polkadot/util-crypto/types'
import { encodeAddress, Keyring } from '@polkadot/keyring'

import {
  DecryptCallback,
  DidKey,
  EncryptCallback,
  EncryptionKeyType,
  KeyRelationship,
  KeyringPair,
  LightDidSupportedVerificationKeyType,
  NewLightDidAuthenticationKey,
  ResponseData,
  SignCallback,
  SigningAlgorithms,
  SigningData,
} from '@kiltprotocol/types'
import { Crypto, ss58Format } from '@kiltprotocol/utils'
import {
  DidConstructorDetails,
  FullDidCreationBuilder,
  FullDidDetails,
  LightDidDetails,
  PublicKeys,
  ServiceEndpoints,
  Utils as DidUtils,
} from '@kiltprotocol/did'

import {
  Blockchain,
  BlockchainApiConnection,
} from '@kiltprotocol/chain-helpers'

/**
 * Generates a callback that can be used for encryption.
 *
 * @param secretKey The options parameter.
 * @param secretKey.secretKey The key to use for encryption.
 * @param secretKey.type The X25519 type, only this one is supported.
 * @returns The callback.
 */
export function makeEncryptCallback({
  secretKey,
}: {
  secretKey: Uint8Array
  type: 'x25519'
}): EncryptCallback {
  return async function encryptCallback({ data, peerPublicKey, alg }) {
    const { box, nonce } = Crypto.encryptAsymmetric(
      data,
      peerPublicKey,
      secretKey
    )
    return { alg, nonce, data: box }
  }
}

/**
 * Generates a callback that can be used for decryption.
 *
 * @param secretKey The options parameter.
 * @param secretKey.secretKey The key to use for decryption.
 * @param secretKey.type The X25519 type, only this one is supported.
 * @returns The callback.
 */
export function makeDecryptCallback({
  secretKey,
}: {
  secretKey: Uint8Array
  type: 'x25519'
}): DecryptCallback {
  return async function decryptCallback({ data, nonce, peerPublicKey, alg }) {
    const decrypted = Crypto.decryptAsymmetric(
      { box: data, nonce },
      peerPublicKey,
      secretKey
    )
    if (!decrypted) throw new Error('Decryption failed')
    return { data: decrypted, alg }
  }
}

export interface EncryptionKeyTool {
  keypair: {
    secretKey: Uint8Array
    publicKey: Uint8Array
    type: EncryptionKeyType
  }
  encrypt: EncryptCallback
  decrypt: DecryptCallback
}

/**
 * Generates a keypair suitable for encryption.
 *
 * @param seed {string} Input to generate the keypair from.
 * @returns Object with secret and public key and the key type.
 */
export function makeEncryptionKeyTool(seed: string): EncryptionKeyTool {
  const { secretKey, publicKey } = naclBoxPairFromSecret(blake2AsU8a(seed, 256))
  const keypair = {
    secretKey,
    publicKey,
    type: 'x25519' as EncryptionKeyType,
  }

  const encrypt = makeEncryptCallback(keypair)
  const decrypt = makeDecryptCallback(keypair)

  return {
    keypair,
    encrypt,
    decrypt,
  }
}

/**
 * Generates a callback that can be used for signing.
 *
 * @param keypair The keypair to use for signing.
 * @returns The callback.
 */
export function makeSignCallback(keypair: KeyringPair): SignCallback {
  return async function sign<A extends SigningAlgorithms>({
    alg,
    data,
  }: SigningData<A>): Promise<ResponseData<A>> {
    const signature = keypair.sign(data, { withType: false })
    return { alg, data: signature }
  }
}

const keypairTypeForAlg: Record<SigningAlgorithms, KeypairType> = {
  ed25519: 'ed25519',
  sr25519: 'sr25519',
  'ecdsa-secp256k1': 'ecdsa',
}

export interface KeyTool {
  keypair: KeyringPair
  sign: SignCallback
  authenticationKey: NewLightDidAuthenticationKey
}

/**
 * Generates a keypair usable for signing and a few related values.
 *
 * @param alg The algorithm to use for the keypair.
 * @returns The keypair, matching sign callback, a key usable as DID authentication key.
 */
export function makeSigningKeyTool(
  alg: SigningAlgorithms = 'sr25519'
): KeyTool {
  const type = keypairTypeForAlg[alg]
  const seed = randomAsHex(32)
  const keypair = new Keyring({ type, ss58Format }).addFromUri(seed, {}, type)
  const sign = makeSignCallback(keypair)

  const authenticationKey = {
    publicKey: keypair.publicKey,
    type: keypair.type as LightDidSupportedVerificationKeyType,
  }

  return {
    keypair,
    sign,
    authenticationKey,
  }
}

/**
 * Given a keypair, creates a light DID with an authentication and an encryption key.
 *
 * @param keypair KeyringPair instance for authentication key.
 * @returns LightDidDetails instance.
 */
export async function createMinimalLightDidFromKeypair(
  keypair: KeyringPair
): Promise<LightDidDetails> {
  return LightDidDetails.fromDetails({
    authenticationKey: {
      publicKey: keypair.publicKey,
      type: keypair.type as LightDidSupportedVerificationKeyType,
    },
    encryptionKey: makeEncryptionKeyTool(`${keypair.publicKey}//enc`).keypair,
  })
}

// Mock function to generate a key ID without having to rely on a real chain metadata.
export function computeKeyId(key: DidKey['publicKey']): DidKey['id'] {
  return blake2AsHex(key, 256)
}

function makeDidKeyFromKeypair({ publicKey, type }: KeyringPair): DidKey {
  return {
    id: computeKeyId(publicKey),
    publicKey,
    type: DidUtils.getVerificationKeyTypeForSigningAlgorithm(
      type as SigningAlgorithms
    ),
  }
}

/**
 * Creates an instance of [[FullDidDetails]] for local use, e.g., in testing. Will not work on-chain because identifiers are generated ad-hoc.
 *
 * @param keypair The KeyringPair for authentication key, other keys derived from it.
 * @param generationOptions The additional options for generation.
 * @param generationOptions.keyRelationships The set of key relationships to indicate which keys must be added to the DID.
 * @param generationOptions.endpoints The set of service endpoints that must be added to the DID.
 *
 * @returns A promise resolving to a [[FullDidDetails]] object. The resulting object is NOT stored on chain.
 */
export async function createLocalDemoFullDidFromKeypair(
  keypair: KeyringPair,
  {
    keyRelationships = new Set([
      'assertionMethod',
      'capabilityDelegation',
      'keyAgreement',
    ]),
    endpoints = {},
  }: {
    keyRelationships?: Set<Omit<KeyRelationship, 'authentication'>>
    endpoints?: ServiceEndpoints
  } = {}
): Promise<FullDidDetails> {
  const identifier = encodeAddress(
    blake2AsU8a(keypair.address, 256),
    ss58Format
  )
  const uri = DidUtils.getKiltDidFromIdentifier(identifier, 'full')

  const authKey = makeDidKeyFromKeypair(keypair)

  const fullDidCreationDetails: DidConstructorDetails = {
    uri,
    keyRelationships: {
      authentication: new Set([authKey.id]),
    },
    keys: {
      [authKey.id]: authKey,
    },
    serviceEndpoints: endpoints,
  }

  if (keyRelationships.has('keyAgreement')) {
    const encryptionKeypair = makeEncryptionKeyTool(
      `${keypair.publicKey}//enc`
    ).keypair
    const encKey = {
      ...encryptionKeypair,
      id: computeKeyId(encryptionKeypair.publicKey),
    }
    fullDidCreationDetails.keyRelationships.keyAgreement = new Set([encKey.id])
    fullDidCreationDetails.keys[encKey.id] = encKey
  }
  if (keyRelationships.has('assertionMethod')) {
    const attKey = makeDidKeyFromKeypair(keypair.derive('//att'))
    fullDidCreationDetails.keyRelationships.assertionMethod = new Set([
      attKey.id,
    ])
    fullDidCreationDetails.keys[attKey.id] = attKey
  }
  if (keyRelationships.has('capabilityDelegation')) {
    const delKey = makeDidKeyFromKeypair(keypair.derive('//del'))
    fullDidCreationDetails.keyRelationships.capabilityDelegation = new Set([
      delKey.id,
    ])
    fullDidCreationDetails.keys[delKey.id] = delKey
  }

  return new FullDidDetails({
    ...fullDidCreationDetails,
    identifier,
  })
}

/**
 * Creates a FullDid from a LightDid where the verification keypair is enabled for all verification purposes (authentication, assertionMethod, capabilityDelegation).
 * This is not recommended, use for demo purposes only!
 *
 * @param lightDid The LightDid whose keys will be used on the FullDid.
 * @returns A FullDid instance that is not yet written to the blockchain.
 */
export async function createLocalDemoFullDidFromLightDid(
  lightDid: LightDidDetails
): Promise<FullDidDetails> {
  const { identifier } = lightDid
  const authKey = lightDid.authenticationKey
  const encKey = lightDid.encryptionKey

  const keys: PublicKeys = {
    [authKey.id]: authKey,
  }
  if (encKey) {
    keys[encKey.id] = encKey
  }

  return new FullDidDetails({
    uri: DidUtils.getKiltDidFromIdentifier(identifier, 'full'),
    keyRelationships: {
      authentication: new Set([authKey.id]),
      keyAgreement: encKey ? new Set([encKey.id]) : new Set([]),
      assertionMethod: new Set([authKey.id]),
      capabilityDelegation: new Set([authKey.id]),
    },
    keys,
    serviceEndpoints: {},
    identifier,
  })
}

// It takes the auth key from the light DID and use it as attestation and delegation key as well.
export async function createFullDidFromLightDid(
  payer: KeyringPair,
  lightDidForId: LightDidDetails,
  sign: SignCallback
): Promise<FullDidDetails> {
  const api = await BlockchainApiConnection.getConnectionOrConnect()
  return FullDidCreationBuilder.fromLightDidDetails(api, lightDidForId)
    .setAttestationKey(lightDidForId.authenticationKey)
    .setDelegationKey(lightDidForId.authenticationKey)
    .buildAndSubmit(sign, payer.address, async (tx) => {
      await Blockchain.signAndSubmitTx(tx, payer, {
        resolveOn: Blockchain.IS_IN_BLOCK,
      })
    })
}

export async function createFullDidFromSeed(
  payer: KeyringPair,
  keypair: KeyringPair
): Promise<FullDidDetails> {
  const lightDid = await createMinimalLightDidFromKeypair(keypair)
  const sign = makeSignCallback(keypair)
  return createFullDidFromLightDid(payer, lightDid, sign)
}
