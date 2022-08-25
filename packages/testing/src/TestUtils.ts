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
import { Keyring } from '@polkadot/keyring'

import {
  DecryptCallback,
  DidDetails,
  DidKey,
  DidServiceEndpoint,
  DidVerificationKey,
  EncryptCallback,
  EncryptionKeyType,
  KeyRelationship,
  KeyringPair,
  KiltKeyringPair,
  LightDidSupportedVerificationKeyType,
  NewLightDidVerificationKey,
  ResponseData,
  SignCallback,
  SigningAlgorithms,
  SigningData,
} from '@kiltprotocol/types'
import { Crypto, ss58Format } from '@kiltprotocol/utils'
import * as Did from '@kiltprotocol/did'

import { Blockchain } from '@kiltprotocol/chain-helpers'

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
  keyAgreement: [
    {
      secretKey: Uint8Array
      publicKey: Uint8Array
      type: EncryptionKeyType
    }
  ]
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
    keyAgreement: [keypair],
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
  keypair: KiltKeyringPair
  sign: SignCallback
  authentication: [NewLightDidVerificationKey]
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
  const keypair = new Keyring({ type, ss58Format }).addFromUri(
    seed,
    {},
    type
  ) as KiltKeyringPair
  const sign = makeSignCallback(keypair)

  const authenticationKey = {
    publicKey: keypair.publicKey,
    type: keypair.type as LightDidSupportedVerificationKeyType,
  }

  return {
    keypair,
    sign,
    authentication: [authenticationKey],
  }
}

/**
 * Given a keypair, creates a light DID with an authentication and an encryption key.
 *
 * @param keypair KeyringPair instance for authentication key.
 * @returns DidDetails.
 */
export async function createMinimalLightDidFromKeypair(
  keypair: KeyringPair
): Promise<DidDetails> {
  const type = keypair.type as LightDidSupportedVerificationKeyType
  return Did.createLightDidDetails({
    authentication: [{ publicKey: keypair.publicKey, type }],
    keyAgreement: makeEncryptionKeyTool(`${keypair.publicKey}//enc`)
      .keyAgreement,
  })
}

// Mock function to generate a key ID without having to rely on a real chain metadata.
export function computeKeyId(key: DidKey['publicKey']): DidKey['id'] {
  return `#${blake2AsHex(key, 256)}`
}

function makeDidKeyFromKeypair({
  publicKey,
  type,
}: KeyringPair): DidVerificationKey {
  return {
    id: computeKeyId(publicKey),
    publicKey,
    type: Did.Utils.getVerificationKeyTypeForSigningAlgorithm(
      type as SigningAlgorithms
    ),
  }
}

/**
 * Creates [[DidDetails]] for local use, e.g., in testing. Will not work on-chain because key IDs are generated ad-hoc.
 *
 * @param keypair The KeyringPair for authentication key, other keys derived from it.
 * @param generationOptions The additional options for generation.
 * @param generationOptions.keyRelationships The set of key relationships to indicate which keys must be added to the DID.
 * @param generationOptions.endpoints The set of service endpoints that must be added to the DID.
 *
 * @returns A promise resolving to a [[DidDetails]] object. The resulting object is NOT stored on chain.
 */
export async function createLocalDemoFullDidFromKeypair(
  keypair: KeyringPair,
  {
    keyRelationships = new Set([
      'assertionMethod',
      'capabilityDelegation',
      'keyAgreement',
    ]),
    endpoints = [],
  }: {
    keyRelationships?: Set<Omit<KeyRelationship, 'authentication'>>
    endpoints?: DidServiceEndpoint[]
  } = {}
): Promise<DidDetails> {
  const authKey = makeDidKeyFromKeypair(keypair)
  const uri = Did.Utils.getFullDidUriFromKey(authKey)

  const result: DidDetails = {
    uri,
    authentication: [authKey],
    service: endpoints,
  }

  if (keyRelationships.has('keyAgreement')) {
    const encryptionKeypair = makeEncryptionKeyTool(`${keypair.publicKey}//enc`)
      .keyAgreement[0]
    const encKey = {
      ...encryptionKeypair,
      id: computeKeyId(encryptionKeypair.publicKey),
    }
    result.keyAgreement = [encKey]
  }
  if (keyRelationships.has('assertionMethod')) {
    const attKey = makeDidKeyFromKeypair(keypair.derive('//att'))
    result.assertionMethod = [attKey]
  }
  if (keyRelationships.has('capabilityDelegation')) {
    const delKey = makeDidKeyFromKeypair(keypair.derive('//del'))
    result.capabilityDelegation = [delKey]
  }

  return result
}

/**
 * Creates a FullDid from a LightDid where the verification keypair is enabled for all verification purposes (authentication, assertionMethod, capabilityDelegation).
 * This is not recommended, use for demo purposes only!
 *
 * @param lightDid The LightDid whose keys will be used on the FullDid.
 * @returns A FullDid instance that is not yet written to the blockchain.
 */
export async function createLocalDemoFullDidFromLightDid(
  lightDid: DidDetails
): Promise<DidDetails> {
  const { uri, authentication } = lightDid

  return {
    uri: Did.Utils.getFullDidUri(uri),
    authentication,
    assertionMethod: authentication,
    capabilityDelegation: authentication,
    keyAgreement: lightDid.keyAgreement,
  }
}

// It takes the auth key from the light DID and use it as attestation and delegation key as well.
export async function createFullDidFromLightDid(
  payer: KiltKeyringPair,
  lightDidForId: DidDetails,
  sign: SignCallback
): Promise<DidDetails> {
  const { authentication, uri } = lightDidForId
  const tx = await Did.Chain.getStoreTx(
    {
      authentication,
      assertionMethod: authentication,
      capabilityDelegation: authentication,
      keyAgreement: lightDidForId.keyAgreement,
      service: lightDidForId.service,
    },
    payer.address,
    sign
  )
  await Blockchain.signAndSubmitTx(tx, payer, {
    resolveOn: Blockchain.IS_IN_BLOCK,
  })
  const fullDid = await Did.query(Did.Utils.getFullDidUri(uri))
  if (!fullDid) throw new Error('Could not fetch created DID details')
  return fullDid
}

export async function createFullDidFromSeed(
  payer: KiltKeyringPair,
  keypair: KeyringPair
): Promise<DidDetails> {
  const lightDid = await createMinimalLightDidFromKeypair(keypair)
  const sign = makeSignCallback(keypair)
  return createFullDidFromLightDid(payer, lightDid, sign)
}
